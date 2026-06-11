/**
 * Phase S2 Red tests for `pivot/src/orchestrator/qualityWorkflowRunner.ts`.
 *
 * These tests pin the canonical contract for the quality-workflow runner
 * that is integrated into the canonical task executor dispatch. They
 * cover:
 *
 *   1. Module surface — the runner module exports the expected types
 *      and functions used by the orchestrator and tests.
 *   2. Red-stage gate contract — the gate REJECTS when no failing test
 *      was committed in the same commit, REJECTS when non-test source
 *      files were changed, and ACCEPTS when a targeted failing test was
 *      committed and the diff is test-only.
 *   3. Stage-applicability evaluator — predicates for `always`,
 *      `trackIsSetup`, `hasFrontendChanges`, `isFinalAcceptance`, and
 *      `isFinalCloseout`. Multiple predicates OR together.
 *   4. Stage sequencer — required pass proceeds; required fail
 *      short-circuits; optional not-applicable records a skip reason
 *      and proceeds; optional applicable + pass proceeds; optional
 *      applicable + fail proceeds (required=false); gate feedback retry
 *      proceeds on subsequent pass; exhausted attempts short-circuit
 *      downstream; downstream stages are not invoked after a gate fail.
 *   5. Closeout-applicability guard — closeout runs only for the final
 *      eligible track work and cannot archive before real `verify` and
 *      `orphans` pass.
 *   6. Result / feedback contracts — `StageFeedback` includes reason,
 *      attempt number, and gate evidence; `QualityRunResult` is typed
 *      `passed` or `failed`; `failed` carries `failedStageKind` and
 *      `reason`; passed carries the ordered stage log.
 *
 * The module under test does not exist yet. These tests are intentionally
 * Red and are committed under the `*.red.test.ts` suffix per the
 * test-strategy §7 "Intentionally-red tests & exclusion" rule. The
 * companion live-behavior integration test
 * (`runProject.qualityIntegration.test.ts`) is added at Green/closeout.
 *
 * Owned by Phase S2 Test tasks 2-4; the `[~]` markers in `plan.md`
 * reference this file. The Green sibling lands when
 * `pivot/src/orchestrator/qualityWorkflowRunner.ts` is implemented and
 * these tests pass.
 */

import { describe, expect, it, mock } from 'bun:test';
import {
  // Runner contract
  runQualityWorkflow,
  // Stage gate contract
  evaluateRedStageGate,
  // Applicability evaluator
  evaluateStageApplicability,
  // Stage sequencer
  sequenceQualityStages,
  // Closeout guard
  evaluateCloseoutEligibility,
  // Types
  type QualityWorkflowRunner,
  type QualityRunResult,
  type StageResult,
  type StageFeedback,
  type StageKind,
  type StageContext,
  type RedStageGateInput,
  type CloseoutEligibilityContext,
  type RedStageGateDecision,
  type ApplicabilityDecision,
  type CloseoutDecision,
  type QualityStageSpec,
  type StageExecutor,
} from './qualityWorkflowRunner';

// ──────────────────────────────────────────────────────────────────────
// 1. Module surface
// ──────────────────────────────────────────────────────────────────────

describe('qualityWorkflowRunner module surface', () => {
  it('exports runQualityWorkflow, evaluateRedStageGate, evaluateStageApplicability, sequenceQualityStages, evaluateCloseoutEligibility', () => {
    expect(typeof runQualityWorkflow).toBe('function');
    expect(typeof evaluateRedStageGate).toBe('function');
    expect(typeof evaluateStageApplicability).toBe('function');
    expect(typeof sequenceQualityStages).toBe('function');
    expect(typeof evaluateCloseoutEligibility).toBe('function');
  });
});

// ──────────────────────────────────────────────────────────────────────
// 2. Red-stage gate
// ──────────────────────────────────────────────────────────────────────

function redInput(overrides: Partial<RedStageGateInput> = {}): RedStageGateInput {
  return {
    expectedFailingTests: 1,
    requireFailingTestCommitted: true,
    rejectNonTestSourceChanges: true,
    failingTestCountObserved: 1,
    changedFiles: ['pivot/src/foo.red.test.ts'],
    ...overrides,
  };
}

describe('evaluateRedStageGate', () => {
  it('ACCEPTS when exactly the expected number of failing tests is observed and only test files changed', () => {
    const decision = evaluateRedStageGate(
      redInput({
        expectedFailingTests: 1,
        failingTestCountObserved: 1,
        changedFiles: ['pivot/src/foo.red.test.ts'],
      }),
    );
    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBeUndefined();
  });

  it('REJECTS when requireFailingTestCommitted is true and no failing test was observed', () => {
    const decision = evaluateRedStageGate(
      redInput({
        requireFailingTestCommitted: true,
        failingTestCountObserved: 0,
        expectedFailingTests: 1,
        changedFiles: ['pivot/src/foo.red.test.ts'],
      }),
    );
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toContain('failing test');
  });

  it('REJECTS when observed failing-test count does not match expectedFailingTests', () => {
    const decision = evaluateRedStageGate(
      redInput({
        expectedFailingTests: 2,
        failingTestCountObserved: 1,
        changedFiles: ['pivot/src/foo.red.test.ts', 'pivot/src/bar.red.test.ts'],
      }),
    );
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toMatch(/expected.*failing|2.*failing/);
  });

  it('REJECTS when non-test source files were changed (rejectNonTestSourceChanges=true)', () => {
    const decision = evaluateRedStageGate(
      redInput({
        failingTestCountObserved: 1,
        expectedFailingTests: 1,
        rejectNonTestSourceChanges: true,
        changedFiles: [
          'pivot/src/foo.red.test.ts',
          'pivot/src/feature/feature.ts',
        ],
      }),
    );
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toContain('non-test');
  });

  it('REJECTS when fixture / snapshot files appear in the diff alongside test files', () => {
    const decision = evaluateRedStageGate(
      redInput({
        failingTestCountObserved: 1,
        expectedFailingTests: 1,
        changedFiles: [
          'pivot/src/foo.red.test.ts',
          'pivot/src/__fixtures__/foo.fixture.ts',
        ],
      }),
    );
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toContain('non-test');
  });

  it('ACCEPTS when rejectNonTestSourceChanges is false and the only diff is a non-test source change with a failing test', () => {
    const decision = evaluateRedStageGate(
      redInput({
        rejectNonTestSourceChanges: false,
        failingTestCountObserved: 1,
        expectedFailingTests: 1,
        changedFiles: [
          'pivot/src/feature/feature.ts',
          'pivot/src/foo.red.test.ts',
        ],
      }),
    );
    expect(decision.accepted).toBe(true);
  });

  it('ACCEPTS when requireFailingTestCommitted is false and expectedFailingTests is zero', () => {
    const decision = evaluateRedStageGate(
      redInput({
        requireFailingTestCommitted: false,
        expectedFailingTests: 0,
        failingTestCountObserved: 0,
        changedFiles: ['pivot/src/feature/feature.ts'],
      }),
    );
    expect(decision.accepted).toBe(true);
  });

  it('returns a structured RedStageGateDecision with reason on rejection', () => {
    const decision: RedStageGateDecision = evaluateRedStageGate(
      redInput({ failingTestCountObserved: 0 }),
    );
    expect(decision).toBeDefined();
    expect(typeof decision.accepted).toBe('boolean');
    if (!decision.accepted) {
      expect(typeof decision.reason).toBe('string');
      expect(decision.reason!.length).toBeGreaterThan(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. Stage applicability
// ──────────────────────────────────────────────────────────────────────

function stageSpec(overrides: Partial<QualityStageSpec> = {}): QualityStageSpec {
  return {
    kind: 'red' as StageKind,
    required: true,
    applicability: { always: true },
    role: 'executor' as const,
    attempts: 1,
    timeoutMs: 60_000,
    ...overrides,
  };
}

function stageContext(overrides: Partial<StageContext> = {}): StageContext {
  return {
    trackIsSetup: false,
    hasFrontendChanges: false,
    isFinalAcceptance: false,
    isFinalCloseout: false,
    ...overrides,
  };
}

describe('evaluateStageApplicability', () => {
  it('returns applicable for applicability.always=true regardless of context', () => {
    const decision: ApplicabilityDecision = evaluateStageApplicability(
      stageSpec({ applicability: { always: true } }),
      stageContext(),
    );
    expect(decision.applicable).toBe(true);
    expect(decision.reason).toBeUndefined();
  });

  it('returns applicable for trackIsSetup=true when context.trackIsSetup=true', () => {
    const decision = evaluateStageApplicability(
      stageSpec({ applicability: { trackIsSetup: true } }),
      stageContext({ trackIsSetup: true }),
    );
    expect(decision.applicable).toBe(true);
  });

  it('returns NOT applicable for trackIsSetup=true when context.trackIsSetup=false', () => {
    const decision = evaluateStageApplicability(
      stageSpec({ applicability: { trackIsSetup: true } }),
      stageContext({ trackIsSetup: false }),
    );
    expect(decision.applicable).toBe(false);
    expect(typeof decision.reason).toBe('string');
    expect(decision.reason).toMatch(/trackIsSetup|track setup|not a setup/);
  });

  it('returns applicable for hasFrontendChanges=true when context.hasFrontendChanges=true', () => {
    const decision = evaluateStageApplicability(
      stageSpec({ applicability: { hasFrontendChanges: true } }),
      stageContext({ hasFrontendChanges: true }),
    );
    expect(decision.applicable).toBe(true);
  });

  it('returns NOT applicable for hasFrontendChanges=true when context.hasFrontendChanges=false', () => {
    const decision = evaluateStageApplicability(
      stageSpec({ applicability: { hasFrontendChanges: true } }),
      stageContext({ hasFrontendChanges: false }),
    );
    expect(decision.applicable).toBe(false);
  });

  it('returns applicable for isFinalAcceptance=true when context.isFinalAcceptance=true', () => {
    const decision = evaluateStageApplicability(
      stageSpec({ applicability: { isFinalAcceptance: true } }),
      stageContext({ isFinalAcceptance: true }),
    );
    expect(decision.applicable).toBe(true);
  });

  it('returns applicable for isFinalCloseout=true when context.isFinalCloseout=true', () => {
    const decision = evaluateStageApplicability(
      stageSpec({ applicability: { isFinalCloseout: true } }),
      stageContext({ isFinalCloseout: true }),
    );
    expect(decision.applicable).toBe(true);
  });

  it('OR-s multiple predicates — applicable if any matches', () => {
    const decision = evaluateStageApplicability(
      stageSpec({
        applicability: { trackIsSetup: true, hasFrontendChanges: true },
      }),
      stageContext({ trackIsSetup: false, hasFrontendChanges: true }),
    );
    expect(decision.applicable).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 4. Stage sequencing
// ──────────────────────────────────────────────────────────────────────

interface RecordingExecutor {
  callOrder: StageKind[];
  executor: StageExecutor;
}

function makeRecordingExecutor(
  outcomes: Array<'pass' | 'fail' | 'gate_retry'>,
): RecordingExecutor {
  const callOrder: StageKind[] = [];
  let invocation = 0;
  const executor: StageExecutor = mock(
    async (stage: QualityStageSpec): Promise<StageResult> => {
      callOrder.push(stage.kind);
      const outcome = outcomes[invocation] ?? 'pass';
      invocation += 1;
      if (outcome === 'gate_retry') {
        return {
          stageKind: stage.kind,
          status: 'gate_feedback',
          attempt: 1,
          feedback: {
            reason: 'Gate red: expected one failing test, observed zero',
            attempt: 1,
            gateEvidence: {
              expectedFailingTests: 1,
              observedFailingTests: 0,
            },
          },
        };
      }
      if (outcome === 'fail') {
        return {
          stageKind: stage.kind,
          status: 'failed',
          attempt: 1,
          feedback: {
            reason: 'Stage did not pass',
            attempt: 1,
          },
        };
      }
      return {
        stageKind: stage.kind,
        status: 'passed',
        attempt: 1,
      };
    },
  );
  return { callOrder, executor };
}

describe('sequenceQualityStages', () => {
  it('invokes required stages in profile order and proceeds on pass', async () => {
    const { callOrder, executor } = makeRecordingExecutor([
      'pass',
      'pass',
    ]);
    const result = await sequenceQualityStages(
      [
        stageSpec({ kind: 'red', required: true }),
        stageSpec({ kind: 'green', required: true }),
      ],
      stageContext(),
      executor,
    );
    expect(result.outcome).toBe('passed');
    expect(callOrder).toEqual(['red', 'green']);
  });

  it('short-circuits downstream stages when a required stage fails', async () => {
    const { callOrder, executor } = makeRecordingExecutor([
      'pass',
      'fail',
      'pass',
    ]);
    const result = await sequenceQualityStages(
      [
        stageSpec({ kind: 'red', required: true }),
        stageSpec({ kind: 'green', required: true }),
        stageSpec({ kind: 'phase_acceptance', required: true }),
      ],
      stageContext(),
      executor,
    );
    expect(result.outcome).toBe('failed');
    expect(callOrder).toEqual(['red', 'green']);
    if (result.outcome === 'failed') {
      expect(result.failedStageKind).toBe('green');
      expect(typeof result.reason).toBe('string');
    }
  });

  it('skips optional non-applicable stages with a recorded reason and proceeds', async () => {
    const { callOrder, executor } = makeRecordingExecutor(['pass', 'pass']);
    const result = await sequenceQualityStages(
      [
        stageSpec({ kind: 'red', required: true }),
        stageSpec({
          kind: 'ux',
          required: false,
          applicability: { hasFrontendChanges: true },
        }),
        stageSpec({ kind: 'green', required: true }),
      ],
      stageContext({ hasFrontendChanges: false }),
      executor,
    );
    expect(result.outcome).toBe('passed');
    expect(callOrder).toEqual(['red', 'green']);
    const skipStage = result.stageLog.find((s) => s.stageKind === 'ux');
    expect(skipStage).toBeDefined();
    expect(skipStage?.status).toBe('skipped');
    expect(typeof skipStage?.reason).toBe('string');
  });

  it('proceeds when an optional applicable stage fails (required=false)', async () => {
    const { callOrder, executor } = makeRecordingExecutor([
      'pass',
      'fail',
      'pass',
    ]);
    const result = await sequenceQualityStages(
      [
        stageSpec({ kind: 'red', required: true }),
        stageSpec({
          kind: 'ux',
          required: false,
          applicability: { hasFrontendChanges: true },
        }),
        stageSpec({ kind: 'green', required: true }),
      ],
      stageContext({ hasFrontendChanges: true }),
      executor,
    );
    expect(result.outcome).toBe('passed');
    expect(callOrder).toEqual(['red', 'ux', 'green']);
  });

  it('gate feedback on attempt 1 + pass on attempt 2 proceeds (records retry in stage log)', async () => {
    const { callOrder, executor } = makeRecordingExecutor([
      'gate_retry',
      'pass',
    ]);
    const result = await sequenceQualityStages(
      [
        stageSpec({
          kind: 'red',
          required: true,
          attempts: 2,
        }),
      ],
      stageContext(),
      executor,
    );
    expect(result.outcome).toBe('passed');
    expect(callOrder.length).toBe(2);
    expect(callOrder[0]).toBe('red');
    expect(callOrder[1]).toBe('red');
    const redStage = result.stageLog.find((s) => s.stageKind === 'red');
    expect(redStage?.status).toBe('passed');
  });

  it('exhausted attempts short-circuit downstream and fail the run', async () => {
    const { callOrder, executor } = makeRecordingExecutor([
      'gate_retry',
      'gate_retry',
      'pass',
    ]);
    const result = await sequenceQualityStages(
      [
        stageSpec({
          kind: 'red',
          required: true,
          attempts: 2,
        }),
        stageSpec({ kind: 'green', required: true }),
      ],
      stageContext(),
      executor,
    );
    expect(result.outcome).toBe('failed');
    expect(callOrder).toEqual(['red', 'red']);
    if (result.outcome === 'failed') {
      expect(result.failedStageKind).toBe('red');
    }
  });

  it('returns stage log entries with stageKind, status, and optional feedback', async () => {
    const { executor } = makeRecordingExecutor(['pass', 'pass']);
    const result = await sequenceQualityStages(
      [
        stageSpec({ kind: 'red', required: true }),
        stageSpec({ kind: 'green', required: true }),
      ],
      stageContext(),
      executor,
    );
    expect(result.stageLog).toHaveLength(2);
    for (const entry of result.stageLog) {
      expect(entry.stageKind).toBeDefined();
      expect(['passed', 'failed', 'skipped']).toContain(entry.status);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// 5. Closeout applicability
// ──────────────────────────────────────────────────────────────────────

function closeoutContext(
  overrides: Partial<CloseoutEligibilityContext> = {},
): CloseoutEligibilityContext {
  return {
    isFinalCloseout: true,
    verifyPassed: true,
    orphansPassed: true,
    ...overrides,
  };
}

describe('evaluateCloseoutEligibility', () => {
  it('is eligible only when isFinalCloseout AND verifyPassed AND orphansPassed are all true', () => {
    const decision: CloseoutDecision = evaluateCloseoutEligibility(
      closeoutContext(),
    );
    expect(decision.eligible).toBe(true);
    expect(decision.reason).toBeUndefined();
  });

  it('is NOT eligible when isFinalCloseout=true but verifyPassed=false', () => {
    const decision = evaluateCloseoutEligibility(
      closeoutContext({ verifyPassed: false }),
    );
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toMatch(/verify/i);
  });

  it('is NOT eligible when isFinalCloseout=true but orphansPassed=false', () => {
    const decision = evaluateCloseoutEligibility(
      closeoutContext({ orphansPassed: false }),
    );
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toMatch(/orphans/i);
  });

  it('is NOT eligible when isFinalCloseout=false (non-final work)', () => {
    const decision = evaluateCloseoutEligibility(
      closeoutContext({ isFinalCloseout: false }),
    );
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toMatch(/final|closeout/i);
  });

  it('is NOT eligible when isFinalCloseout=false even if verify and orphans pass', () => {
    const decision = evaluateCloseoutEligibility(
      closeoutContext({ isFinalCloseout: false, verifyPassed: true, orphansPassed: true }),
    );
    expect(decision.eligible).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 6. runQualityWorkflow entry point
// ──────────────────────────────────────────────────────────────────────

describe('runQualityWorkflow', () => {
  it('returns passed result when runner reports passed and no applicable closeout', async () => {
    const runner: QualityWorkflowRunner = {
      runStage: mock(async (stage: QualityStageSpec) => ({
        stageKind: stage.kind,
        status: 'passed' as const,
        attempt: 1,
      })),
    };
    const result: QualityRunResult = await runQualityWorkflow(
      [
        stageSpec({ kind: 'red', required: true }),
        stageSpec({ kind: 'green', required: true }),
      ],
      stageContext(),
      runner,
      closeoutContext({ isFinalCloseout: false }),
    );
    expect(result.outcome).toBe('passed');
  });

  it('returns failed result with failedStageKind and reason when a required stage fails', async () => {
    const runner: QualityWorkflowRunner = {
      runStage: mock(async (stage: QualityStageSpec) => {
        if (stage.kind === 'red') {
          return {
            stageKind: stage.kind,
            status: 'failed' as const,
            attempt: 1,
            feedback: { reason: 'no failing test', attempt: 1 },
          };
        }
        return {
          stageKind: stage.kind,
          status: 'passed' as const,
          attempt: 1,
        };
      }),
    };
    const result = await runQualityWorkflow(
      [
        stageSpec({ kind: 'red', required: true }),
        stageSpec({ kind: 'green', required: true }),
      ],
      stageContext(),
      runner,
      closeoutContext({ isFinalCloseout: false }),
    );
    expect(result.outcome).toBe('failed');
    if (result.outcome === 'failed') {
      expect(result.failedStageKind).toBe('red');
      expect(result.reason).toContain('no failing test');
    }
  });

  it('blocks closeout (returns failed with reason) when verify has not passed, even if all quality stages pass', async () => {
    const runner: QualityWorkflowRunner = {
      runStage: mock(async (stage: QualityStageSpec) => ({
        stageKind: stage.kind,
        status: 'passed' as const,
        attempt: 1,
      })),
    };
    const result = await runQualityWorkflow(
      [stageSpec({ kind: 'closeout', required: false, applicability: { isFinalCloseout: true } })],
      stageContext({ isFinalCloseout: true }),
      runner,
      closeoutContext({ isFinalCloseout: true, verifyPassed: false, orphansPassed: true }),
    );
    expect(result.outcome).toBe('failed');
    if (result.outcome === 'failed') {
      expect(result.reason).toMatch(/verify/);
    }
  });

  it('blocks closeout when orphans have not passed, even if verify passed', async () => {
    const runner: QualityWorkflowRunner = {
      runStage: mock(async (stage: QualityStageSpec) => ({
        stageKind: stage.kind,
        status: 'passed' as const,
        attempt: 1,
      })),
    };
    const result = await runQualityWorkflow(
      [stageSpec({ kind: 'closeout', required: false, applicability: { isFinalCloseout: true } })],
      stageContext({ isFinalCloseout: true }),
      runner,
      closeoutContext({ isFinalCloseout: true, verifyPassed: true, orphansPassed: false }),
    );
    expect(result.outcome).toBe('failed');
    if (result.outcome === 'failed') {
      expect(result.reason).toMatch(/orphans/);
    }
  });

  it('passes closeout only when isFinalCloseout, verifyPassed, and orphansPassed are all true', async () => {
    const runner: QualityWorkflowRunner = {
      runStage: mock(async (stage: QualityStageSpec) => ({
        stageKind: stage.kind,
        status: 'passed' as const,
        attempt: 1,
      })),
    };
    const result = await runQualityWorkflow(
      [stageSpec({ kind: 'closeout', required: false, applicability: { isFinalCloseout: true } })],
      stageContext({ isFinalCloseout: true }),
      runner,
      closeoutContext({ isFinalCloseout: true, verifyPassed: true, orphansPassed: true }),
    );
    expect(result.outcome).toBe('passed');
  });
});

// ──────────────────────────────────────────────────────────────────────
// 7. Structured feedback contract
// ──────────────────────────────────────────────────────────────────────

describe('StageFeedback and StageResult contract shapes', () => {
  it('StageFeedback includes reason, attempt, and optional gateEvidence', () => {
    const fb: StageFeedback = {
      reason: 'Red gate rejected: no failing test committed',
      attempt: 1,
      gateEvidence: {
        expectedFailingTests: 1,
        observedFailingTests: 0,
        changedFiles: ['pivot/src/foo.red.test.ts'],
      },
    };
    expect(fb.reason).toContain('Red gate');
    expect(fb.attempt).toBe(1);
    expect(fb.gateEvidence?.expectedFailingTests).toBe(1);
    expect(fb.gateEvidence?.observedFailingTests).toBe(0);
  });

  it('QualityRunResult.passed carries an ordered stage log', () => {
    const log: StageResult[] = [
      { stageKind: 'red', status: 'passed', attempt: 1 },
      { stageKind: 'green', status: 'passed', attempt: 1 },
    ];
    const result: QualityRunResult = { outcome: 'passed', stageLog: log };
    expect(result.outcome).toBe('passed');
    expect(result.stageLog).toHaveLength(2);
  });

  it('QualityRunResult.failed carries failedStageKind, reason, and stage log', () => {
    const result: QualityRunResult = {
      outcome: 'failed',
      stageLog: [
        { stageKind: 'red', status: 'passed', attempt: 1 },
        {
          stageKind: 'green',
          status: 'failed',
          attempt: 1,
          feedback: { reason: 'test still failing', attempt: 1 },
        },
      ],
      failedStageKind: 'green',
      reason: 'test still failing',
    };
    expect(result.outcome).toBe('failed');
    expect(result.failedStageKind).toBe('green');
    expect(result.reason).toContain('test still failing');
  });
});

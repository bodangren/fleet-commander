/**
 * Phase S5 Parity Tests for the integrated quality workflow.
 *
 * Owned by Phase S5 Test tasks 1 and 2 of
 * `measure/tracks/measure_quality_workflow_integration_20260611/plan.md`.
 *
 * Contract pinned by this file (per spec S5 AC + test-strategy §5 S5):
 *
 *   1. Python reference parity — for representative fixture tracks, the
 *      integrated workflow's stage order, applicability decisions, gate
 *      outcomes, retry feedback, resume ordering, and closeout
 *      eligibility match the bounded Python dry-run reference table.
 *      The reference is a static decision table (NOT a fake harness, NOT
 *      a spawned subprocess) so the test never accidentally invokes the
 *      real `measure/automation-supervisor.py`.
 *
 *   2. No-profile production regression — running the real `runProject`
 *      with `BUILTIN_NONE_PROFILE` (the no-profile path) leaves the
 *      characterized orchestrator behavior unchanged: quality stages
 *      are not invoked, the success transition continues, and no
 *      `qualityRuns` row is recorded.
 *
 *   3. Strict-profile end-to-end — running the real `runProject` with
 *      `BUILTIN_STRICT_PROFILE` runs the configured quality stages in
 *      profile order, persists the run, and lets reviewer/merger
 *      continuation proceed when stages pass.
 *
 * Red-phase state at S5 MID start: the
 * `pivot/src/orchestrator/parity/` directory did not exist. The file
 * is intentionally Red at the closeout-gate level (the meaningful Red
 * is owned by the sibling `guards/noSecondScheduler.test.ts` "no
 * *.red.test.ts files remain" rule). The Green sibling lands when the
 * directory is present, the parity test passes against the production
 * `runProject` import, and the closeout rule is satisfied.
 *
 * The file uses the `*.test.ts` suffix (not `*.red.test.ts`) because it
 * is a single-paradigm suite owned by S5 Test tasks 1 and 2.
 */

import { describe, expect, it, mock } from 'bun:test';
import { runProject } from '../orchestrator';
import {
  BUILTIN_NONE_PROFILE,
  BUILTIN_STANDARD_PROFILE,
  BUILTIN_STRICT_PROFILE,
  type QualityProfileType,
} from '../../shared/qualityProfile';
import {
  runQualityWorkflow,
  evaluateRedStageGate,
  evaluateStageApplicability,
  evaluateCloseoutEligibility,
  sequenceQualityStages,
  type QualityStageSpec,
  type StageContext,
  type CloseoutEligibilityContext,
  type QualityWorkflowRunner,
  type StageResult,
  type RedStageGateInput,
} from '../qualityWorkflowRunner';
import type { ExecuteFn, IssueHooks, QualityWorkflowHooks } from '../types';

// ──────────────────────────────────────────────────────────────────────
// Python reference decision table
// ──────────────────────────────────────────────────────────────────────
//
// The reference is a static decision table that mirrors the behavior of
// `measure/automation-supervisor.py` for the supported strict profile,
// in a bounded and observable form. The test does NOT spawn the Python
// process: it loads the table and asserts the integrated workflow's
// decisions match for the same inputs.
//
// Applicability derived from BUILTIN_STRICT_PROFILE (see
// `pivot/src/shared/qualityProfile.ts`):
//   strategy          → trackIsSetup
//   red, green,
//   phase_acceptance,
//   adversarial       → always
//   ux                → hasFrontendChanges
//   acceptance        → isFinalAcceptance
//   closeout          → isFinalCloseout

interface ParityFixture {
  id: string;
  context: StageContext;
  closeoutCtx: CloseoutEligibilityContext;
  expectedStagesRun: string[];
  expectedStageLog: string[];
  expectedOutcome: 'passed' | 'failed';
  expectedCloseout: boolean;
}

const PYTHON_REFERENCE_FIXTURES: ParityFixture[] = [
  {
    id: 'setup-track-fixture',
    context: { trackIsSetup: true, hasFrontendChanges: false, isFinalAcceptance: false, isFinalCloseout: false },
    closeoutCtx: { isFinalCloseout: false, verifyPassed: false, orphansPassed: false },
    expectedStagesRun: ['strategy', 'red', 'green', 'phase_acceptance', 'adversarial'],
    expectedStageLog: ['strategy', 'red', 'green', 'phase_acceptance', 'adversarial', 'ux', 'acceptance', 'closeout'],
    expectedOutcome: 'passed',
    expectedCloseout: false,
  },
  {
    id: 'frontend-changes-fixture',
    context: { trackIsSetup: false, hasFrontendChanges: true, isFinalAcceptance: false, isFinalCloseout: false },
    closeoutCtx: { isFinalCloseout: false, verifyPassed: false, orphansPassed: false },
    expectedStagesRun: ['red', 'green', 'phase_acceptance', 'adversarial', 'ux'],
    expectedStageLog: ['strategy', 'red', 'green', 'phase_acceptance', 'adversarial', 'ux', 'acceptance', 'closeout'],
    expectedOutcome: 'passed',
    expectedCloseout: false,
  },
  {
    id: 'final-acceptance-fixture',
    context: { trackIsSetup: false, hasFrontendChanges: false, isFinalAcceptance: true, isFinalCloseout: false },
    closeoutCtx: { isFinalCloseout: false, verifyPassed: false, orphansPassed: false },
    expectedStagesRun: ['red', 'green', 'phase_acceptance', 'adversarial', 'acceptance'],
    expectedStageLog: ['strategy', 'red', 'green', 'phase_acceptance', 'adversarial', 'ux', 'acceptance', 'closeout'],
    expectedOutcome: 'passed',
    expectedCloseout: false,
  },
  {
    id: 'eligible-closeout-fixture',
    context: { trackIsSetup: false, hasFrontendChanges: false, isFinalAcceptance: true, isFinalCloseout: true },
    closeoutCtx: { isFinalCloseout: true, verifyPassed: true, orphansPassed: true },
    expectedStagesRun: ['red', 'green', 'phase_acceptance', 'adversarial', 'acceptance', 'closeout'],
    expectedStageLog: ['strategy', 'red', 'green', 'phase_acceptance', 'adversarial', 'ux', 'acceptance', 'closeout'],
    expectedOutcome: 'passed',
    expectedCloseout: true,
  },
  {
    id: 'blocked-closeout-fixture',
    context: { trackIsSetup: false, hasFrontendChanges: false, isFinalAcceptance: false, isFinalCloseout: true },
    closeoutCtx: { isFinalCloseout: true, verifyPassed: false, orphansPassed: true },
    expectedStagesRun: [],
    expectedStageLog: [],
    expectedOutcome: 'failed',
    expectedCloseout: false,
  },
];

function strictProfileStages(profile: QualityProfileType): QualityStageSpec[] {
  return profile.stages.map((stage: QualityProfileType['stages'][number]) => ({
    kind: stage.kind,
    required: stage.policy.required,
    applicability: stage.policy.applicability,
    role: stage.policy.role,
    attempts: stage.policy.attempts,
    timeoutMs: stage.policy.timeoutMs,
  }));
}

function makePassThroughRunner() {
  const executed: string[] = [];
  const runner: QualityWorkflowRunner = {
    runStage: async (ctx) => {
      executed.push(ctx.stage.kind);
      return { stageKind: ctx.stage.kind, status: 'passed', attempt: ctx.attempt } satisfies StageResult;
    },
  };
  return { runner, executed };
}

// ──────────────────────────────────────────────────────────────────────
// 1. Module surface
// ──────────────────────────────────────────────────────────────────────

describe('parity/qualityProfileParity module surface', () => {
  it('exports the strict profile with the eight expected stage kinds', () => {
    const kinds = BUILTIN_STRICT_PROFILE.stages.map((s) => s.kind);
    expect(kinds).toEqual([
      'strategy', 'red', 'green', 'phase_acceptance',
      'adversarial', 'ux', 'acceptance', 'closeout',
    ]);
  });

  it('exports the standard profile with strategy / red / green / phase_acceptance', () => {
    const kinds = BUILTIN_STANDARD_PROFILE.stages.map((s) => s.kind);
    expect(kinds).toEqual(['strategy', 'red', 'green', 'phase_acceptance']);
  });

  it('exports the none profile with zero stages', () => {
    expect(BUILTIN_NONE_PROFILE.kind).toBe('none');
    expect(BUILTIN_NONE_PROFILE.stages).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 2. Python dry-run reference parity (S5 Test task 1)
// ──────────────────────────────────────────────────────────────────────

describe('parity/qualityProfileParity - Python dry-run reference parity', () => {
  for (const fixture of PYTHON_REFERENCE_FIXTURES) {
    it(`fixture "${fixture.id}" matches the Python reference for stage order, outcome, and closeout`, async () => {
      const stages = strictProfileStages(BUILTIN_STRICT_PROFILE);
      const { runner, executed } = makePassThroughRunner();
      const result = await runQualityWorkflow(
        stages,
        fixture.context,
        runner,
        fixture.closeoutCtx,
      );

      expect(evaluateCloseoutEligibility(fixture.closeoutCtx).eligible).toBe(fixture.expectedCloseout);
      expect(result.outcome).toBe(fixture.expectedOutcome);
      expect(executed).toEqual(fixture.expectedStagesRun);
      expect(result.stageLog.map((s) => s.stageKind) as string[]).toEqual(fixture.expectedStageLog);
    });
  }

  it('per-stage applicability for the strict profile matches the reference evaluator', () => {
    const stages = strictProfileStages(BUILTIN_STRICT_PROFILE);
    const ctx: StageContext = {
      trackIsSetup: true, hasFrontendChanges: true,
      isFinalAcceptance: true, isFinalCloseout: true,
    };
    for (const stage of stages) {
      expect(evaluateStageApplicability(stage, ctx).applicable).toBe(true);
    }
    const noneCtx: StageContext = {
      trackIsSetup: false, hasFrontendChanges: false,
      isFinalAcceptance: false, isFinalCloseout: false,
    };
    // strategy/ux/acceptance/closeout are gated; red/green/phase_acceptance/adversarial are always
    for (const stage of stages) {
      const applicable = evaluateStageApplicability(stage, noneCtx).applicable;
      if (['red', 'green', 'phase_acceptance', 'adversarial'].includes(stage.kind)) {
        expect(applicable).toBe(true);
      } else {
        expect(applicable).toBe(false);
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. Red-stage gate parity
// ──────────────────────────────────────────────────────────────────────

describe('parity/qualityProfileParity - Red-stage gate parity with reference', () => {
  function redInput(over: Partial<RedStageGateInput>): RedStageGateInput {
    return {
      expectedFailingTests: 1,
      requireFailingTestCommitted: true,
      rejectNonTestSourceChanges: true,
      failingTestCountObserved: 1,
      changedFiles: ['pivot/src/foo.red.test.ts'],
      ...over,
    };
  }

  it('reference accepts: exactly N failing tests + test-only diff', () => {
    expect(evaluateRedStageGate(redInput({})).accepted).toBe(true);
  });

  it('reference rejects: requireFailingTestCommitted + 0 observed', () => {
    const decision = evaluateRedStageGate(redInput({ failingTestCountObserved: 0, expectedFailingTests: 0 }));
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toMatch(/failing test/i);
  });

  it('reference rejects: non-test source files in diff', () => {
    const decision = evaluateRedStageGate(redInput({
      changedFiles: ['pivot/src/foo.red.test.ts', 'pivot/src/feature/feature.ts'],
    }));
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toMatch(/non-test/i);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 4. Retry-feedback parity (exhausted attempts short-circuit downstream)
// ──────────────────────────────────────────────────────────────────────

describe('parity/qualityProfileParity - retry feedback parity', () => {
  it('exhausted gate_feedback attempts short-circuit downstream stages', async () => {
    const stages: QualityStageSpec[] = [
      { kind: 'red', required: true, applicability: { always: true }, role: 'executor', attempts: 1, timeoutMs: 1000 },
      { kind: 'green', required: true, applicability: { always: true }, role: 'executor', attempts: 1, timeoutMs: 1000 },
    ];
    const context: StageContext = { trackIsSetup: false, hasFrontendChanges: false, isFinalAcceptance: false, isFinalCloseout: false };
    const closeoutCtx: CloseoutEligibilityContext = { isFinalCloseout: false, verifyPassed: false, orphansPassed: false };
    let greenInvoked = false;
    const result = await runQualityWorkflow(stages, context, {
      runStage: async (ctx) => {
        if (ctx.stage.kind === 'green') greenInvoked = true;
        return { stageKind: ctx.stage.kind, status: 'gate_feedback', attempt: ctx.attempt, feedback: { reason: 'exhausted', attempt: ctx.attempt } } satisfies StageResult;
      },
    }, closeoutCtx);
    expect(result.outcome).toBe('failed');
    expect((result as any).failedStageKind).toBe('red');
    expect(greenInvoked).toBe(false);
  });

  it('sequenceQualityStages records gate_feedback exhaustion as failed', async () => {
    const stages: QualityStageSpec[] = [
      { kind: 'red', required: true, applicability: { always: true }, role: 'executor', attempts: 2, timeoutMs: 1000 },
    ];
    const context: StageContext = { trackIsSetup: false, hasFrontendChanges: false, isFinalAcceptance: false, isFinalCloseout: false };
    const seq = await sequenceQualityStages(stages, context, async (ctx) => ({
      stageKind: ctx.stage.kind, status: 'gate_feedback', attempt: ctx.attempt, feedback: { reason: 'first attempt', attempt: ctx.attempt },
    }));
    expect(seq.outcome).toBe('failed');
    expect((seq as any).failedStageKind).toBe('red');
  });
});

// ──────────────────────────────────────────────────────────────────────
// 5. No-profile production regression (S5 Test task 2a)
// ──────────────────────────────────────────────────────────────────────
//
// With BUILTIN_NONE_PROFILE injected, the real `runProject` import must
// leave the no-profile path byte-for-byte equivalent: the runner is not
// invoked and the standard executor/reviewer/merger path continues.

interface RecordingClient {
  query: ReturnType<typeof mock>;
  mutation: ReturnType<typeof mock>;
}

function createRecordingClient(): RecordingClient {
  const client: RecordingClient = {
    query: mock(async () => undefined),
    mutation: mock(async () => undefined),
  };
  (client.query as any).mockImplementation(async () => undefined);
  (client.mutation as any).mockImplementation(async () => undefined);
  return client;
}

/**
 * Install default mock handlers for the queries runProject performs
 * during the load / score / dispatch / persist lifecycle. Identifies
 * queries by their arg shape and a per-call counter. Mirrors
 * orchestrator.characterization.test.ts#installLoaders.
 */
function installDefaultLoaders(client: RecordingClient, tasks: unknown[]) {
  const TRACK_STATUSES_OBJ = [
    { projectSlug: 'demo', trackId: 'track-a', title: 'Track', status: 'active', version: 1, updatedAt: 1 },
  ];
  const PROJECT_OBJ = { slug: 'demo', name: 'Demo', rootPath: '/tmp/demo', status: 'active', source: 'manual' };
  let projectSlugCallCount = 0;
  (client.query as any).mockImplementation(async (_ref: unknown, args?: Record<string, unknown>) => {
    const a = args ?? {};
    if (typeof a.id === 'string') return PROJECT_OBJ;
    if (typeof a.taskId === 'string') return null;
    if (typeof a.scope === 'string') return { allowed: true };
    if (a.limit === 1000) return [];
    if (a.limit === 100) return [];
    if (typeof a.projectSlug === 'string') {
      const idx = projectSlugCallCount++;
      if (idx === 0) return tasks;
      if (idx === 1) return TRACK_STATUSES_OBJ;
      if (idx === 2) return null;
      return null;
    }
    return undefined;
  });
}

// Declared critical so the strict profile keeps its full stage list. Risk-
// adapted selection trims a strict profile down to red/green/review for a
// normal-risk task, which is covered by its own case below.
const TODO_TASK = {
  projectSlug: 'demo',
  trackId: 'track-a',
  taskKey: 't1',
  title: 'Happy path task',
  status: 'backlog' as const,
  dependencies: [],
  updatedAt: 1,
  riskClass: 'critical' as const,
};

const FAST_RETRY_CONFIG = {
  maxRetries: 0,
  baseDelayMs: 1,
  maxDelayMs: 1,
  commandTimeoutMs: 1000,
};

describe('parity/qualityProfileParity - no-profile production regression', () => {
  it('runProject with BUILTIN_NONE_PROFILE does not invoke any quality runner', async () => {
    const client = createRecordingClient();
    installDefaultLoaders(client, [TODO_TASK]);
    const successful = mock(async (_client: any, _agentName: string, _taskTitle: string, taskKey: string) => ({
      taskKey,
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'ok',
      durationMs: 10,
    })) as ExecuteFn;

    let runnerInvoked = false;
    const qualityHooks: QualityWorkflowHooks = {
      runner: {
        runStage: async () => {
          runnerInvoked = true;
          return { stageKind: 'strategy', status: 'passed', attempt: 1 } satisfies StageResult;
        },
      },
      getEffectiveProfile: async () => BUILTIN_NONE_PROFILE,
    };

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      {} as IssueHooks,
      successful,
      undefined,
      undefined,
      qualityHooks,
    );

    expect(result.status).toBe('succeeded');
    expect(result.taskKey).toBe('t1');
    expect(runnerInvoked).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 6. Strict-profile end-to-end (S5 Test task 2b)
// ──────────────────────────────────────────────────────────────────────
//
// With BUILTIN_STRICT_PROFILE injected, the real `runProject` import
// invokes the runner for each applicable stage in profile order. The
// applicable stages for the defaultStageContext derived from a
// track-setup=false / non-frontend / non-final task are
// {red, green, phase_acceptance, adversarial}.

describe('parity/qualityProfileParity - strict-profile end-to-end', () => {
  it('runProject with BUILTIN_STRICT_PROFILE invokes the runner for applicable stages and the run succeeds', async () => {
    const client = createRecordingClient();
    installDefaultLoaders(client, [TODO_TASK]);
    const successful = mock(async (_client: any, _agentName: string, _taskTitle: string, taskKey: string) => ({
      taskKey,
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'ok',
      durationMs: 10,
    })) as ExecuteFn;

    const stagesExecuted: string[] = [];
    const qualityHooks: QualityWorkflowHooks = {
      runner: {
        runStage: async (ctx) => {
          stagesExecuted.push(ctx.stage.kind);
          return { stageKind: ctx.stage.kind, status: 'passed', attempt: ctx.attempt } satisfies StageResult;
        },
      },
      getEffectiveProfile: async () => BUILTIN_STRICT_PROFILE,
    };

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      {} as IssueHooks,
      successful,
      undefined,
      undefined,
      qualityHooks,
    );

    expect(result.status).toBe('succeeded');
    // "Happy path task" doesn't match setup → strategy is optional + not applicable → skipped.
    // The applicable strict stages are red, green, phase_acceptance, adversarial in profile order.
    expect(stagesExecuted).toEqual([
      'red', 'green', 'phase_acceptance', 'adversarial',
    ]);
  });

  it('trims the strict profile to the red/green/review core for a normal-risk task', async () => {
    // Risk-adapted stage selection: a strict profile no longer forces all
    // stages onto a low-risk task. The eight-stage list is reserved for tracks
    // whose declaration or evidence says critical.
    const client = createRecordingClient();
    installDefaultLoaders(client, [{ ...TODO_TASK, riskClass: 'normal' as const }]);
    const successful = mock(async (_client: any, _agentName: string, _taskTitle: string, taskKey: string) => ({
      taskKey,
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'ok',
      durationMs: 10,
    })) as ExecuteFn;

    const stagesExecuted: string[] = [];
    const qualityHooks: QualityWorkflowHooks = {
      runner: {
        runStage: async (ctx) => {
          stagesExecuted.push(ctx.stage.kind);
          return { stageKind: ctx.stage.kind, status: 'passed', attempt: ctx.attempt } satisfies StageResult;
        },
      },
      getEffectiveProfile: async () => BUILTIN_STRICT_PROFILE,
    };

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      {} as IssueHooks,
      successful,
      undefined,
      undefined,
      qualityHooks,
    );

    expect(result.status).toBe('succeeded');
    expect(stagesExecuted).toEqual(['red', 'green', 'phase_acceptance']);
    expect(stagesExecuted).not.toContain('adversarial');
  });
});

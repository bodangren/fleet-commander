/**
 * Phase 3 Red tests for sequencing, applicability, cost recovery.
 *
 * 1. A required non-applicable stage must fail the run.
 * 2. Skipped-stage reasons must survive in a failed run log.
 * 3. evaluateQualityRecovery must handle maxAttempts <= 0 safely.
 * 4. Quality costs reach reconcileBudgetOnComplete.
 */

import { describe, expect, it, mock } from 'bun:test';
import {
  sequenceQualityStages,
  type QualityStageSpec,
  type StageContext,
  type StageExecutor,
  type StageResult,
} from './qualityWorkflowRunner';
import { evaluateQualityRecovery } from './qualityCostRollup';

function stageSpec(overrides: Partial<QualityStageSpec> = {}): QualityStageSpec {
  return {
    kind: 'red',
    required: true,
    applicability: { always: true },
    role: 'executor',
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

describe('sequenceQualityStages — required non-applicable stage fails the run', () => {
  it('fails the run when a required stage is not applicable', async () => {
    const executor: StageExecutor = mock(async (stage) => ({
      stageKind: stage.kind,
      status: 'passed' as const,
      attempt: 1,
    }));

    const result = await sequenceQualityStages(
      [
        stageSpec({
          kind: 'acceptance',
          required: true,
          applicability: { isFinalAcceptance: true },
        }),
        stageSpec({ kind: 'red', required: true }),
      ],
      stageContext({ isFinalAcceptance: false }),
      executor,
    );

    expect(result.outcome).toBe('failed');
    if (result.outcome === 'failed') {
      expect(result.failedStageKind).toBe('acceptance');
      expect(result.reason).toContain('not applicable');
    }
    // The red stage should not have been executed
    expect(executor).not.toHaveBeenCalled();
  });

  it('preserves skipped-stage reasons in a failed run log', async () => {
    const executor: StageExecutor = mock(async (stage) => {
      if (stage.kind === 'green') {
        return { stageKind: stage.kind, status: 'failed' as const, attempt: 1, feedback: { reason: 'test failed', attempt: 1 } };
      }
      return { stageKind: stage.kind, status: 'passed' as const, attempt: 1 };
    });

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

    expect(result.outcome).toBe('failed');
    // The skipped ux stage must still appear in the log
    const skippedStage = result.stageLog.find((s) => s.stageKind === 'ux');
    expect(skippedStage).toBeDefined();
    expect(skippedStage?.status).toBe('skipped');
    expect(skippedStage?.reason).toBeDefined();
    expect(skippedStage?.reason!.length).toBeGreaterThan(0);
  });
});

describe('evaluateQualityRecovery — edge cases', () => {
  it('handles maxAttempts <= 0 safely', () => {
    const decision = evaluateQualityRecovery({
      stageKind: 'red',
      role: 'executor',
      maxAttempts: 0,
      attempts: [],
      gateHard: true,
    });

    expect(decision.shouldBlock).toBe(false);
    expect(decision.shouldNotify).toBe(false);
    expect(decision.shouldTripCircuit).toBe(false);
  });

  it('handles negative maxAttempts safely', () => {
    const decision = evaluateQualityRecovery({
      stageKind: 'red',
      role: 'executor',
      maxAttempts: -1,
      attempts: [],
      gateHard: true,
    });

    expect(decision.shouldBlock).toBe(false);
  });
});

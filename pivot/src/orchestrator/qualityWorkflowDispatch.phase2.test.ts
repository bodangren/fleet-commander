/**
 * Phase 2 Red tests for quality-workflow dispatch lifecycle hooks.
 *
 * This test proves that `runConfiguredQualityWorkflow` invokes the
 * `onStageResult` hook for every executed stage so that production
 * boundary mutations (`appendStageAttempt`) are actually reached. At
 * HEAD the function calls `onQualityRunStart` and `onQualityRunFinish`
 * but never `onStageResult`, so this test fails.
 *
 * Per FR-6 (Honest timing assertions), this file asserts the REAL
 * per-stage execution window rather than hand-fed constants or
 * `typeof === 'number'`. The runner below sleeps a measurable interval
 * per stage; the assertions verify that `startedAt`/`finishedAt` passed
 * to `onStageResult` bracket that interval (`finishedAt > startedAt`).
 */

import { describe, expect, it, mock } from 'bun:test';
import { runConfiguredQualityWorkflow } from './qualityWorkflowDispatch';
import { BUILTIN_STANDARD_PROFILE } from '../shared/qualityProfile';
import type { QualityWorkflowHooks, Task } from './types';
import type { QualityWorkflowRunner, StageResult } from './qualityWorkflowRunner';

const STAGE_SLEEP_MS = 20;

const sampleTask: Task = {
  projectSlug: 'test-project',
  trackId: 'track-1',
  taskKey: 'T-1',
  title: 'Test task',
  status: 'ready',
  dependencies: [],
  updatedAt: Date.now(),
};

describe('runConfiguredQualityWorkflow — onStageResult lifecycle hook', () => {
  it('calls onStageResult for every executed stage result with real per-stage timing (FR-1, FR-6)', async () => {
    const onStageResult = mock(async () => {});
    const onQualityRunStart = mock(async () => {});
    const onQualityRunFinish = mock(async () => {});
    const recordProfileSnapshot = mock(async () => {});

    // FR-6: capture the runner's actual execution window so we can
    // assert the dispatch forwards truthful timing (not a single
    // post-run Date.now()).
    const stageWindows: Array<{ stageKind: string; start: number; end: number }> = [];

    const runner: QualityWorkflowRunner = {
      runStage: mock(async (ctx: any): Promise<StageResult> => {
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, STAGE_SLEEP_MS));
        const end = Date.now();
        stageWindows.push({ stageKind: ctx.stage.kind, start, end });
        return {
          stageKind: ctx.stage.kind,
          status: 'passed',
          attempt: ctx.attempt ?? 1,
          startedAt: start,
          finishedAt: end,
        };
      }),
    };

    const hooks: QualityWorkflowHooks = {
      getEffectiveProfile: async () => BUILTIN_STANDARD_PROFILE,
      recordProfileSnapshot,
      runner,
      onQualityRunStart,
      onStageResult,
      onQualityRunFinish,
    };

    const client = {
      query: mock(async () => ({})),
      mutation: mock(async () => ({})),
    } as any;

    const result = await runConfiguredQualityWorkflow(
      client,
      sampleTask.projectSlug,
      sampleTask,
      'run-1',
      '/tmp/test-project',
      undefined,
      hooks,
    );

    expect(result).not.toBeNull();
    expect(result!.status).toBe('passed');

    expect(onQualityRunStart).toHaveBeenCalled();
    expect(onQualityRunFinish).toHaveBeenCalled();

    // The standard profile has strategy (skipped), red, green, and phase_acceptance.
    // onStageResult must fire for the executed stages.
    expect(onStageResult).toHaveBeenCalledTimes(3);

    const calls = onStageResult.mock.calls as unknown[][];
    const firstCall = calls[0];
    expect(firstCall[0]).toBe(client);
    expect(firstCall[1]).toMatchObject({
      projectSlug: sampleTask.projectSlug,
      taskKey: sampleTask.taskKey,
      runId: 'run-1',
      stageKind: 'red',
      role: 'executor',
      attempt: 1,
      status: 'passed',
    });

    // FR-6: every onStageResult call must carry timing that brackets
    // the actual runner execution window. finishedAt > startedAt for
    // measurable stages; the timestamps must NOT be a single
    // post-run Date.now() shared across all stages.
    const startedAtSeen = new Set<number>();
    const finishedAtSeen = new Set<number>();
    for (let i = 0; i < calls.length; i++) {
      const ctx = calls[i][1] as { stageKind: string; startedAt: number; finishedAt: number };
      expect(typeof ctx.startedAt).toBe('number');
      expect(typeof ctx.finishedAt).toBe('number');
      expect(ctx.finishedAt).toBeGreaterThanOrEqual(ctx.startedAt);
      startedAtSeen.add(ctx.startedAt);
      finishedAtSeen.add(ctx.finishedAt);

      // Each stage's timing window must bracket its runner execution.
      const window = stageWindows[i];
      expect(window).toBeDefined();
      expect(window!.stageKind).toBe(ctx.stageKind);
      // startedAt must be <= window.end (dispatch may add slack for
      // bookkeeping); finishedAt must be >= window.start.
      expect(ctx.startedAt).toBeLessThanOrEqual(window!.end + 5);
      expect(ctx.finishedAt).toBeGreaterThanOrEqual(window!.start);
      // For a measurable stage, finishedAt > startedAt strictly.
      expect(ctx.finishedAt - ctx.startedAt).toBeGreaterThanOrEqual(STAGE_SLEEP_MS - 5);
    }
    // Across 3 stages each sleeping STAGE_SLEEP_MS, the startedAt and
    // finishedAt values must differ across stages — the HEAD failure
    // mode is a single shared Date.now() across all stages.
    expect(startedAtSeen.size).toBeGreaterThanOrEqual(2);
    expect(finishedAtSeen.size).toBeGreaterThanOrEqual(2);
  });

  it('forwards startedAt/finishedAt from StageResult when the runner supplies them (FR-6)', async () => {
    // FR-6: when the runner populates StageResult.startedAt and
    // .finishedAt, the dispatch must forward those exact values to
    // onStageResult rather than fabricating fresh Date.now() calls.
    const onStageResult = mock(async () => {});

    const HAND_FEED_STARTED_AT = 1_700_000_000_000;
    const HAND_FEED_FINISHED_AT = 1_700_000_030_000;

    const runner: QualityWorkflowRunner = {
      runStage: mock(async (ctx: any): Promise<StageResult> => {
        return {
          stageKind: ctx.stage.kind,
          status: 'passed',
          attempt: ctx.attempt ?? 1,
          startedAt: HAND_FEED_STARTED_AT,
          finishedAt: HAND_FEED_FINISHED_AT,
        };
      }),
    };

    const hooks: QualityWorkflowHooks = {
      getEffectiveProfile: async () => BUILTIN_STANDARD_PROFILE,
      recordProfileSnapshot: async () => {},
      runner,
      onQualityRunStart: async () => {},
      onStageResult,
      onQualityRunFinish: async () => {},
    };

    const client = {
      query: mock(async () => ({})),
      mutation: mock(async () => ({})),
    } as any;

    await runConfiguredQualityWorkflow(
      client,
      sampleTask.projectSlug,
      sampleTask,
      'run-2',
      '/tmp/test-project',
      undefined,
      hooks,
    );

    const calls = onStageResult.mock.calls as unknown[][];
    expect(calls.length).toBe(3);
    for (const call of calls) {
      const ctx = call[1] as { startedAt: number; finishedAt: number };
      expect(ctx.startedAt).toBe(HAND_FEED_STARTED_AT);
      expect(ctx.finishedAt).toBe(HAND_FEED_FINISHED_AT);
    }
  });
});

/**
 * Phase 1 Red tests for FR-1 / FR-6 — stage-boundary timestamps.
 *
 * These tests prove that the real per-stage execution window is persisted to
 * Convex (via `api.qualityRuns.appendStageAttempt`) instead of the fabricated
 * post-run `Date.now()` constant. At HEAD (commit 3df75b8) the dispatch in
 * `qualityWorkflowDispatch.ts:108-109` does:
 *
 *   const startedAt = Date.now();
 *   const finishedAt = Date.now();
 *
 * after the whole workflow finishes, so every persisted attempt has zero
 * duration at the wrong instant. The tests below drive the production
 * hooks through `runConfiguredQualityWorkflow` with a runner whose
 * `runStage` sleeps a measurable interval, then assert that the
 * `appendStageAttempt` mutation receives `startedAt`/`finishedAt` that
 * bracket the stage's execution window (`finishedAt > startedAt`).
 *
 * Naming: `*.regression.test.ts` per FR-8 / prior-track convention so the
 * S5 closeout guard (`zero *.red.test.ts files`) does not delete this
 * evidence. These tests become permanent regression guards once the fix
 * ships; they MUST still fail when the fix is reverted.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { runConfiguredQualityWorkflow } from './qualityWorkflowDispatch';
import { createProductionQualityWorkflowHooks } from './productionQualityWorkflowHooks';
import { BUILTIN_STANDARD_PROFILE } from '../shared/qualityProfile';
import type { Task } from './types';
import type { QualityWorkflowHooks } from './types';
import type { QualityWorkflowRunner, StageResult } from './qualityWorkflowRunner';

const sampleTask: Task = {
  projectSlug: 'fr1-test',
  trackId: 'track-1',
  taskKey: 'T-1',
  title: 'FR-1 stage-boundary regression',
  status: 'ready',
  dependencies: [],
  updatedAt: Date.now(),
};

/**
 * Captures every Convex mutation call so the test can assert that
 * `appendStageAttempt` received `startedAt`/`finishedAt` that bracket the
 * stage's real execution window.
 */
function makeCapturingClient() {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    query: mock(async () => ({})),
    mutation: mock(async (fn: unknown, args: Record<string, unknown>) => {
      const fnSym = (fn as Record<symbol, string>)?.[Symbol.for('functionName')] ?? '';
      calls.push({ fn: fnSym, args: args ?? {} });
      // Return a placeholder id for `createPipelineRunHandler` so route tests
      // don't crash; this test does not exercise that path.
      return fnSym.includes('PipelineRun') ? 'placeholder' : undefined;
    }),
  };
  return { client, calls };
}

/**
 * Build a runner whose stages sleep for the requested milliseconds. The
 * runner honours the standard-profile skip rule (strategy is not
 * applicable for non-setup tasks) and yields measurable timing for the
 * always-applicable stages (red, green).
 */
function makeSleepingRunner(stageSleepMs: number): {
  runner: QualityWorkflowRunner;
  invocationWindows: Array<{ stage: string; start: number; end: number }>;
} {
  const invocationWindows: Array<{ stage: string; start: number; end: number }> = [];
  const runner: QualityWorkflowRunner = {
    runStage: mock(async (ctx): Promise<StageResult> => {
      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, stageSleepMs));
      const end = Date.now();
      invocationWindows.push({ stage: ctx.stage.kind, start, end });
      return {
        stageKind: ctx.stage.kind,
        status: 'passed',
        attempt: ctx.attempt ?? 1,
      };
    }),
  };
  return { runner, invocationWindows };
}

describe('runConfiguredQualityWorkflow — stage-boundary timestamps (FR-1)', () => {
  afterEach(() => {
    mock.restore();
  });

  it('persists startedAt/finishedAt that bracket each stage\'s real execution window (not a single post-run Date.now())', async () => {
    const STAGE_SLEEP_MS = 30;

    const { runner, invocationWindows } = makeSleepingRunner(STAGE_SLEEP_MS);
    const { client, calls } = makeCapturingClient();

    // Wire the production hooks so the assertions exercise the same
    // appendStageAttempt mutation the production boundary uses.
    const productionHooks = createProductionQualityWorkflowHooks();
    const hooks: QualityWorkflowHooks = {
      getEffectiveProfile: async () => BUILTIN_STANDARD_PROFILE,
      recordProfileSnapshot: productionHooks.recordProfileSnapshot ?? (async () => {}),
      runner,
      onQualityRunStart: productionHooks.onQualityRunStart,
      onStageResult: productionHooks.onStageResult,
      onQualityRunFinish: productionHooks.onQualityRunFinish,
    };

    const result = await runConfiguredQualityWorkflow(
      client as any,
      sampleTask.projectSlug,
      sampleTask,
      'run-fr1',
      '/tmp/fr1-test',
      undefined,
      hooks,
    );

    expect(result).not.toBeNull();
    expect(result!.status).toBe('passed');

    // The standard profile skips strategy (trackIsSetup: true) and runs
    // red, green, phase_acceptance. red and green both sleep STAGE_SLEEP_MS.
    const redWindow = invocationWindows.find((w) => w.stage === 'red');
    expect(redWindow).toBeDefined();
    expect(redWindow!.end - redWindow!.start).toBeGreaterThanOrEqual(STAGE_SLEEP_MS - 5);

    // Every appendStageAttempt call must carry a finishedAt > startedAt
    // that brackets the corresponding runStage invocation. At HEAD, the
    // dispatch fabricates `startedAt = finishedAt = Date.now()` AFTER the
    // whole workflow finishes, so this assertion fails.
    const appendCalls = calls.filter((c) => c.fn === 'qualityRuns:appendStageAttempt');
    expect(appendCalls.length).toBeGreaterThanOrEqual(3); // red, green, phase_acceptance

    for (const append of appendCalls) {
      const startedAt = append.args.startedAt as number;
      const finishedAt = append.args.finishedAt as number;
      expect(typeof startedAt).toBe('number');
      expect(typeof finishedAt).toBe('number');
      expect(finishedAt).toBeGreaterThanOrEqual(startedAt);

      const stageKind = append.args.stageKind as string;
      const window = invocationWindows.find((w) => w.stage === stageKind);
      if (window) {
        // The dispatched timestamps must bracket the actual runStage
        // window. finishedAt must be at or after the runStage start (we
        // bracket the entire interval); startedAt must be at or before
        // the runStage start (allowing a small slack for the dispatch
        // bookkeeping).
        expect(startedAt).toBeLessThanOrEqual(window.end + 5);
        expect(finishedAt).toBeGreaterThanOrEqual(window.start);
        if (window.end - window.start >= 5) {
          // For stages that take measurable time, finishedAt must be
          // strictly after startedAt — the failure case at HEAD.
          expect(finishedAt).toBeGreaterThan(startedAt);
        }
      }
    }

    // CRITICAL: the timestamps for a stage that slept 30ms cannot BOTH be
    // equal to a single post-run Date.now(). Assert the spread between
    // startedAt and finishedAt for the red stage is at least the sleep
    // interval (allowing a small slack for setTimeout drift).
    const redAppend = appendCalls.find((c) => c.args.stageKind === 'red');
    expect(redAppend).toBeDefined();
    const redSpread = (redAppend!.args.finishedAt as number) - (redAppend!.args.startedAt as number);
    expect(redSpread).toBeGreaterThanOrEqual(STAGE_SLEEP_MS - 5);
  });

  it('does not assign a single Date.now() to both startedAt and finishedAt for a stage that takes measurable time', async () => {
    // Redundant guard: the prior test already asserts `finishedAt >
    // startedAt`, but this one isolates the specific HEAD failure mode
    // (`startedAt = finishedAt = Date.now()` at the dispatch loop tail).
    const { runner } = makeSleepingRunner(50);
    const { client, calls } = makeCapturingClient();

    const productionHooks = createProductionQualityWorkflowHooks();
    const hooks: QualityWorkflowHooks = {
      getEffectiveProfile: async () => BUILTIN_STANDARD_PROFILE,
      recordProfileSnapshot: productionHooks.recordProfileSnapshot ?? (async () => {}),
      runner,
      onQualityRunStart: productionHooks.onQualityRunStart,
      onStageResult: productionHooks.onStageResult,
      onQualityRunFinish: productionHooks.onQualityRunFinish,
    };

    await runConfiguredQualityWorkflow(
      client as any,
      sampleTask.projectSlug,
      sampleTask,
      'run-fr1-spread',
      '/tmp/fr1-test',
      undefined,
      hooks,
    );

    const appendCalls = calls.filter((c) => c.fn === 'qualityRuns:appendStageAttempt');
    expect(appendCalls.length).toBeGreaterThanOrEqual(1);

    for (const append of appendCalls) {
      const startedAt = append.args.startedAt as number;
      const finishedAt = append.args.finishedAt as number;
      // HEAD assigns a single Date.now() to both; the assertion fails.
      // The fix threads real per-stage timing so the values differ.
      expect(startedAt === finishedAt).toBe(false);
    }
  });
});

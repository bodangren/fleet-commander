/**
 * Phase 1 Red test: `runAutoRunner()` (the CLI entrypoint) must
 * construct `AutoRunner` with a non-empty `qualityWorkflowHooks.runner`
 * so the production hot-path stops failing closed for non-none
 * quality profiles.
 *
 * Owned by Phase 1 task 1 of
 * `measure/tracks/quality_workflow_hot_path_wiring_20260618/plan.md`.
 *
 * Contract pinned by this file (per test-strategy §6 Phase 1 (b) and
 * spec AC #2):
 *
 *   1. Calling the real `runAutoRunner()` causes the real `AutoRunner`
 *      to be constructed with a `qualityWorkflowHooks` object that
 *      contains a non-empty `runner` (a `QualityWorkflowRunner`).
 *   2. The wiring is observed at the `runAllProjects` boundary so
 *      the contract survives future refactors of the AutoRunner
 *      internals.
 *
 * Red-phase state at MID start: `runAutoRunner()` constructs
 * `AutoRunner` with only `{ isEnabled, gitHooks }` and omits
 * `qualityWorkflowHooks` entirely. The mocked `runAllProjects`
 * therefore receives `qualityWorkflowHooks: undefined` and the
 * assertion `hooks.runner` to be defined fails.
 *
 * The test uses two scoped `mock.module` calls:
 *
 *   - `../convexClient` is mocked so `isContinuousModeEnabled()`
 *     (queried on every tick) returns `true` without requiring a
 *     live Convex deployment.
 *   - `./orchestrator` is mocked to capture the `runAllProjects` call
 *     args (the only observable surface through which the wiring
 *     flows from the AutoRunner to the orchestrator).
 *
 * `runAutoRunner` is the real production function. `ORCHESTRATOR_INTERVAL`
 * is set to 50 ms so the first tick fires within the test budget.
 * The `process.on('SIGINT', …)` handler is captured at registration
 * time and invoked manually to stop the loop; `process.exit` is
 * intercepted so the test process does not terminate.
 */

import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const capturedCalls: Array<{
  qualityWorkflowHooks: unknown;
  gitHooks: unknown;
}> = [];

mock.module('./orchestrator', () => ({
  runAllProjects: async (
    _config: unknown,
    _runProjectFn: unknown,
    gitHooks: unknown,
    _deferral: unknown,
    qualityWorkflowHooks: unknown,
  ) => {
    capturedCalls.push({ gitHooks, qualityWorkflowHooks });
    return [];
  },
  runProject: async () => {
    throw new Error('runProject not used in this test');
  },
}));

mock.module('../convexClient', () => ({
  createConvexClient: () => ({
    query: async () => ({ enabled: true }),
    mutation: async () => undefined,
  }),
  getConvexUrl: () => 'http://localhost:9999',
}));

const REAL_EXIT = process.exit;
const REAL_ON = process.on;
let sigintHandler: (() => void) | undefined;
let sigtermHandler: (() => void) | undefined;

process.exit = (() => {
  throw new Error('process.exit intercepted by Phase 1 test harness');
}) as never;

process.on = ((event: string, listener: unknown) => {
  if (event === 'SIGINT' && !sigintHandler) {
    sigintHandler = listener as () => void;
  }
  if (event === 'SIGTERM' && !sigtermHandler) {
    sigtermHandler = listener as () => void;
  }
  return REAL_ON.call(process, event, listener);
}) as typeof process.on;

const PREV_INTERVAL_ENV = process.env.ORCHESTRATOR_INTERVAL;
process.env.ORCHESTRATOR_INTERVAL = '0.05';

const { runAutoRunner } = await import('./autoRunner');

afterAll(() => {
  if (PREV_INTERVAL_ENV === undefined) {
    delete process.env.ORCHESTRATOR_INTERVAL;
  } else {
    process.env.ORCHESTRATOR_INTERVAL = PREV_INTERVAL_ENV;
  }
  process.exit = REAL_EXIT;
  process.on = REAL_ON;
});

describe('runAutoRunner quality workflow hot-path wiring (Phase 1 Red)', () => {
  beforeEach(() => {
    capturedCalls.length = 0;
  });

  it('forwards a non-empty qualityWorkflowHooks.runner to the orchestrator', async () => {
    // runAutoRunner is non-returning; fire-and-forget. We start it,
    // wait for at least one tick to land in the capturedCalls array,
    // then stop the loop via the captured SIGINT handler.
    const runnerPromise = runAutoRunner().catch((err: unknown) => {
      // process.exit throws inside the SIGINT handler — that is the
      // normal stop path. Anything else is a real failure.
      if (!(err instanceof Error) || !err.message.includes('process.exit')) {
        throw err;
      }
    });

    // Wait for the first tick to fire (interval is 50 ms).
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sigintHandler).toBeDefined();
    try {
      sigintHandler?.();
    } catch (err) {
      // Expected: the SIGINT handler calls process.exit(0), which we
      // intercept to throw. Swallow that throw.
      if (!(err instanceof Error) || !err.message.includes('process.exit')) {
        throw err;
      }
    }

    // Allow the SIGINT handler and any in-flight tick to settle.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await runnerPromise;

    expect(capturedCalls.length).toBeGreaterThan(0);
    const firstCall = capturedCalls[0];
    expect(firstCall).toBeDefined();
    const hooks = firstCall.qualityWorkflowHooks as
      | { runner?: { runStage: unknown } }
      | undefined;
    expect(hooks).toBeDefined();
    expect(hooks?.runner).toBeDefined();
    expect(typeof hooks?.runner?.runStage).toBe('function');
    // The unused-handler variable is referenced so the linter does
    // not flag it; we register SIGTERM as a side effect of runAutoRunner.
    expect(sigtermHandler).toBeDefined();
  });
});

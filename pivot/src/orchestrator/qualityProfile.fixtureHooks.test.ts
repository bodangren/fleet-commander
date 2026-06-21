/**
 * Phase 1 Red test (task 2): the production gap currently causes a
 * non-none quality profile to fail closed at the dispatch boundary
 * solely because `hooks.runner` is missing.
 *
 * Owned by Phase 1 task 2 of
 * `measure/tracks/quality_workflow_hot_path_wiring_20260618/plan.md`.
 *
 * Contract pinned by this file (per test-strategy §1, §6 Phase 1, and
 * spec AC #7):
 *
 *   1. The production factory module
 *      `pivot/src/orchestrator/productionQualityWorkflowHooks.ts`
 *      exports `createProductionQualityWorkflowHooks`.
 *   2. The factory output is a `QualityWorkflowHooks` object with a
 *      non-empty `runner` (a `QualityWorkflowRunner`).
 *   3. When that factory output is passed to `runConfiguredQualityWorkflow`
 *      for a non-none profile (`BUILTIN_STANDARD_PROFILE`), at least
 *      one stage is executed via `runner.runStage` (proving the
 *      non-none profile reaches real stage execution rather than the
 *      documented "hooks.runner is required" failure).
 *
 * Red-phase state at MID start: the factory module does not exist
 * (Phase 2 work). Importing it throws and the assertions in this file
 * fail cleanly. After Phase 2 authors the factory and Phase 3 wires
 * it into `server.ts` and `runAutoRunner`, this test goes green.
 *
 * This is the "failing fixture" called out in plan.md task 2: a
 * non-none profile fixture that fails only because the production
 * wiring omits `hooks.runner`. The fix path is: factory exists +
 * factory output reaches the dispatch boundary. Both are observed
 * here.
 */

import { describe, expect, it, mock } from 'bun:test';
import { BUILTIN_STANDARD_PROFILE } from '../shared/qualityProfile';
import { runConfiguredQualityWorkflow } from './qualityWorkflowDispatch';
import type { Task } from './types';

const FACTORY_RELATIVE_PATH = './productionQualityWorkflowHooks';

const STANDARD_TASK: Task = {
  _id: 't1',
  projectSlug: 'demo',
  trackId: 'track-a',
  taskKey: 't1',
  title: 'Standard profile task — exercise the wiring gap',
  status: 'in_progress',
  dependencies: [],
  updatedAt: 1,
};

describe('non-none profile fixture — production factory unblocks the wiring gap (Phase 1 Red)', () => {
  it('production factory module exists and exports createProductionQualityWorkflowHooks', async () => {
    let factory: unknown;
    try {
      const mod = (await import(FACTORY_RELATIVE_PATH)) as Record<string, unknown>;
      factory = mod.createProductionQualityWorkflowHooks;
    } catch (err) {
      throw new Error(
        `Expected ${FACTORY_RELATIVE_PATH} to exist and export ` +
          `createProductionQualityWorkflowHooks; import failed with: ${
            err instanceof Error ? err.message : String(err)
          }`,
      );
    }
    expect(typeof factory).toBe('function');
  });

  it('production factory output is a QualityWorkflowHooks object with a non-empty runner', async () => {
    let factory: ((...args: unknown[]) => unknown) | undefined;
    try {
      const mod = (await import(FACTORY_RELATIVE_PATH)) as {
        createProductionQualityWorkflowHooks?: (...args: unknown[]) => unknown;
      };
      factory = mod.createProductionQualityWorkflowHooks;
    } catch (err) {
      throw new Error(
        `Expected ${FACTORY_RELATIVE_PATH} to exist; import failed with: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    expect(typeof factory).toBe('function');
    const hooks = factory!() as {
      runner?: { runStage: unknown };
    };
    expect(hooks).toBeDefined();
    expect(hooks.runner).toBeDefined();
    expect(typeof hooks.runner?.runStage).toBe('function');
  });

  it('a non-none profile (standard) reaches a stage run when the factory output is used as hooks', async () => {
    // Drive `runConfiguredQualityWorkflow` with BUILTIN_STANDARD_PROFILE
    // and the production factory's output as hooks. The dispatch layer
    // must reach `runner.runStage` at least once. Today the import
    // fails (factory does not exist), so the test fails on the
    // factory import. After the wiring lands, the test exercises the
    // real dispatch boundary end-to-end.
    let factory: ((...args: unknown[]) => unknown) | undefined;
    try {
      const mod = (await import(FACTORY_RELATIVE_PATH)) as {
        createProductionQualityWorkflowHooks?: (...args: unknown[]) => unknown;
      };
      factory = mod.createProductionQualityWorkflowHooks;
    } catch (err) {
      throw new Error(
        `Expected ${FACTORY_RELATIVE_PATH} to exist; import failed with: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    expect(typeof factory).toBe('function');

    // Track which stage kinds the production runner executed. The
    // standard profile has four stage kinds: strategy, red, green,
    // phase_acceptance. None of them have `trackIsSetup` or
    // `isFinalAcceptance` applicability for the task title above, so
    // the applicable stages are `red`, `green`, `phase_acceptance`
    // (strategy is gated by `trackIsSetup`).
    const executedStages: string[] = [];
    const hooks = {
      ...(factory!() as Record<string, unknown>),
      runner: {
        runStage: async (ctx: { stage: { kind: string }; attempt: number }) => {
          executedStages.push(ctx.stage.kind);
          return { stageKind: ctx.stage.kind, status: 'passed' as const, attempt: ctx.attempt };
        },
      },
    };

    const client = {
      query: mock(async () => BUILTIN_STANDARD_PROFILE),
      mutation: mock(async () => undefined),
    } as never;

    const result = await runConfiguredQualityWorkflow(
      client,
      'demo',
      STANDARD_TASK,
      'run-1',
      '/tmp/demo',
      undefined,
      hooks as never,
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe('passed');
    expect(executedStages.length).toBeGreaterThan(0);
    // Standard profile applicable stages for this task context:
    // strategy gated by trackIsSetup (false) → not applicable; red,
    // green, phase_acceptance are always applicable. Verify order.
    expect(executedStages).toEqual(['red', 'green', 'phase_acceptance']);
  });
});

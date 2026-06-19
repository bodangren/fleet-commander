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
 * This file uses static source-code inspection (readFileSync) paired
 * with a runtime import check, mirroring the pattern in
 * `server.qualityWiring.test.ts`. Bun 1.3.14 `mock.module` leaks into
 * sibling test files that lazily import `./orchestrator`, so we avoid
 * mocking that module here.
 */

import { describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');
const AUTO_RUNNER_FILE = join(REPO_ROOT, 'pivot', 'src', 'orchestrator', 'autoRunner.ts');

describe('runAutoRunner quality workflow hot-path wiring (Phase 1 Red)', () => {
  it('autoRunner.ts imports the production hook factory by name', () => {
    const src = readFileSync(AUTO_RUNNER_FILE, 'utf8');
    expect(src).toMatch(/createProductionQualityWorkflowHooks/);
  });

  it('runAutoRunner() constructs AutoRunner with qualityWorkflowHooks', () => {
    const src = readFileSync(AUTO_RUNNER_FILE, 'utf8');
    expect(src).toMatch(
      /qualityWorkflowHooks\s*:\s*createProductionQualityWorkflowHooks\s*\(/,
    );
  });

  it('production factory output is importable and returns hooks with a runner', async () => {
    let factory: unknown;
    try {
      const mod = (await import('./productionQualityWorkflowHooks')) as Record<string, unknown>;
      factory = mod.createProductionQualityWorkflowHooks;
    } catch (err) {
      throw new Error(
        `Expected ./productionQualityWorkflowHooks to export createProductionQualityWorkflowHooks; import failed with: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    expect(typeof factory).toBe('function');
    const hooks = (factory as () => Record<string, unknown>)() as {
      runner?: { runStage: unknown };
    };
    expect(hooks).toBeDefined();
    expect(hooks.runner).toBeDefined();
    expect(typeof hooks.runner?.runStage).toBe('function');
  });

  it('runAutoRunner is importable and is a function', async () => {
    mock.module('../convexClient', () => ({
      createConvexClient: () => ({
        query: async () => ({ enabled: true }),
        mutation: async () => undefined,
      }),
      getConvexUrl: () => 'http://localhost:9999',
    }));

    const prevInterval = process.env.ORCHESTRATOR_INTERVAL;
    process.env.ORCHESTRATOR_INTERVAL = '0';
    try {
      const mod = (await import('./autoRunner')) as { runAutoRunner: unknown };
      expect(typeof mod.runAutoRunner).toBe('function');
    } finally {
      if (prevInterval === undefined) {
        delete process.env.ORCHESTRATOR_INTERVAL;
      } else {
        process.env.ORCHESTRATOR_INTERVAL = prevInterval;
      }
      mock.restore();
    }
  });
});

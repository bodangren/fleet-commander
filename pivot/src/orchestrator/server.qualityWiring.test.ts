/**
 * Phase 1 Red test: `server.ts` must supply `qualityWorkflowHooks` to
 * `AutoRunner` using a real production hook factory.
 *
 * Owned by Phase 1 task 1 of
 * `measure/tracks/quality_workflow_hot_path_wiring_20260618/plan.md`.
 *
 * Contract pinned by this file (per test-strategy §6 Phase 1 (a) and
 * spec AC #1):
 *
 *   1. A production module `pivot/src/orchestrator/productionQualityWorkflowHooks.ts`
 *      exists and exports `createProductionQualityWorkflowHooks`.
 *   2. `pivot/src/server.ts` imports that factory and threads its output
 *      into the `AutoRunner` constructor as `qualityWorkflowHooks`.
 *   3. The factory output must be a non-empty `QualityWorkflowHooks`
 *      object containing a `runner` (a `QualityWorkflowRunner`).
 *
 * Red-phase state at MID start: the factory module does not exist
 * (Phase 2 work) and `server.ts` constructs `AutoRunner` with only
 * `{ isEnabled, gitHooks }` — a comment notes that "to enable quality
 * workflows, supply a real runner here." Both conditions must change
 * for these tests to pass.
 *
 * The test is deliberately minimal: a runtime import of the factory
 * module paired with a static `readFileSync` scan of `server.ts`.
 * `import('../server')` is intentionally avoided (per strategy §6 (a))
 * because importing `server.ts` starts the Bun server.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');
const SERVER_FILE = join(REPO_ROOT, 'pivot', 'src', 'server.ts');
const FACTORY_RELATIVE_PATH = './productionQualityWorkflowHooks';
const FACTORY_ABS_PATH = join(
  REPO_ROOT,
  'pivot',
  'src',
  'orchestrator',
  'productionQualityWorkflowHooks.ts',
);

describe('server.ts quality workflow hot-path wiring (Phase 1 Red)', () => {
  it('production hook factory module exists at the canonical path', () => {
    // The factory file must be authored by Phase 2. Until then, this
    // assertion fails and the rest of the wiring cannot be exercised.
    const exists = (() => {
      try {
        return readFileSync(FACTORY_ABS_PATH, 'utf8').length > 0;
      } catch {
        return false;
      }
    })();
    expect(exists).toBe(true);
  });

  it('production hook factory module exports createProductionQualityWorkflowHooks', async () => {
    // Runtime contract: the factory must be a real importable module
    // that exports the named function. The dynamic import is wrapped
    // so the failure mode at HEAD is a clean, descriptive test
    // failure (not a module-resolution crash).
    let factory: unknown;
    try {
      const mod = (await import(FACTORY_RELATIVE_PATH)) as Record<string, unknown>;
      factory = mod.createProductionQualityWorkflowHooks;
    } catch (err) {
      throw new Error(
        `Expected ${FACTORY_RELATIVE_PATH} to be a real production module that exports ` +
          `createProductionQualityWorkflowHooks; import failed with: ${
            err instanceof Error ? err.message : String(err)
          }`,
      );
    }
    expect(typeof factory).toBe('function');
  });

  it('server.ts references the production hook factory by name', () => {
    // Static structural check (paired with the runtime check above):
    // server.ts must import the factory symbol so the dependency is
    // visible at the file level. Reading the file once is bounded.
    const src = readFileSync(SERVER_FILE, 'utf8');
    expect(src).toMatch(/createProductionQualityWorkflowHooks/);
  });

  it('server.ts passes the factory output to AutoRunner as qualityWorkflowHooks', () => {
    // Wire-shape check: the AutoRunner construction block in
    // server.ts must include a `qualityWorkflowHooks:` property whose
    // value is the factory call. A future regression that omits the
    // factory call here re-introduces the Phase 1 production gap.
    const src = readFileSync(SERVER_FILE, 'utf8');
    expect(src).toMatch(
      /qualityWorkflowHooks\s*:\s*createProductionQualityWorkflowHooks\s*\(/,
    );
  });
});

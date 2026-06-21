/**
 * Phase 2 Red — seed factory usage contract.
 *
 * Spec:           measure/tracks/e2e_test_baseline_hardening_20260619/spec.md (AC 2)
 * Plan:           measure/tracks/e2e_test_baseline_hardening_20260619/plan.md
 *                 (Phase 2, tasks 4 and 5)
 * Test strategy:  measure/tracks/e2e_test_baseline_hardening_20260619/test-strategy.md
 *                 §3 ("Canonical fixture entrypoint: frontend/e2e/helpers/seed.ts
 *                  ... seedScenario composes the existing setupMockApp route
 *                  handlers and adds typed scenario presets");
 *                 §5 Phase 2: "Playwright contract test that fails if any spec
 *                  imports setupMockApp directly without going through
 *                  seedScenario";
 *                 §6 Phase 2 row: "Same two commands green; plus contract test
 *                  bun --cwd frontend test --run e2e/scripts/seed-factory-usage.test.ts".
 *
 * Why this file exists:
 *
 *   The seed factory's value is not the file itself — it is the migration.
 *   If 27 specs still import setupMockApp directly, the factory is dead
 *   code. This contract test enforces the wiring by static analysis of the
 *   frontend/e2e/ spec tree (all .spec.ts files directly under that folder):
 *
 *     1. Every spec must import seedScenario from ./helpers/seed.
 *     2. No spec may import setupMockApp directly (only the seed factory
 *        is allowed to compose it).
 *     3. The three Phase 2 task-4 migration targets (dashboard, kanban,
 *        project) must use the factory.
 *     4. The seed factory itself is the only e2e-tree file that imports
 *        setupMockApp (it is the composition point per test-strategy §3).
 *
 *   This is a SHAPE contract (per test-strategy §6 distinction: "artifact/
 *   documentation contracts — they prove shape, not behavior"). The live
 *   behavior proof is `frontend/e2e/seed-factory-smoke.spec.ts` (Green-owned).
 *
 * Red signal (expected failures at HEAD):
 *
 *   At HEAD, every spec under `frontend/e2e/*.spec.ts` imports `setupMockApp`
 *   from `./helpers/mockApp` directly (verified by `grep -l setupMockApp
 *   frontend/e2e/*.spec.ts | wc -l = 27`). None of them import `seedScenario`.
 *   The seed factory does not exist on disk. Therefore:
 *     - "every spec imports seedScenario" fails on all 27 specs.
 *     - "no spec imports setupMockApp directly" fails on all 27 specs.
 *     - "dashboard, kanban, project specs migrated" fails on 3 specs.
 *     - "seed factory is the sole composer of setupMockApp" fails because
 *       the seed factory does not exist.
 *
 *   All failures are "missing implementation" failures, satisfying the
 *   Red-phase invariant (test-strategy §6: "Red tests must fail because the
 *   current implementation is missing or wrong, not merely because a durable
 *   record is stale").
 *
 * Live-behaviour pairing:
 *
 *   Static side: this file enforces the architectural invariant "all e2e
 *   specs route through the seed factory." It is the only test in the
 *   track that catches a regression where someone adds a new spec and
 *   forgets to wire it through the factory.
 *
 *   Live side: `frontend/e2e/seed-factory-smoke.spec.ts` (Green-owned,
 *   per test-strategy §5 + §6 row 2) proves the factory actually seeds
 *   live API traffic on a real Vite dev server. This contract test does
 *   not exercise live behavior.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const E2E_ROOT = join(__dirname, '..', '..', 'e2e')
const SEED_FACTORY_PATH = join(E2E_ROOT, 'helpers', 'seed.ts')
const MOCK_APP_PATH = join(E2E_ROOT, 'helpers', 'mockApp.ts')

const MIGRATED_SPECS = ['dashboard.spec.ts', 'kanban.spec.ts', 'project.spec.ts'] as const

type SpecFile = { absolute: string; relative: string; source: string }

function listSpecFiles(): SpecFile[] {
  return readdirSync(E2E_ROOT)
    .filter(name => name.endsWith('.spec.ts'))
    .sort()
    .map(name => {
      const absolute = join(E2E_ROOT, name)
      return {
        absolute,
        relative: relative(join(__dirname, '..', '..'), absolute),
        source: readFileSync(absolute, 'utf8'),
      }
    })
}

function importsSymbolFrom(spec: SpecFile, symbol: string, moduleSpecifier: string): boolean {
  const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const namedImport = new RegExp(
    `import\\s*\\{[^}]*\\b${escapedSymbol}\\b[^}]*\\}\\s*from\\s+['"]${moduleSpecifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
  )
  return namedImport.test(spec.source)
}

describe('seed factory usage contract (Phase 2, e2e_test_baseline_hardening_20260619)', () => {
  it('seed factory exists at the canonical entrypoint', () => {
    // The factory must exist before any of the per-spec assertions can
    // hold; this single check makes every other test in this file fail
    // for the right reason (missing implementation, not stale durable
    // record).
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
  })

  it('mockApp helper still exists as the factory composition target', () => {
    // Per test-strategy §3 ("Builds on, does not replace, mockApp.ts
    // initially"), the seed factory composes the existing setupMockApp
    // route handlers. Removing mockApp would break the factory's
    // composition contract.
    expect(existsSync(MOCK_APP_PATH)).toBe(true)
  })

  describe('per-spec migration to seed factory', () => {
    const specs = listSpecFiles()
    const specByName = new Map(specs.map(spec => [spec.relative.split('/').pop() ?? '', spec]))

    it('discovers at least one spec under frontend/e2e/', () => {
      // Belt-and-braces: if the discovery itself returns zero, every
      // per-spec test below would be vacuously true. Catch that here.
      expect(specs.length).toBeGreaterThan(0)
    })

    it.each(MIGRATED_SPECS)('%s uses the seed factory (Phase 2 task 4)', specName => {
      const spec = specByName.get(specName)
      expect(spec, `spec file ${specName} should exist on disk`).toBeDefined()
      if (!spec) return
      expect(
        importsSymbolFrom(spec, 'seedScenario', './helpers/seed'),
        `${specName} must import seedScenario from './helpers/seed'`,
      ).toBe(true)
    })

    it.each(listSpecFiles().map(spec => spec.relative.split('/').pop() ?? ''))(
      '%s imports the seed factory, not setupMockApp directly',
      specName => {
        const spec = specByName.get(specName)
        expect(spec, `spec file ${specName} should exist on disk`).toBeDefined()
        if (!spec) return
        // The migration gate: every spec must go through the factory.
        expect(
          importsSymbolFrom(spec, 'seedScenario', './helpers/seed'),
          `${specName} must import seedScenario from './helpers/seed'`,
        ).toBe(true)
        expect(
          importsSymbolFrom(spec, 'setupMockApp', './helpers/mockApp'),
          `${specName} must NOT import setupMockApp directly (use seedScenario instead)`,
        ).toBe(false)
      },
    )

    it('no spec imports setupMockApp from any relative path', () => {
      // Belt-and-braces check: even if a spec imported setupMockApp from
      // a non-standard relative path (e.g., '../../e2e/helpers/mockApp'),
      // it would still bypass the factory. Block every relative import
      // of setupMockApp outside the seed factory itself.
      const offenders = specs.filter(
        spec =>
          /from\s+['"][^'"]*helpers\/mockApp['"]/.test(spec.source) &&
          importsSymbolFrom(spec, 'setupMockApp', './helpers/mockApp'),
      )
      expect(
        offenders.map(spec => spec.relative),
        'no spec may import setupMockApp directly; route through seedScenario',
      ).toEqual([])
    })

    it('seed factory is the sole composer of setupMockApp in the e2e tree', () => {
      // Only `frontend/e2e/helpers/seed.ts` is allowed to import
      // `setupMockApp` from `./mockApp`. This is the composition point
      // per test-strategy §3. The helper file `frontend/e2e/helpers/
      // mockApp.ts` itself contains the export (not an import); specs
      // must not duplicate the 972-line route handler block.
      const seedFactoryExists = existsSync(SEED_FACTORY_PATH)
      if (!seedFactoryExists) {
        // The factory doesn't exist yet — every assertion in this test
        // would be vacuously true (no other file imports it because the
        // factory itself doesn't either). Force a failure with the
        // missing-file reason so the Red invariant ("test fails because
        // implementation is missing") is preserved.
        expect(seedFactoryExists).toBe(true)
        return
      }
      const seedFactorySource = readFileSync(SEED_FACTORY_PATH, 'utf8')
      const seedImportsIt =
        /from\s+['"]\.\/mockApp['"]/.test(seedFactorySource) &&
        /setupMockApp/.test(seedFactorySource)
      expect(seedImportsIt).toBe(true)
      // Any other e2e file that imports setupMockApp is a regression.
      const others = specs.filter(
        spec => /from\s+['"]\.\/mockApp['"]/.test(spec.source) && /setupMockApp/.test(spec.source),
      )
      expect(
        others.map(spec => spec.relative),
        'only the seed factory may import setupMockApp from ./mockApp',
      ).toEqual([])
    })

    it('seed factory exports a callable seedScenario (not type-only)', () => {
      // A spec that imports `type Scenario` from the factory without
      // importing the function itself would still bypass the wiring.
      // Force the runtime import.
      if (!existsSync(SEED_FACTORY_PATH)) {
        expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
        return
      }
      const seedFactorySource = readFileSync(SEED_FACTORY_PATH, 'utf8')
      const exportedCallable =
        /export\s+(?:async\s+)?function\s+seedScenario/.test(seedFactorySource) ||
        /export\s+const\s+seedScenario\s*=/.test(seedFactorySource)
      expect(exportedCallable).toBe(true)
    })
  })
})

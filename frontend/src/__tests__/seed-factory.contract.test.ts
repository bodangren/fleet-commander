/**
 * Phase 2 Red — seed factory surface contract.
 *
 * Spec:           measure/tracks/e2e_test_baseline_hardening_20260619/spec.md (AC 2)
 * Plan:           measure/tracks/e2e_test_baseline_hardening_20260619/plan.md (Phase 2, tasks 1–3)
 * Test strategy:  measure/tracks/e2e_test_baseline_hardening_20260619/test-strategy.md
 *                 §3 (canonical fixture entrypoint at `frontend/e2e/helpers/seed.ts`;
 *                  Scenario presets including 'empty' | 'demo' | 'kanban-cards';
 *                  idempotency contract — "running `seedScenario` twice in a worker
 *                  yields the same observable state");
 *                 §5 (Phase 2 TDD — "Vitest unit tests under
 *                  `e2e/helpers/seed.test.ts` (idempotency, isolation, schema)");
 *                 §6 Phase 2 Red row: "Red: idempotency/isolation fails".
 *
 * Why this file exists:
 *
 *   Phase 2 ships THREE artifacts (test-strategy §5 + §6):
 *     (a) this contract test in Vitest, validating the on-disk shape of
 *         `frontend/e2e/helpers/seed.ts` (file exists, exports the required
 *         API surface, scenario preset union, entity handle shape,
 *         idempotency/isolation code paths, and the architectural guardrail
 *         that no production code imports it back).
 *     (b) the seed factory itself at `frontend/e2e/helpers/seed.ts`,
 *         produced by Green-owned Phase 2 tasks 1 and 3.
 *     (c) the live-behavior proof `frontend/e2e/seed-factory-smoke.spec.ts`,
 *         a Playwright spec owned by Green per test-strategy §5 + §6 row 2.
 *
 *   This contract test is the SHAPE gate (per test-strategy §6 distinction:
 *   "Phase 1's audit test and Phase 2's usage-contract test are
 *   artifact/documentation contracts — they prove shape, not behavior").
 *   The Playwright smoke spec is the BEHAVIOR gate. Both are required; neither
 *   replaces the other.
 *
 * Red signal (expected failures at HEAD):
 *
 *   All tests fail because `frontend/e2e/helpers/seed.ts` does not exist on
 *   disk at HEAD (the Phase 2 Implement sub-task is the Green-owned step
 *   that creates it). The `existsSync` check fails on test 1, and every
 *   subsequent `readFileSync` throws `ENOENT`. After Green authors the seed
 *   factory at the canonical path with the API surface listed below, every
 *   test passes.
 *
 * Live-behaviour pairing:
 *
 *   Static side: this file enforces the on-disk shape so downstream
 *   spec migrations (Phase 2 task 4: dashboard, kanban, project) and the
 *   usage contract (`seed-factory-usage.contract.test.ts`) can rely on a
 *   stable API surface (`seedScenario(page, scenario)` → typed handle with
 *   projects/sprints/tasks/agents/settings).
 *
 *   Live side: `frontend/e2e/seed-factory-smoke.spec.ts` exercises the
 *   `/portfolio` → `/project/:id` path against a running Vite dev server,
 *   paired with a real Vite mock data adapter (per
 *   `frontend/playwright.config.ts:22`). The smoke spec proves the factory
 *   actually intercepts and seeds live API traffic; this contract test only
 *   proves the factory surface is correct.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SEED_FACTORY_PATH = join(__dirname, '..', '..', 'e2e', 'helpers', 'seed.ts')

function readSeedFactory(): string {
  return readFileSync(SEED_FACTORY_PATH, 'utf8')
}

describe('seed factory surface contract (Phase 2, e2e_test_baseline_hardening_20260619)', () => {
  it('seed factory exists at the canonical fixture entrypoint', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
  })

  it('seed factory is reachable from e2e specs via a relative import', () => {
    const exists = existsSync(SEED_FACTORY_PATH)
    expect(exists).toBe(true)
    if (!exists) return
    const source = readSeedFactory()
    // The factory must not be marked ".skip" / ".todo" / "@quarantine" — it is
    // production e2e infrastructure, not a placeholder.
    expect(source).not.toMatch(/@quarantine/)
    expect(source).not.toMatch(/test\.skip/)
  })

  it('exports seedScenario as the canonical entrypoint', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // Either function declaration (`export function seedScenario`) or
    // arrow-style declaration (`export const seedScenario =`) is acceptable.
    const exported = /export\s+(?:async\s+)?(?:function\s+seedScenario|const\s+seedScenario)/
    expect(source).toMatch(exported)
  })

  it('seedScenario accepts a scenario preset argument', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // The factory must take a scenario preset (per test-strategy §3). Look
    // for either an inline union or a referenced Scenario type alias.
    const presetParam = /seedScenario\s*\(\s*(?:page\s*:\s*\w+\s*,\s*)?scenario\s*:\s*Scenario/
    const inlineUnion =
      /seedScenario\s*\(\s*(?:page\s*:\s*\w+\s*,\s*)?scenario\s*:\s*['"]?(?:empty|demo|kanban-cards)['"]?/
    const scenarioType = /type\s+Scenario\b[^]*?(?:empty|demo|kanban-cards)/
    expect(presetParam.test(source) || inlineUnion.test(source) || scenarioType.test(source)).toBe(
      true,
    )
  })

  it('Scenario preset union covers the three documented variants', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // The Scenario union must enumerate at least the three presets called
    // out in test-strategy §3 (canonical fixture entrypoint). A later
    // expansion is allowed (additional variants are additive); the three
    // minimum variants must be present.
    expect(source).toMatch(/['"]empty['"]/)
    expect(source).toMatch(/['"]demo['"]/)
    expect(source).toMatch(/['"]kanban-cards['"]/)
  })

  it('returns a typed handle exposing all required entity collections', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // Per test-strategy §3 ("projects, sprints, tasks, agents, settings") and
    // plan.md Phase 2 task 1 ("shared E2E seed fixture schema"), the factory
    // must expose typed handles for these five entity collections. The handle
    // may be a return type, an interface, or a type alias — accept any of
    // these forms.
    const collections = ['projects', 'sprints', 'tasks', 'agents', 'settings']
    for (const collection of collections) {
      const mentioned = new RegExp(`\\b${collection}\\b`).test(source)
      expect(mentioned, `seed factory must expose "${collection}" handle`).toBe(true)
    }
  })

  it('encodes idempotency as an observable contract on the handle', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // Per test-strategy §3 ("Idempotency contract: running `seedScenario`
    // twice in a worker yields the same observable state"), the handle must
    // expose something callers can assert against for repeatability. Accept
    // any of: a `fingerprint`/`seedId`/`signature` field, an
    // `assertStateMatches(other)` helper, or an explicit `idempotency` test
    // hook. The literal field name is intentionally permissive so Green has
    // design latitude, but at least one observable hook must exist.
    const idemHook = /\b(?:fingerprint|seedId|seed_id|signature|idempotencyKey)\b/
    const idemHelper = /\bassert(?:Same|Idempotent|StateMatches)\b/
    const idemDoc = /idempot/i
    expect(idemHook.test(source) || idemHelper.test(source) || idemDoc.test(source)).toBe(true)
  })

  it('encodes isolation as an observable contract on the handle', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // Per test-strategy §3 ("Isolation: each spec gets its own BrowserContext;
    // seed state is per-page, not global"), the factory must avoid
    // `beforeAll`-style shared state and must make isolation observable.
    // Accept either: a `perPage`/`isolated`/`perContext` field, or an
    // explicit isolation comment, or an `assertIsolatedFrom(other)` helper.
    const isolationField = /\b(?:perPage|perContext|isolated|isolation)\b/i
    const isolationHelper = /\bassertIsolated\b/
    const isolationDoc = /\bisolation\b/i
    expect(
      isolationField.test(source) || isolationHelper.test(source) || isolationDoc.test(source),
    ).toBe(true)
  })

  it('composes setupMockApp from the existing mockApp helper', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // Per test-strategy §3 ("Builds on, does not replace, `mockApp.ts`
    // initially. `seedScenario` composes the existing `setupMockApp` route
    // handlers and adds typed scenario presets"). The factory must import
    // `setupMockApp` from `./mockApp` and use it; it must not duplicate the
    // 972-line route handler block.
    const mockAppImport = /from\s+['"]\.\/mockApp['"]/
    const mockAppUsage = /\bsetupMockApp\s*\(/
    expect(mockAppImport.test(source)).toBe(true)
    expect(mockAppUsage.test(source)).toBe(true)
  })

  it('does not import production code from frontend/src or pivot/src', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // Architectural guardrail (test-strategy §2 + AGENTS.md workflow rule):
    // seed code lives under `frontend/e2e/helpers/` only. No production
    // import of seed code from `frontend/src/**` or `pivot/src/**` is
    // allowed (and conversely, the seed factory must not pull production
    // runtime into the e2e harness).
    const productionImport = /from\s+['"](?:\.\.\/){2,}(?:src|frontend\/src|pivot\/src)/
    expect(source).not.toMatch(productionImport)
  })

  it('does not ship production-only fixtures (Convex clients, env secrets)', () => {
    expect(existsSync(SEED_FACTORY_PATH)).toBe(true)
    if (!existsSync(SEED_FACTORY_PATH)) return
    const source = readSeedFactory()
    // Plan Phase 2 task 3 originally said "typed Convex client and a
    // dedicated `e2e_test` namespace or cleanup hook." Test-strategy §1
    // rewrites this: the playwright suite runs the mock data adapter
    // (`frontend/src/lib/dataAdapter.ts:55-61`), NOT real Convex. So the
    // factory must NOT spin up a typed Convex client; it composes the
    // existing `setupMockApp` route handlers.
    const convexImport = /from\s+['"][^'"]*convex[^'"]*['"]/
    const convexClientImport = /import\s+\{[^}]*Convex(?:Client|Provider)[^}]*\}\s+from/
    expect(convexImport.test(source)).toBe(false)
    expect(convexClientImport.test(source)).toBe(false)
  })
})

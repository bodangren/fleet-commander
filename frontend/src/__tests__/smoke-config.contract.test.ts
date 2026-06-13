/**
 * Phase S8 Red — contract test for the Kimi WebBridge smoke pass config.
 *
 * Spec:           measure/tracks/route_fixes_regression_20260613/spec.md (STORY-R8)
 * Plan:           measure/tracks/route_fixes_regression_20260613/plan.md (Phase S8)
 * Test strategy:  measure/tracks/route_fixes_regression_20260613/test-strategy.md
 *                 (§5: "contract test in Vitest validating smoke-config.json shape
 *                  — route count = 38, workflow count = 12, every route has
 *                  expectedComponent"; §7: targeted Red command
 *                  `bun --cwd frontend test smoke-config`)
 *
 * Why this file exists:
 *
 *   Phase S8 ships TWO artifacts (test-strategy §5 + §7):
 *     (a) this contract test in Vitest, validating the on-disk shape of
 *         `measure/tracks/<track>/scripts/smoke-config.json`.
 *     (b) a live runner `scripts/smoke-pass.ts` (Green-role Implement
 *         sub-task) that drives a real Kimi WebBridge pass against the
 *         running dev stack and emits `smoke-results.json` +
 *         `coverage-report.md`.
 *
 *   The two gates are paired (test-strategy §4 "fake-harness policy" + §7
 *   "live-proof plan"): the contract test alone cannot prove live routing
 *   works, and the live runner alone cannot prove the config shape matches
 *   the spec. Both are required; neither replaces the other.
 *
 * Red signal (expected failures at HEAD):
 *
 *   All 10 tests fail because `smoke-config.json` does not exist on disk
 *   at HEAD (the Phase S8 Implement sub-task is the Green-owned step that
 *   creates it). The `existsSync` check fails on test 1, and every
 *   subsequent `readFileSync` throws `ENOENT`. After Green creates the
 *   file with the spec-pinned shape (38 routes × `expectedComponent`,
 *   12 workflows named after the previous QA pass, pass criteria
 *   `routeCoveragePercent=100` / `maxCriticalFindings=0`), every test
 *   passes.
 *
 * Live-behaviour pairing:
 *
 *   Static side: this file enforces the on-disk shape so the live runner
 *   can read a known schema (38 routes × `path|expectedComponent`,
 *   12 workflows × `name|steps|expectedOutcome`).
 *
 *   Live side: Phase S8's "Generate Docs & Doctor" sub-task invokes
 *   `bun run measure/tracks/<track>/scripts/smoke-pass.ts` against the
 *   running `npm run dev` stack via Kimi WebBridge. The live runner
 *   dereferences `route.path` and `route.expectedComponent` from this
 *   config; if either field is missing or malformed, the live runner
 *   crashes on first route. The live runner emits `smoke-results.json`
 *   + `coverage-report.md`; the closeout gate is `coverage-report.md`
 *   showing 38/38 routes covered, 0 Critical findings.
 *
 * Anchoring (route + workflow sources, frozen for traceability):
 *
 *   - 38 routes: `frontend/src/router.tsx` (live `grep -c '{ path:' +
 *     'index:'` count, mirroring `router-inventory.test.ts:42–51`).
 *     Also matches `measure/archive/e2e_qa_smoke_20260613/route-inventory.json`
 *     `totals.routes` field (38).
 *   - 12 workflows: `measure/archive/e2e_qa_smoke_20260613/coverage-report.md`
 *     "Workflow Test Results" table (12 rows: Create agent, Search projects,
 *     Filter by status, Import project (Scan), Start New Sprint, Sprint
 *     Recalculate, Dashboard metrics, Settings save, Back button, Wildcard
 *     route, Blockers filters, Retrospective generate).
 *   - R1–R6 fix-anchored route subset (test 6): the routes the previous
 *     QA pass flagged as Critical/High findings (Q-FIND-001/004/005/006)
 *     and the routes whose regression guards already shipped in S1–S6.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../..')
const SMOKE_CONFIG_PATH = join(
  REPO_ROOT,
  'measure/tracks/route_fixes_regression_20260613/scripts/smoke-config.json',
)
const ROUTER_TSX = join(REPO_ROOT, 'frontend/src/router.tsx')

/** Expected route count, pinned to both `router.tsx` and the previous QA inventory. */
const EXPECTED_ROUTE_COUNT = 38

/** Expected workflow count, pinned to the previous QA `coverage-report.md`. */
const EXPECTED_WORKFLOW_COUNT = 12

/**
 * The 12 specific workflow names from
 * `measure/archive/e2e_qa_smoke_20260613/coverage-report.md`. Frozen here so
 * a future GREEN cannot satisfy the count contract with arbitrary names
 * (e.g. `[ "workflow-1", "workflow-2", ... ]`).
 */
const EXPECTED_WORKFLOW_NAMES = [
  'Create agent',
  'Search projects',
  'Filter by status',
  'Import project (Scan)',
  'Start New Sprint',
  'Sprint Recalculate',
  'Dashboard metrics',
  'Settings save',
  'Back button',
  'Wildcard route',
  'Blockers filters',
  'Retrospective generate',
] as const

/**
 * Routes that anchor the R1–R6 fixes. The smoke pass MUST include these so
 * the previous QA pass's Critical/High findings are re-exercised on every
 * smoke run. Anchored to plan.md Phase S8 "Special checks" bullet and
 * spec.md STORY-R1/R3/R4/R5 acceptance criteria.
 */
const R1_THROUGH_R6_FIX_ANCHORED_PATHS = [
  'history/agents', // R1 + R7: Convex API path mismatch fix
  'history/sprints', // R1 + R7: Convex API path mismatch fix
  'history/tasks', // R1 + R5 + R7: API path + redirect fix
  'harnesses', // R4: HarnessesPage redirect fix
  'settings', // R3: /settings index redirect fix
  'agents', // R2/R6 context: New Project header + agent form validation
] as const

/**
 * Live `grep -c '{ path:' + 'index:' frontend/src/router.tsx` for the
 * route-count contract. Mirrors `router-inventory.test.ts:42–51`. Anchors
 * the route count to the live router source, not just a spec-pinned constant
 * — if a future change adds a 39th route to router.tsx, this test fails
 * on test 3 and forces a deliberate update to the spec + smoke-config.
 */
function liveRouterRouteCount(): number {
  const pathCount = Number(
    execFileSync('grep', ['-c', '{ path:', ROUTER_TSX], { encoding: 'utf8' }).trim(),
  )
  const indexCount = Number(
    execFileSync('grep', ['-c', 'index:', ROUTER_TSX], { encoding: 'utf8' }).trim(),
  )
  return pathCount + indexCount
}

/**
 * Predicate guarding the minimum shape of a smoke-config route entry.
 * Runtime guard because TypeScript types are erased before Vitest runs.
 */
interface SmokeConfigRoute {
  path: string
  expectedComponent: string
}

interface SmokeConfigWorkflow {
  name: string
}

interface SmokeConfigCriteria {
  routeCoveragePercent: number
  maxCriticalFindings: number
}

interface SmokeConfig {
  routes: SmokeConfigRoute[]
  workflows: SmokeConfigWorkflow[]
  passCriteria: SmokeConfigCriteria
}

function readSmokeConfig(): SmokeConfig {
  const raw = readFileSync(SMOKE_CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as SmokeConfig
}

describe('Phase S8 smoke-config.json contract — STORY-R8', () => {
  it('smoke-config.json exists on disk at the track scripts/ directory', () => {
    // Red signal at HEAD: smoke-config.json does not exist yet (Phase S8
    // Implement sub-task is Green-owned). After GREEN creates the file,
    // this assertion passes.
    expect(existsSync(SMOKE_CONFIG_PATH)).toBe(true)
  })

  it('smoke-config.json parses as JSON with `routes`, `workflows`, and `passCriteria` keys', () => {
    const config = readSmokeConfig()
    expect(Array.isArray(config.routes)).toBe(true)
    expect(Array.isArray(config.workflows)).toBe(true)
    expect(typeof config.passCriteria).toBe('object')
    expect(config.passCriteria).not.toBeNull()
  })

  it(`routes array contains exactly ${EXPECTED_ROUTE_COUNT} entries (matches live router.tsx route count)`, () => {
    const config = readSmokeConfig()
    const liveCount = liveRouterRouteCount()
    // Pair the live router count with the config count so a future
    // router.tsx change (39th route added) forces a deliberate smoke-config
    // update — not a silent drift between the two sources of truth.
    expect({ liveCount, configCount: config.routes.length }).toEqual({
      liveCount: EXPECTED_ROUTE_COUNT,
      configCount: EXPECTED_ROUTE_COUNT,
    })
  })

  it('every route entry has a non-empty `path` string', () => {
    const config = readSmokeConfig()
    const offenders = config.routes
      .map((route, index) => ({ index, route }))
      .filter(({ route }) => typeof route.path !== 'string' || route.path.length === 0)
      .map(({ index, route }) => ({ index, actualPath: route.path }))
    expect(offenders).toEqual([])
  })

  it('every route entry has a non-empty `expectedComponent` string (spec AC)', () => {
    // Spec AC §"STORY-R8" + plan Phase S8 "Test" sub-task: "Each route has
    // an expected component name." Closes the "missing-expectedComponent
    // placeholder" cheat path.
    const config = readSmokeConfig()
    const offenders = config.routes
      .map((route, index) => ({ index, route }))
      .filter(
        ({ route }) =>
          typeof route.expectedComponent !== 'string' ||
          route.expectedComponent.length === 0,
      )
      .map(({ index, route }) => ({ index, path: route.path, actual: route.expectedComponent }))
    expect(offenders).toEqual([])
  })

  it('routes contains the six R1–R6 fix-anchored paths', () => {
    // Closes the "synthetic placeholder routes" cheat path: a GREEN that
    // emits 38 routes named `route-1` … `route-38` would satisfy the count
    // contract but skip the routes the previous QA pass flagged as
    // Critical/High findings. Anchoring to literal path strings forces the
    // smoke-config to include the routes that R1–R6 fixed.
    const config = readSmokeConfig()
    const configPaths = new Set(config.routes.map((route) => route.path))
    const missing = R1_THROUGH_R6_FIX_ANCHORED_PATHS.filter((path) => !configPaths.has(path))
    expect(missing).toEqual([])
  })

  it(`workflows array contains exactly ${EXPECTED_WORKFLOW_COUNT} entries (matches previous QA coverage-report.md)`, () => {
    const config = readSmokeConfig()
    expect(config.workflows.length).toBe(EXPECTED_WORKFLOW_COUNT)
  })

  it('every workflow entry has a non-empty `name` string', () => {
    const config = readSmokeConfig()
    const offenders = config.workflows
      .map((workflow, index) => ({ index, workflow }))
      .filter(
        ({ workflow }) =>
          typeof workflow.name !== 'string' || workflow.name.length === 0,
      )
      .map(({ index, workflow }) => ({ index, actualName: workflow.name }))
    expect(offenders).toEqual([])
  })

  it('workflows contains the 12 specific names from the previous QA coverage report', () => {
    // Closes the "any 12 names" cheat path: a GREEN that emits
    // `[{name:"workflow-1"}, ...]` would satisfy the count contract but
    // not exercise the actual user journeys the previous QA pass measured.
    // Anchoring to literal names forces the smoke-config to inherit the
    // exact workflow set from `measure/archive/e2e_qa_smoke_20260613/
    // coverage-report.md` "Workflow Test Results" table.
    const config = readSmokeConfig()
    const configNames = new Set(config.workflows.map((workflow) => workflow.name))
    const missing = EXPECTED_WORKFLOW_NAMES.filter((name) => !configNames.has(name))
    expect(missing).toEqual([])
  })

  it('passCriteria pins `routeCoveragePercent === 100` and `maxCriticalFindings === 0` (spec AC closing criteria)', () => {
    // Spec AC §"STORY-R8" closing bullet: "Given the smoke pass completes,
    // When the coverage report is generated, Then `coverage-report.md` shows
    // 100% route coverage with 0 Critical findings." Pinning the pass
    // criteria in the config makes the live runner's success gate
    // declarative, not hard-coded in `smoke-pass.ts`.
    const config = readSmokeConfig()
    expect(config.passCriteria.routeCoveragePercent).toBe(100)
    expect(config.passCriteria.maxCriticalFindings).toBe(0)
  })
})

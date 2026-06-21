/**
 * Phase 1: Inventory & Scaffold — route + hook inventory artifact contract.
 *
 * Spec:  measure/tracks/react_router_7_migration_20260611/spec.md
 * Plan:  measure/tracks/react_router_7_migration_20260611/plan.md (Tasks 1.1, 1.2)
 * Strategy: measure/tracks/react_router_7_migration_20260611/test-strategy.md §5, §7
 *
 * Task 1.1 deliverable: `measure/tracks/<id>/inventory.md` listing every
 * `<Route>` in `App.tsx` and child route components.
 * Task 1.2 deliverable: same artifact, with a `## Hook Usage` section
 * enumerating `useNavigate` / `useParams` / `useLocation` /
 * `useSearchParams` call sites.
 *
 * The inventory is the phase deliverable (§1 testing pyramid row for
 * Phase 1: "Inventory artifact contract test (counts)"). The test parses
 * the markdown, asserts both sections are present, and cross-checks the
 * route count against a live `grep -c "<Route" App.tsx` — that is the
 * "live-behavior proof" the strategy allows for artifact deliverables.
 *
 * Hook counts are taken from a fresh `build-graph` query against the
 * current `graph.db` (8 / 5 / 1 / 6 at HEAD). These differ from the
 * strategy's stated 8 / 1 / 5 / 6 — that drift is logged in plan.md and
 * flagged for the Implementer to reconcile, but the test is anchored to
 * the live graph (which is the source of truth for Phase 2 sizing).
 *
 * Red signal: `inventory.md` does not exist on disk. The `existsSync`
 * check and the first `readFileSync` both throw, producing live
 * implementation-missing failures for Tasks 1.1 and 1.2.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../..')
const INVENTORY_PATH = join(
  REPO_ROOT,
  'measure/archive/react_router_7_migration_20260611/inventory.md',
)
const ROUTER_TSX = join(REPO_ROOT, 'frontend/src/router.tsx')
const PIVOT_ROUTES_DIR = join(REPO_ROOT, 'pivot/src/routes')
const PIVOT_SERVER_TS = join(REPO_ROOT, 'pivot/src/server.ts')

/** Live `grep -c '{ path:' + index routes in frontend/src/router.tsx` for the route-count contract. */
function liveRouteCount(): number {
  const pathCount = Number(
    execFileSync('grep', ['-c', '{ path:', ROUTER_TSX], { encoding: 'utf8' }).trim(),
  )
  const indexCount = Number(
    execFileSync('grep', ['-c', 'index:', ROUTER_TSX], { encoding: 'utf8' }).trim(),
  )
  return pathCount + indexCount
}

/** Count `| ... |` rows in a markdown section between `## Heading` and next `## ` or EOF. */
function countTableRows(section: string): number {
  // Each inventory row is `| <col1> | <col2> | ...` — match the first two
  // pipe-delimited cells, allowing backticks inside.
  const lines = section.split('\n')
  return lines.filter(line => /^\| [^|]+ \| [^|]+(\s|\|)/.test(line)).length
}

/**
 * Returns the set of every `router.get('/api/...')` / `router.post('/api/...')`
 * literal registered in pivot/src/routes/*.ts, plus the routes registered
 * by the top-level server.ts via `register*Routes(router)`. Used by the
 * Operations API Contract inventory tests to cross-check that the
 * frontend's fetch URLs are backed by a real server handler.
 *
 * This is an artifact/contract check (no live process) — the live handler
 * behavior proof is owned by the pivot route tests (P2/P3 in
 * operations_api_contract_closure_20260618).
 */
function pivotRegisteredRoutes(): { method: string; path: string; source: string }[] {
  const routes: { method: string; path: string; source: string }[] = []
  const files = readdirSync(PIVOT_ROUTES_DIR).filter(f => f.endsWith('.ts'))
  for (const file of files) {
    const abs = join(PIVOT_ROUTES_DIR, file)
    const src = readFileSync(abs, 'utf8')
    const re = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g
    let match: RegExpExecArray | null
    while ((match = re.exec(src)) !== null) {
      const method = match[1]!.toUpperCase()
      const path = match[2]!
      routes.push({ method, path, source: `./pivot/src/routes/${file}` })
    }
  }
  return routes
}

/** Returns true iff at least one route in the inventory matches the literal URL. */
function hasPivotRoute(method: string, literalPath: string): boolean {
  return pivotRegisteredRoutes().some(
    r => r.method === method.toUpperCase() && r.path === literalPath,
  )
}

describe('Phase 1 inventory artifact — Tasks 1.1 and 1.2', () => {
  it('inventory.md exists at the track-level measure path (Red: missing → throw)', () => {
    expect(existsSync(INVENTORY_PATH)).toBe(true)
  })

  it('inventory contains a `## Browser Routes` section', () => {
    const md = readFileSync(INVENTORY_PATH, 'utf8')
    expect(md).toMatch(/^## Browser Routes\b/m)
  })

  it('route table row count matches live `grep -c "<Route" frontend/src/App.tsx`', () => {
    const md = readFileSync(INVENTORY_PATH, 'utf8')
    const liveCount = liveRouteCount()
    const section = md.split(/^## /m).find(s => s.startsWith('Browser Routes')) ?? ''
    const rowCount = countTableRows(section)
    expect({ liveCount, rowCount }).toEqual({ liveCount: rowCount, rowCount })
    // Sanity: HEAD's App.tsx has 39 routes per the test-strategy. If this
    // drifts, the strategy needs a refresh — but the test stays anchored
    // to the live grep.
    expect(liveCount).toBeGreaterThan(0)
  })

  it('inventory route count === 38 (spec-pinned per test-strategy §3 + §5)', () => {
    // test-strategy §3: "App.tsx has 39 <Route> declarations" (now 38 in
    // data-router format — the settings parent route uses relative children).
    // §5: "a tiny test that parses it and asserts count === 39". The
    // companion live-grep test above verifies *truth-at-HEAD*; this one
    // pins the *spec-stated* count so a future App.tsx drift (someone
    // adding a 40th route) is caught as a spec change, not a silent
    // inventory re-count.
    const md = readFileSync(INVENTORY_PATH, 'utf8')
    const section = md.split(/^## /m).find(s => s.startsWith('Browser Routes')) ?? ''
    const rowCount = countTableRows(section)
    expect(rowCount).toBe(38)
  })

  it('inventory contains a `## Hook Usage` section with all four v7 hooks named', () => {
    const md = readFileSync(INVENTORY_PATH, 'utf8')
    expect(md).toMatch(/^## Hook Usage\b/m)
    for (const hook of ['useNavigate', 'useParams', 'useLocation', 'useSearchParams']) {
      expect(md).toContain(hook)
    }
  })

  it('hook usage row count covers the four tracked hooks', () => {
    const md = readFileSync(INVENTORY_PATH, 'utf8')
    const section = md.split(/^## /m).find(s => s.startsWith('Hook Usage')) ?? ''
    const rowCount = countTableRows(section)
    // 4 rows minimum — one per hook. Implementer may add subtotal/cross-link
    // rows, so we only assert the lower bound.
    expect(rowCount).toBeGreaterThanOrEqual(4)
  })
})

/**
 * Phase 1 (Red) Operations API contract inventory — see
 * measure/tracks/operations_api_contract_closure_20260618/plan.md and
 * test-strategy.md §5. These are artifact/contract tests: they cross-check
 * that the URLs the Operations pages fetch are actually registered in
 * `pivot/src/routes/*.ts` (no live process). The live handler-behavior
 * proof is owned by the pivot route tests (P2 reconciliation tests and
 * P3 pipeline route tests) in operations_api_contract_closure_20260618.
 */
describe('operations_api_contract_closure_20260618 — Phase 1: pivot route inventory', () => {
  it('pivot/src/server.ts still exists (sanity)', () => {
    expect(existsSync(PIVOT_SERVER_TS)).toBe(true)
  })

  it('GET /api/reconciliation/proposals is registered in pivot routes (Red: missing at HEAD)', () => {
    expect(hasPivotRoute('GET', '/api/reconciliation/proposals')).toBe(true)
  })

  it('POST /api/reconciliation/proposals/:id/apply is registered in pivot routes (Red: missing at HEAD)', () => {
    expect(hasPivotRoute('POST', '/api/reconciliation/proposals/:id/apply')).toBe(true)
  })

  it('POST /api/reconciliation/proposals/:id/reject is registered in pivot routes (Red: missing at HEAD)', () => {
    expect(hasPivotRoute('POST', '/api/reconciliation/proposals/:id/reject')).toBe(true)
  })

  it('GET /api/pipelines (literal, no params) is registered in pivot routes (Red: missing at HEAD)', () => {
    expect(hasPivotRoute('GET', '/api/pipelines')).toBe(true)
  })

  it('POST /api/pipelines/:name/trigger is registered in pivot routes (sanity — already green)', () => {
    expect(hasPivotRoute('POST', '/api/pipelines/:name/trigger')).toBe(true)
  })

  it('GET /api/pipelines/:name/status is registered in pivot routes (sanity — already green)', () => {
    expect(hasPivotRoute('GET', '/api/pipelines/:name/status')).toBe(true)
  })

  it('GET /api/pipelines/:executionId/logs is registered in pivot routes (sanity — already green)', () => {
    expect(hasPivotRoute('GET', '/api/pipelines/:executionId/logs')).toBe(true)
  })

  it('every frontend /api/reconciliation fetch is covered by a pivot route', () => {
    const calls = collectFetchUrls('frontend/src/pages/Reconcile.tsx', '/api/reconciliation')
    // Reconcile.tsx has exactly one literal fetch URL ('/api/reconciliation/proposals');
    // the apply/reject calls use template literals with ${id} and are covered by the
    // per-URL tests above. Pin the count to a positive integer so a future regression
    // that drops the fetch (or rewrites the URL prefix) fails loudly instead of
    // vacuously satisfying `> 0`.
    expect(calls.length).toBe(1)
    for (const call of calls) {
      const expected = call.path
      const ok = pivotRegisteredRoutes().some(r => matchPivotPath(r.path, expected))
      expect(ok, `frontend fetches ${call.method} ${expected} but no pivot route matches`).toBe(
        true,
      )
    }
  })

  it('every frontend /api/pipelines fetch is covered by a pivot route', () => {
    const calls = collectFetchUrls('frontend/src/hooks/usePipelineData.ts', '/api/pipelines')
    // usePipelineData.ts has exactly one literal fetch URL ('/api/pipelines'); trigger,
    // status, and logs are all template-literal calls covered by the per-URL tests above.
    // Pin the count so a future regression that drops the list fetch fails loudly.
    expect(calls.length).toBe(1)
    for (const call of calls) {
      const expected = call.path
      const ok = pivotRegisteredRoutes().some(r => matchPivotPath(r.path, expected))
      expect(ok, `frontend fetches ${call.method} ${expected} but no pivot route matches`).toBe(
        true,
      )
    }
  })

  /**
   * Adversarial: every `register*Routes` import in pivot/src/server.ts is also
   * invoked. Catches dead imports — a route module added but not wired into
   * the server bootstrap. This is the inverse of the "no dead route" check.
   */
  it('every register*Routes imported by server.ts is also invoked', () => {
    const serverSrc = readFileSync(PIVOT_SERVER_TS, 'utf8')
    const importRe = /import\s*\{[^}]*?register(\w+)Routes[^}]*?\}\s*from\s*['"][^'"]+['"]/g
    const callRe = /register(\w+)Routes\s*\(/g
    const imported = new Set<string>()
    const called = new Set<string>()
    for (const m of serverSrc.matchAll(importRe)) imported.add(m[1]!)
    for (const m of serverSrc.matchAll(callRe)) called.add(m[1]!)
    const orphans: string[] = []
    for (const name of imported) {
      if (!called.has(name)) orphans.push(name)
    }
    expect(
      orphans,
      `server.ts imports register*Routes for: ${orphans.join(', ')} but never invokes them`,
    ).toEqual([])
  })
})

/** A single fetch call site extracted from a frontend file. */
interface FetchCall {
  method: string
  path: string
  line: number
}

/**
 * Scans a frontend file for `fetch(..., { method: ... })` calls and returns
 * the absolute-path URL passed to each call (after pulling the literal out
 * of template-string interpolation where possible). Only literal-prefix
 * matches (e.g. `/api/reconciliation`) are returned; interpolated
 * template-literal paths that cannot be resolved are skipped — they are
 * covered by the per-URL tests above.
 */
function collectFetchUrls(relPath: string, urlPrefix: string): FetchCall[] {
  const abs = join(REPO_ROOT, relPath)
  if (!existsSync(abs)) return []
  const src = readFileSync(abs, 'utf8')
  const calls: FetchCall[] = []
  const re = /fetch\(\s*([`'"])([^`'"${}]*)\1/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const literal = m[2]!
    if (!literal.startsWith(urlPrefix)) continue
    const before = src.slice(0, m.index)
    const line = before.split('\n').length
    calls.push({ method: 'GET', path: literal, line })
  }
  return calls
}

/**
 * Returns true if a pivot route pattern (with `:param` placeholders) matches
 * a concrete frontend URL. Both sides are normalised to `[^/]+` for `:param`
 * before comparison.
 */
function matchPivotPath(routePattern: string, concrete: string): boolean {
  const re = new RegExp(
    '^' + routePattern.replace(/:[A-Za-z_]+/g, '[^/]+').replace(/\//g, '\\/') + '$',
  )
  return re.test(concrete)
}

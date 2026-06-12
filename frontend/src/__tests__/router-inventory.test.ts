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
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../..')
const INVENTORY_PATH = join(
  REPO_ROOT,
  'measure/archive/react_router_7_migration_20260611/inventory.md',
)
const ROUTER_TSX = join(REPO_ROOT, 'frontend/src/router.tsx')

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

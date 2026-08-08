/**
 * Phase 4: Cleanup & Closeout — dead-symbol guardrail + TD-241 closeout.
 *
 * Spec:  measure/tracks/react_router_7_migration_20260611/spec.md
 * Plan:  measure/tracks/react_router_7_migration_20260611/plan.md (Phase 4 Tasks 4.1, 4.2)
 * Strategy: measure/tracks/react_router_7_migration_20260611/test-strategy.md §5, §7
 *
 * The Phase 4 deliverable is twofold:
 *
 *   1. Task 4.1 — Delete dead route components and legacy router wrappers.
 *      The test-strategy §4 guardrail is "No `<Route>` JSX outside
 *      `router.tsx`." The Phase 2 migration kept `AppRoutes.tsx` (the
 *      legacy v6 `<Routes>`/`<Route>` JSX tree) as a backward-compat
 *      shim for `App.test.tsx` + `App.routes.test.tsx` Phase 4 settings
 *      route tests (per the `d4f3e92` commit note in plan.md Phase 2
 *      Green evidence, line 192). Phase 4 task 4.1 deletes that shim
 *      and migrates the dependent tests to use the data-router. The
 *      guardrail test in this file is the **contract** that prevents
 *      any v6 symbol (`BrowserRouter`, `<Routes>`, `<Route `) from
 *      creeping back into non-test source after the cleanup.
 *
 *   2. Task 4.2 — Update `measure/tech-debt.md` to mark TD-241 as
 *      resolved. The test-strategy §5 says "assert TD-241 row reads
 *      `status: resolved`" — that is the markdown contract. The
 *      artifact-only assertion is allowed per the mid-agent directive
 *      (artifact assertions allowed when the phase deliverable is that
 *      artifact); the **live gate** is owned by the Green role's
 *      re-run of the Phase 3 closeout suite + this guardrail test.
 *      The plan note recording the gate ownership is in plan.md
 *      Phase 4 Red evidence (this commit).
 *
 * The closeout live source proof (per test-strategy §7 Phase 4 row) is
 * the `rg -n "BrowserRouter|<Routes>|<Route " frontend/src --glob '!*.test.*'`
 * command — the test in this file is the **bounded contract** version
 * of that proof (vitest, not shell) so the Red command can fail in a
 * CI-style runner without a shell. The rg command itself is owned by
 * the Green / Implementer as the live source proof.
 *
 * Red signals at HEAD (this commit):
 *   - `frontend/src/AppRoutes.tsx` still uses `<Routes>` and `<Route
 *     index ...>` / `<Route path="..." ...>` JSX (the legacy wrapper
 *     the cleanup is supposed to delete).
 *   - `frontend/src/router.tsx` line 74 contains a comment that
 *     matches `BrowserRouter` literally.
 *   - `frontend/src/AppRoutes.tsx` line 1 imports `Route` and `Routes`
 *     from `react-router-dom`.
 *   - `measure/tech-debt.md` line 34 has TD-241 in the Open section
 *     with `severity: High` and no `status: resolved` marker.
 *
 * All four are live implementation-missing / implementation-wrong
 * failures for Tasks 4.1 and 4.2 — they satisfy the Red-phase
 * "current implementation is missing or wrong" contract.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../..')
const FRONTEND_SRC = join(REPO_ROOT, 'frontend/src')
const APP_TSX_PATH = join(FRONTEND_SRC, 'App.tsx')
const APP_ROUTES_TSX_PATH = join(FRONTEND_SRC, 'AppRoutes.tsx')
const TECH_DEBT_MD_PATH = join(REPO_ROOT, 'measure/tech-debt.md')

/**
 * Recursively list `.ts`/`.tsx` files under `dir`, excluding test files
 * (`*.test.{ts,tsx}`, `*.test-helpers.{ts,tsx}`). Mirrors the helper in
 * `App.routes.test.tsx` so the v6-symbol scan scope matches the
 * test-strategy §7 rg gate (which uses `--glob '!*.test.*'`).
 */
function listNonTestSourceFiles(dir: string): string[] {
  const out: string[] = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) {
      out.push(...listNonTestSourceFiles(full))
    } else if (/\.tsx?$/.test(extname(name)) && !/\.test\./.test(name)) {
      out.push(full)
    }
  }
  return out
}

/**
 * The patterns the test-strategy §7 closeout rg uses to detect
 * v6-router residue. We use two flavors of each symbol so the
 * contract catches BOTH JSX usage AND named imports, while
 * NOT false-positiving on the legitimate v7 data-router factory
 * `createBrowserRouter` (which contains the substring `BrowserRouter`).
 *
 * The first three are JSX open-tag patterns (the `<` prefix is the
 * disambiguator — only JSX opens with `<`). The second three detect
 * named imports from react-router-dom. Restricting the import checks
 * to syntax avoids treating prose comments such as "Route: /path"
 * as executable v6-router residue.
 *
 * Both flavors together mirror the rg closeout gate
 *   `rg -n "BrowserRouter|<Routes>|<Route " frontend/src --glob '!*.test.*'`
 * in spirit (no v6 component residue) without false-positiving on
 * `createBrowserRouter` / `useRoutes` / `BrowserRouter`-suffix identifiers.
 *
 *   - `<BrowserRouter\b`  — JSX open tag of the v6 router
 *   - `<Routes\b`         — JSX open tag of the v6 route container
 *   - `<Route\b`          — JSX open tag of the v6 route
 *   - named-import patterns catch only imports from react-router-dom
 *
 * This still rejects executable legacy router symbols while allowing
 * documentation to discuss routes and avoiding false positives on
 * `createBrowserRouter`, `useRoutes`, and similar identifiers.
 */
const V6_RESIDUE_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['<BrowserRouter', /<BrowserRouter\b/],
  ['<Routes', /<Routes\b/],
  ['<Route', /<Route\b/],
  [
    'BrowserRouter import',
    /import\s*\{[^}]*\bBrowserRouter\b[^}]*\}\s*from\s*['"]react-router-dom['"]/,
  ],
  ['Routes import', /import\s*\{[^}]*\bRoutes\b[^}]*\}\s*from\s*['"]react-router-dom['"]/],
  ['Route import', /import\s*\{[^}]*\bRoute\b[^}]*\}\s*from\s*['"]react-router-dom['"]/],
]

interface V6ResidueOffender {
  file: string
  pattern: string
}

/**
 * Scan `dir` recursively for any of the V6_RESIDUE_PATTERNS. Returns a
 * list of offenders; an empty list means the directory is clean.
 */
function findV6Residue(dir: string): V6ResidueOffender[] {
  const offenders: V6ResidueOffender[] = []
  for (const file of listNonTestSourceFiles(dir)) {
    const src = readFileSync(file, 'utf8')
    for (const [label, re] of V6_RESIDUE_PATTERNS) {
      if (re.test(src)) {
        offenders.push({
          file: file.split(`${REPO_ROOT}${sep}`).pop() ?? file,
          pattern: label,
        })
      }
    }
  }
  return offenders
}

/**
 * Extract the markdown table row for `tdId` from `tech-debt.md`. The
 * registry is a pipe-delimited markdown table; each row starts with
 * `| TD-<n> |`. Returns the first matching row text, or `null` if not
 * present. The match is intentionally anchored to the start of the
 * row to avoid accidentally matching a backreference inside another
 * row's description.
 */
function findTechDebtRow(body: string, tdId: string): string | null {
  const lines = body.split('\n')
  const row = lines.find(l => new RegExp(`^\\|\\s*${tdId}\\s*\\|`).test(l))
  return row ?? null
}

describe('App.guardrails — Phase 4 Task 4.1: dead-symbol guardrail', () => {
  it('App.tsx is the production entry and contains no v6-router JSX or imports', () => {
    // Test-strategy §5: "Add a guardrail test that imports from
    // `frontend/src/App.tsx` and asserts no `BrowserRouter`/`Routes`/
    // `Route` symbols are referenced." App.tsx is the production
    // entry point; Phase 2 Green already cleaned it (it now wraps
    // `<RouterProvider>`). The test is the regression guard.
    const app = readFileSync(APP_TSX_PATH, 'utf8')
    expect(app).not.toMatch(/BrowserRouter/)
    expect(app).not.toMatch(/<Routes>/)
    expect(app).not.toMatch(/<Route /)
    // Named imports from react-router-dom must not include the v6 trio.
    const importMatch = app.match(/import\s*\{([^}]+)\}\s*from\s*['"]react-router-dom['"]/)
    if (importMatch) {
      const imports = (importMatch[1] ?? '')
        .split(',')
        .map(s => s.trim().split(/\s+as\s+/)[0] ?? '')
        .filter(Boolean)
      for (const legacy of ['BrowserRouter', 'Routes', 'Route']) {
        expect(imports, `App.tsx imports legacy "${legacy}" from react-router-dom`).not.toContain(
          legacy,
        )
      }
    }
  })

  it('the legacy v6 wrapper `frontend/src/AppRoutes.tsx` is deleted', () => {
    // Task 4.1: "Delete dead route components and legacy router wrappers."
    // The only legacy v6 `<Routes>`/`<Route>` JSX wrapper in the codebase
    // is `AppRoutes.tsx` (103 lines of v6 JSX kept since the Phase 2
    // commit `4e9c289` as a backward-compat shim for characterization
    // tests). Phase 4 deletes the shim and migrates the dependent
    // tests to use the data-router via `createMemoryRouter`.
    // The test asserts the file is gone.
    expect(
      existsSync(APP_ROUTES_TSX_PATH),
      'Phase 4 Task 4.1 contract: delete frontend/src/AppRoutes.tsx (the v6 legacy router wrapper).',
    ).toBe(false)
  })

  it('no non-test source file under frontend/src contains v6-router residue', () => {
    // Test-strategy §7 Phase 4 row: "rg -n `BrowserRouter|<Routes>|<Route `
    //   frontend/src --glob '!*.test.*'` returns no matches [live source
    //   proof]." This test is the **bounded contract** version of that
    //   rg command. The rg itself is owned by the Green role as the
    //   live source proof; the test owns the contract.
    //
    // The three patterns match the rg `alternation` exactly:
    //   - `BrowserRouter` (literal) catches imports + JSX + comments
    //   - `<Routes>`     (literal) catches the self-closing JSX form
    //   - `<Route `      (trailing space) catches the open-tag form
    //                     but not the comment text "<Route>" in
    //                     `router.tsx` line 74.
    const offenders = findV6Residue(FRONTEND_SRC)
    expect(
      offenders,
      `Phase 4 Task 4.1 contract: zero v6-router residue in non-test frontend source. Offenders: ${JSON.stringify(offenders)}`,
    ).toEqual([])
  })
})

describe('App.guardrails — Phase 4 Task 4.2: TD-241 closeout marker in tech-debt.md', () => {
  it('tech-debt.md exists and has a row for TD-241', () => {
    expect(existsSync(TECH_DEBT_MD_PATH)).toBe(true)
    const body = readFileSync(TECH_DEBT_MD_PATH, 'utf8')
    expect(body).toMatch(/^\|\s*TD-241\s*\|/m)
  })

  it('TD-241 row reads `status: resolved` (or the Resolved-section equivalent)', () => {
    // Test-strategy §5: "Update `tech-debt.md` and assert TD-241 row
    //   reads `status: resolved`." The current tech-debt.md schema has
    //   a `## Resolved` section with rows shaped
    //   `| TD-<n> | <description> | <resolution> |` — the Resolved
    //   section IS the "status: resolved" marker. The test asserts the
    //   row is in Resolved (not Open).
    const body = readFileSync(TECH_DEBT_MD_PATH, 'utf8')

    // Find the Resolved section.
    const resolvedSection = body.split(/^## /m).find(s => s.startsWith('Resolved'))
    expect(
      resolvedSection,
      'measure/tech-debt.md must have a `## Resolved` section to host the closed TD-241 row',
    ).toBeDefined()

    // TD-241 must appear in the Resolved section.
    expect(
      resolvedSection,
      'TD-241 must be moved from the Open section to the Resolved section in measure/tech-debt.md',
    ).toMatch(/^\|\s*TD-241\s*\|/m)

    // TD-241 must NOT still be in the Open section.
    const openSection = body.split(/^## /m).find(s => s.startsWith('Open Tech Debt'))
    expect(
      openSection,
      'measure/tech-debt.md must have an `## Open Tech Debt` section',
    ).toBeDefined()
    expect(
      openSection,
      'TD-241 must not remain in the Open Tech Debt section after the RR7 migration closes',
    ).not.toMatch(/^\|\s*TD-241\s*\|/m)

    // The Resolved row must include a non-empty resolution cell (3rd
    // pipe-delimited cell on the row).
    const row = findTechDebtRow(resolvedSection!, 'TD-241')
    expect(row, 'TD-241 row missing in Resolved section').not.toBeNull()
    const cells = (row ?? '')
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
    expect(cells.length, 'TD-241 Resolved row must have at least 3 cells').toBeGreaterThanOrEqual(3)
    const resolution = cells[cells.length - 1] ?? ''
    expect(
      resolution.length,
      'TD-241 Resolved row must record a non-empty resolution describing how the migration closed',
    ).toBeGreaterThan(5)
  })
})

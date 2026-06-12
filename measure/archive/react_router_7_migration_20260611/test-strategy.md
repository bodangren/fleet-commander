# Test Strategy — React Router 7 Migration

## 1. Testing pyramid per phase

| Phase | Unit / Contract | Component (RTL) | Integration | E2E (Playwright) |
|---|---|---|---|---|
| 1 Inventory & Scaffold | Inventory artifact contract test (counts) + `router.tsx` shape test | — | — | — |
| 2 Route Migration | Route-table contract (`AppRoutes`) extended, hook-call lint | Per-page render-in-`MemoryRouter` (existing 10+ tests must keep passing) | `App.routes.test.tsx` for every top-level + nested route | smoke + dashboard navigation only |
| 3 Test Validation | typecheck, vitest full suite | full RTL suite | full vitest run | full 25-spec Playwright run |
| 4 Cleanup & Closeout | dead-code/import lint test; tech-debt registry contract | — | re-run §3 gates | — |

Pyramid weight: unit/component ≫ integration ≫ E2E. E2E is the regression net; we do not add new E2Es.

## 2. Shared fixtures & mocks
- `frontend/src/__fixtures__/convex-provider.test.tsx` (existing) — keep as the canonical Convex test wrapper.
- New shared helper `frontend/src/__fixtures__/renderWithRouter.tsx` (test-only, created in Phase 1 setup task): wraps children in `MemoryRouter` for v6 and `createMemoryRouter` + `RouterProvider` for v7, behind a single `renderWithRouter(ui, { route })` API. Migrating ~13 existing test files to call this helper is the only way to avoid touching every test in Phase 2.
- `vi.mock('@/lib/useFleetData', …)` pattern already used in `App.routes.test.tsx` is the standard for route-tree tests.
- Do **not** introduce a custom router fake; use react-router's `createMemoryRouter` directly.

## 3. Cross-phase edge cases & dependencies
- **Spec drift:** Spec says "28 Playwright E2E specs"; the repo has **25** (`frontend/e2e/*.spec.ts`). Resolve by editing the spec, not by inventing tests. Treat 25 as the gate.
- **Route count:** `App.tsx` has **39** `<Route>` declarations. Inventory (Task 1.1) must list all 39 and they must all appear in the new data-router tree.
- **Hook call sites:** `useNavigate` (8 callers), `useParams` (1), `useLocation` (5), `useSearchParams` (6) per graph. Phase 2 must touch every site; if signatures change a graph re-run is mandatory.
- **MemoryRouter in tests:** ≥10 component tests import `MemoryRouter`. They must keep working on v7 (still exported) — verify in Phase 3, do not pre-migrate.
- **Peer dep risk:** `@tanstack/react-router` is not in use; only `react-router-dom` upgrades. Other peers (`@convex-dev/react-query`) must keep resolving — Phase 1 Task 1.4 must report `bun pm ls` clean.
- **Future flags:** Removing them (Task 2.4) changes URL-encoding & relative-path resolution; route tests must assert resolved pathnames, not raw strings.

## 4. Architecture guardrails
- Router config lives in `src/router.tsx` only; `App.tsx` becomes a thin shell that renders `<RouterProvider>`. No `<Route>` JSX outside `router.tsx`.
- No loader/action work in this track (out of scope for migration parity) — guard by making `App.routes.test.tsx` assert routes have no `loader`/`action`. Adding them is a follow-up track.
- No new `react-router` re-exports from app code. Tests import from `react-router-dom` directly.
- Backend `pivot/src/routes/*` is unrelated; the term "route" collides — every test file/PR description must say "browser route" vs "API route".

## 5. Per-phase test approach
- **Phase 1:** Write the route-inventory artifact (`measure/tracks/<id>/inventory.md`) and a tiny test that parses it and asserts `count === 39` and lists match `grep -c "<Route" App.tsx`. Scaffold `router.tsx` with `createBrowserRouter([])` and a unit test asserting the export type. **Dependency-resolution proof: `bun install` exits 0 and `bun pm ls react-router-dom` reports v7.x.**
- **Phase 2:** Drive each task with the existing `App.routes.test.tsx` extended phase-by-phase (top-level → nested → programmatic nav → future-flag-free). Add one RTL test per refactored hook call site only if behavior is non-trivial; otherwise rely on existing page tests.
- **Phase 3:** Pure regression: `typecheck`, `build`, `vitest`, `playwright`. No new tests written here — failures route back to the relevant Phase-2 task.
- **Phase 4:** Add a guardrail test that imports from `frontend/src/App.tsx` and asserts no `BrowserRouter`/`Routes`/`Route` symbols are referenced (AST or simple string scan of the built file). Update `tech-debt.md` and assert TD-241 row reads `status: resolved`.

## 6. build-graph findings that shaped this strategy
- `graph.db` fresh (today). Stats: 1378 functions / 633 files / 154 routes (all API-side). No `createBrowserRouter` node exists yet — clean slate.
- Caller counts drove Phase-2 sizing: `Route`=38, `Outlet`/`Link`/`NavLink` combined=26, `useNavigate`=8. ⇒ Phase 2 is the largest phase and should be split into the 4 plan sub-tasks already shown.
- `function:*:MemoryRouter` has callers across 10+ test files ⇒ Section 2's shared `renderWithRouter` helper is justified, not over-engineering.
- `AppRoutes` (`frontend/src/App.tsx`) is the single render entry point ⇒ `App.routes.test.tsx` remains the right contract surface.

## 7. Live-proof plan (Red command → Green/closeout gate)

Every gate runs **real production code** unless marked [artifact]. Fake harnesses are forbidden in this track — react-router is exercised directly. The shared `renderWithRouter` helper is test plumbing only; it never substitutes for the real `<RouterProvider>` in app code.

| Phase | Red command (targeted, must fail first) | Green / closeout gate (bounded, no full-suite fall-through) |
|---|---|---|
| 1 | `bun --cwd frontend test src/router.test.ts src/App.routes.test.tsx` [contract] | same command green **and** `bun --cwd frontend exec -- bun pm ls react-router-dom \| grep -E '^.+react-router-dom@7\\.'` [live dep proof] |
| 2 | `bun --cwd frontend test src/App.routes.test.tsx -t "<sub-task name>"` (one `-t` filter per sub-task 2.1–2.4) | `bun --cwd frontend test src/App.routes.test.tsx src/pages src/layout src/hooks` (scoped paths, not full suite) green |
| 3 | `bun --cwd frontend typecheck` → expect router type errors first | ordered: `bun --cwd frontend typecheck` && `bun --cwd frontend run build` && `bun --cwd frontend test` && `bun --cwd frontend test:e2e --reporter=line` — all four green; Playwright run must report `25 passed` (not 28 — see §3) |
| 4 | `bun --cwd frontend test src/App.guardrails.test.ts` (new dead-symbol guard) [contract] | guard test green **and** `rg -n "BrowserRouter|<Routes>|<Route " frontend/src --glob '!*.test.*'` returns no matches [live source proof]; then re-run Phase 3 gate as closeout smoke |

Red/Green discipline: each phase's Red command must be run against the unchanged codebase first and fail with a router-related diagnostic before any implementation begins. The Phase-3 closeout gate uses scoped paths and `--reporter=line` so an accidental missing file errors loudly rather than silently passing as "0 tests".

## Intentionally-red files
None planned. If Phase 2 splits introduce a `*.todo.test.tsx` for a still-`[~]` sub-task, it **must** use `describe.skip` or `.todo` and the still-`[~]` task in `plan.md` must name the file in its task description. Aggregate `bun --cwd frontend test` must remain green at every commit boundary.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: react_router_7_migration_20260611
phase: track setup
commits: none
tests_run: none (strategy doc only; no code changes)
files_changed: measure/tracks/react_router_7_migration_20260611/test-strategy.md (new)
plan_updates: none — plan.md left untouched; strategy flags spec drift (28 vs actual 25 Playwright specs) for Implementer to reconcile in Phase 1
known_failures: none
handoff: Implementer should (1) fix spec.md "28" → "25" before starting Phase 1, (2) create `frontend/src/__fixtures__/renderWithRouter.tsx` as the first Phase-1 sub-step, (3) run each phase's Red command from §7 before writing code, and (4) keep `graph.db` updated with `build-graph update` after every commit that touches `App.tsx`, `router.tsx`, or hook call sites.
END_MEASURE_AGENT_RESULT

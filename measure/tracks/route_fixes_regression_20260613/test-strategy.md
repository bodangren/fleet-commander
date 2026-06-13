# Test Strategy: Route Fixes + Regression Tests

> Companion to `plan.md` / `spec.md`. Tech-Lead-owned guardrails for S1–S8.

## 1. Testing Pyramid (per phase)

| Phase | Unit | Component (RTL+jsdom) | Integration (router/Convex mock) | Live smoke |
|------|------|-----------------------|----------------------------------|-----------|
| S1 history paths | ✅ primary | — | — | covered by S8 |
| S2 New Project btn | — | ✅ primary | optional router test | S8 |
| S3 /settings redirect | — | ✅ + router | ✅ MemoryRouter | S8 |
| S4 /harnesses | — | ✅ primary | ✅ MemoryRouter+outlet ctx | S8 |
| S5 /history/tasks | — | ✅ primary | ✅ MemoryRouter+Convex mock | S8 |
| S6 agent form validation | ✅ primary | ✅ secondary (error visibility) | — | S8 |
| S7 regression aggregate | (review only — no new layer) | | | |
| S8 Kimi smoke | contract test only (config) | — | — | ✅ live nav of 38 routes |

Pyramid bias: **base = unit (S1, S6) + component (S2–S5)**, peak = single live smoke pass (S8). No new e2e/Playwright work (TD-250 out of scope).

## 2. Shared fixtures & mocks

- **Convex hook mock** (S1, S5): `vi.mock('@/lib/convex-data/core', () => ({ useConvexQuery: vi.fn() }))`. Assert call args (path string) — do NOT exercise real client.
- **Outlet context fixture** (S2–S5): factory `makeFleetOutlet(overrides)` returning a minimal `FleetDataState` (`harnesses: []`, `agents: []`, etc.). Co-locate in `frontend/src/test/fixtures/fleet.ts` if not already present; otherwise inline per test until S7.
- **Router harness** (S2–S5): `renderWithRouter(node, { initialEntries })` thin wrapper around `MemoryRouter` + `RouterProvider`. Reuse if already present in `frontend/src/test/`; do not introduce new abstraction layers.
- **Recharts mock**: already provided in `frontend/src/test/setup.ts` — no changes.
- **Navigate spy** (S2): `vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigateSpy }))`.

## 3. Cross-phase edge cases & dependencies

- **S5 depends on S1.** Write S5 test against the *symptom* (page renders) so it stays green even after S1's path fix lands. If S5 still red after S1, escalate root cause search to `TasksHistoryPage` body.
- **S3/S4 may share root cause** with crashing layout components. Assert visible content from the *target* sub-route, not just absence of redirect — a silent crash + error boundary could fake-pass a "no redirect" check.
- **S2 fallback path** (`?? () => navigate('/portfolio')`) must be covered both with and without the `onNewProject` prop.
- **S6 happy/error transitions**: clearing a previously-shown error when the field becomes valid (per spec AC).
- **Loading vs empty vs error** states for history pages: distinguish `undefined` (loading) from `[]` (empty) — many redirects are caused by treating `undefined` as "no data".

## 4. Architecture guardrails

- **Tests live next to code**: `*.test.ts(x)` colocated. No new `__tests__/` directory.
- **No real Convex network**: every test mocks `useConvexQuery` or higher hooks.
- **No real Kimi browser** in Vitest: S8 live behavior runs only via the explicit script in `scripts/smoke-pass.ts`.
- **Path strings as constants** (S1): tests assert against the exported constant identifiers, not duplicated literals — single source of truth.
- **No edits to production source files from this strategy doc**; all production changes belong to plan tasks.
- **Boundary**: nothing in `pivot/` or `convex/` changes; tests stay in `frontend/`.

## 5. Per-phase test approach (brief)

- **S1**: 3 assertions on call args of mocked `useConvexQuery`. Pure unit. Artifact-style (proves wire-up, not server behavior).
- **S2**: RTL render of `AppLayout`, click "New Project", assert `onNewProject` mock called AND `navigateSpy` not called with `/settings`.
- **S3**: `MemoryRouter` at `/settings`, assert `AppConfigSection` text rendered. Add fallback test rendering `SettingsLayout` directly with mocked outlet ctx to isolate crash mode.
- **S4**: Two tests — direct `HarnessesPage` w/ fixture, and `HarnessesPageWrapper` inside `MemoryRouter` with outlet ctx (incl. `fleet=undefined` guard test).
- **S5**: Render `TasksHistoryPage` with mocked `useTaskHistory` returning `undefined` → loading; returning data → table. Both must NOT redirect.
- **S6**: 3 unit tests for `validateAgentForm`; 1 component test that the error text is visible (per AC: "not just a toast").
- **S7**: Audit pass — checklist review of S1–S6 coverage; add only gaps (e.g., `router.test.tsx` aggregate route map test if not already covered by per-page tests). Coverage gate ≥80% on changed files.
- **S8**: Two distinct artifacts: (a) **contract test** in Vitest validating `smoke-config.json` shape (route count = 38, workflow count = 12, every route has `expectedComponent`). (b) **live runner** `smoke-pass.ts` invoked manually against running stack — produces `smoke-results.json` + `coverage-report.md`.

## 6. build-graph findings shaping the strategy

- `useAgentHistoryQuery / useSprintHistoryQuery / useTaskHistoryQuery` each have exactly **1 caller chain** (hook → page) — small blast radius confirms unit-level mocking suffices for S1; no cascading refactor risk.
- `useConvexQuery` is the single chokepoint (`frontend/src/lib/convex-data/core.ts`) — mocking it once covers all three S1 hooks.
- `AppLayout` has **2 callers** (`router.tsx::FleetLayout`, `AppRoutes.tsx`). S2 test must pass `onNewProject` as a prop without breaking `AppRoutes` characterization tests already in `AppLayout.test.tsx` / `AppLayout.settings.test.tsx`.
- `HarnessesPageWrapper` lives in `router.tsx` (not its own file) — S4 test must render via router context, not import the wrapper directly.
- Stats: 5602 nodes / 7943 edges / 677 files; graph mtime <1h — fresh, no rescan needed before/during this track. Run `build-graph update` per plan after each phase.
- No `route` nodes for the React Router config currently surface as edges — S8 must hand-list 38 routes (graph cannot derive them yet; TD-240 acknowledged out of scope).

## 7. Live-proof plan (Red command + Green gate per phase)

| Phase | Targeted Red command (must fail before impl) | Green / closeout gate |
|------|-----------------------------------------------|------------------------|
| S1 | `bun --cwd frontend test src/lib/convex-data/history.test.ts` | same command green + `bun --cwd frontend check` |
| S2 | `bun --cwd frontend test src/layout/AppLayout.test.tsx -t "New Project"` | same green + `bun --cwd frontend check` |
| S3 | `bun --cwd frontend test src/pages/settings/SettingsLayout.test.tsx` | same green + `bun --cwd frontend check` |
| S4 | `bun --cwd frontend test src/pages/HarnessesPage.test.tsx` | same green + `bun --cwd frontend check` |
| S5 | `bun --cwd frontend test src/pages/TasksHistoryPage.test.tsx` | same green + `bun --cwd frontend check` |
| S6 | `bun --cwd frontend test src/hooks/useAgentForm.test.ts -t "validateAgentForm"` | same green + `bun --cwd frontend check` |
| S7 | `bun --cwd frontend test` (full frontend suite) | same green + `bun --cwd frontend test --coverage` ≥80% on changed files |
| S8 contract | `bun --cwd frontend test smoke-config` | same green |
| S8 live | `bun run measure/tracks/route_fixes_regression_20260613/scripts/smoke-pass.ts` against running `npm run dev` | `coverage-report.md`: 38/38 routes, 0 Critical |

**Artifact vs live distinction.**
- *Artifact / contract* tests (S1, S6, S8-contract): prove wire-up, constants, config shape — not server behavior. Cannot regress live routing on their own.
- *Live-behavior* tests (S2–S5 component+router, S7 aggregate, S8 live runner): exercise real component trees / live dev stack. S8 live is the only end-to-end behavior gate.

**Fake harness policy.** No new fake harnesses are introduced. The S8 contract test is config-only and is **paired** with the bounded live runner so it cannot fall through into a full suite as a substitute. If a fake stub for the Kimi runner is added later, it must remain in `scripts/` and never be wired into `vitest.config.ts include` globs.

**Intentionally-red files.** None planned. All Red→Green tests sit in dirs already covered by the default `src/**/*.test.{ts,tsx}` include — they are expected to be Red only during their own phase. If a phase pauses with `[~]` and a still-failing test, the owning phase task remains `[~]` and the test file is named in the daily handoff so aggregate `bun --cwd frontend test` failures are explicable. No `*.skip`/`.todo` exclusions or `testPathIgnorePatterns` changes are permitted by this strategy.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: route_fixes_regression_20260613
phase: track setup
commits: none
tests_run: none (strategy-only, no implementation)
files_changed: measure/tracks/route_fixes_regression_20260613/test-strategy.md (new)
plan_updates: none — strategy aligns with existing plan.md S1–S8; no plan edits required
known_failures: none
handoff: Implementer should follow per-phase Red commands in §7 strictly; S5 test must assert symptom (page renders) not API path (covered by S1); S8 has TWO gates (contract test + live runner) that must both pass; no intentionally-red files exist, so any aggregate `bun --cwd frontend test` redness during a `[~]` phase is owned by that phase's task.
END_MEASURE_AGENT_RESULT

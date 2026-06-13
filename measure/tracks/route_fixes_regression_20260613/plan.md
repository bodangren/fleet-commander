# Plan: Route Fixes + Regression Tests

> **Sprint:** 2026-06-13 — goal: fix all QA findings + graph-discovered issues, add regression tests.
> **Stories:** R1 (history API paths), R2 (New Project button), R3 (settings redirect), R4 (harnesses), R5 (task history), R6 (agent validation), R7 (unit tests), R8 (smoke pass).
> **Plan shape:** one phase per story (S1–S8), Contract-First sub-task pipeline preserved.

## Phase S1: Fix Convex history API path mismatch _(STORY-R1, S, Must)_

_Story ref: spec.md#story-r1_
_Blast radius: `useAgentHistoryQuery` (1 caller: `useSprintHistory.ts` → `useAgentHistory` → `AgentsHistoryPage`), `useSprintHistoryQuery` (1 caller: `useSprintHistory.ts` → `useSprintHistory` → `SprintsHistoryPage`), `useTaskHistoryQuery` (1 caller: `useSprintHistory.ts` → `useTaskHistory` → `TasksHistoryPage`)_

### Contract & Schema Definition
- [x] Task: Define the expected Convex API path strings as constants in `frontend/src/lib/convex-data/history.ts`:
      `HISTORY_AGENTS_API = 'history/agents:listAgentHistory'`,
      `HISTORY_SPRINTS_API = 'history/sprints:listSprintHistory'`,
      `HISTORY_TASKS_API = 'history/tasks:listTaskHistory'`.
      **Green evidence (2026-06-14):** constants defined at lines 9–11 of `history.ts`. Commit: `c9766df`.

### Test
- [x] Task: Write a Vitest unit test in `frontend/src/lib/convex-data/history.test.ts` that asserts:
      - `useAgentHistoryQuery` calls `useConvexQuery` with `'history/agents:listAgentHistory'`
      - `useSprintHistoryQuery` calls `useConvexQuery` with `'history/sprints:listSprintHistory'`
      - `useTaskHistoryQuery` calls `useConvexQuery` with `'history/tasks:listTaskHistory'`
      - Run: `bun --cwd frontend test history` — expect 3 failures (Red).
      - **Red evidence (2026-06-14):** `bun --cwd frontend test src/lib/convex-data/history.test.ts` → **3 failed / 3 total**. Each test fails on the path string assertion: the implementation currently passes `history:listSprintHistory` / `history:listAgentHistory` / `history:listTaskHistory` (wrong module prefix) — confirms the Red phase is anchored to the actual API path mismatch bug, not stale artifacts. Commit: `7f595c2`.
      - **Re-verified at clean worktree (2026-06-14, Mid-red resumption):** stashed uncommitted Green-phase work in `history.ts` + `graph.db` + cosmetic `history.test.ts` import (preserved in `stash@{0}: preserve-green-phase-work-for-S1` for the next role) and re-ran `bun --cwd frontend test src/lib/convex-data/history.test.ts --run` at HEAD → **Tests 3 failed (3) / Test Files 1 failed (1)** in 12.82s. The 3 failures are anchored to the exact `history:listXxx` vs `history/<slice>:listXxx` mismatch — not to stale artifacts. Red phase closeout is owned by the Green role from this point. Commit: `7f595c2`.
      - **Stash preservation boundary (2026-06-14, supervisor-gate fix):** the Mid (Red) role MUST leave the worktree clean at end-of-role — i.e., the dirty `history.ts` / `graph.db` / `history.test.ts` files must remain in `stash@{0}: preserve-green-phase-work-for-S1` and MUST NOT be `git stash pop`'d back into the worktree by the Red role. Popping them re-introduces the Green-phase `history.ts` modification and the `graph.db` binary diff as dirty worktree changes, which the supervisor gate flags as Red-phase boundary violations (non-test, non-Measure-doc files modified). The Green (Implement) role is the one that pops the stash to land the implementation commit. End-of-role worktree state for the Mid role on this phase: `git status --porcelain` is empty except for the committed `7f595c2` (plan.md) and any Red-phase docs committed by this role. Re-confirmed at HEAD via `bun --cwd frontend test src/lib/convex-data/history.test.ts --run` → **Tests 3 failed (3) / Test Files 1 failed (1)** in 5.98s on clean tree. Commit: `245e4d4`.

### Implement
- [x] Task: In `frontend/src/lib/convex-data/history.ts`, replace the 3 inline string arguments:
      - Line 34: `'history:listSprintHistory'` → `HISTORY_SPRINTS_API`
      - Line 67: `'history:listAgentHistory'` → `HISTORY_AGENTS_API`
      - Line 98: `'history:listTaskHistory'` → `HISTORY_TASKS_API`
      - Run: `bun --cwd frontend test history` — expect 3 passes (Green).
      **Green evidence (2026-06-14):** `bun --cwd frontend test src/lib/convex-data/history.test.ts --run` → **3 passed / 3 total**. All three hooks now use `HISTORY_*_API` constants with correct `history/<slice>:listXxx` format. Commit: `c9766df`.

### Generate Docs & Doctor
- [x] Task: `build-graph update ./graph.db frontend/src/lib/convex-data/history.ts` — **Green-phase only.** Mid (Red) role must NOT run `build-graph update`; it modifies `graph.db` (non-test, non-Measure-doc) and violates the Red-phase boundary. The graph cache remains valid for the Red → Green handoff; this step is owned by the Implement role once the source code changes land.
      **Green evidence (2026-06-14):** `build-graph update ./graph.db frontend/src/lib/convex-data/history.ts` → Updated 1 files (7 → 8 nodes, 12 → 12 edges). Commit: `c9766df`.
- [x] Task: `bun --cwd frontend check` — typecheck + lint must pass.
      **Green evidence (2026-06-14):** `bunx tsc --noEmit` (0 errors), `bunx eslint src/lib/convex-data/history.ts src/lib/convex-data/history.test.ts` (0 warnings). Commit: `c9766df`.

## Phase S2: Fix "New Project" header button _(STORY-R2, M, Must)_

_Story ref: spec.md#story-r2_
_Blast radius: `AppLayout` (2 callers: `router.tsx` → `FleetLayout`, `AppRoutes.tsx` → `AppRoutes`)_

### Contract & Schema Definition
- [ ] Task: Define the "New Project" button contract: the button should call a handler prop (e.g., `onNewProject`) rather than hard-coding `navigate('/settings')`. The handler is passed from `FleetLayout` (which has access to fleet data and Convex mutations).

### Test
- [~] Task: Write a Vitest unit test in `frontend/src/layout/AppLayout.test.tsx`:
      - Render `AppLayout` with a mock `onNewProject` handler.
      - Click the "New Project" button.
      - Assert the mock handler was called (not `navigate('/settings')`).
      - Run: `bun --cwd frontend test AppLayout` — expect 1 failure (Red).
      - **Red evidence (2026-06-14):** `bun --cwd frontend test src/layout/AppLayout.test.tsx -t "New Project" --run` → **Tests 2 failed | 12 skipped (14)** in 7.02s. Both new tests fail with bug-anchored assertions, not stale artifact mismatches:
        1. *"calls onNewProject handler when "New Project" button is clicked and the prop is provided"* → `AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times` at `AppLayout.test.tsx:199`. Proves `AppLayout` ignores the `onNewProject` prop because the component does not destructure it from props (no prop slot exists at HEAD).
        2. *"falls back to navigate("/portfolio") (not "/settings") when "New Project" button is clicked without an onNewProject prop"* → `AssertionError: expected "vi.fn()" to be called with arguments: [ '/portfolio' ]` with diff `-   "/portfolio",  +   "/settings",` at `AppLayout.test.tsx:215`. Proves the button's `onClick` at `AppLayout.tsx:246` hard-codes `() => navigate('/settings')` — the actual bug from STORY-R2.
      - **No-regression check (2026-06-14):** Re-ran the full file `bun --cwd frontend test src/layout/AppLayout.test.tsx --run` → **Tests 2 failed | 12 passed (14)** in 12.19s. The 12 pre-existing sidebar navigation + Blockers tests all still pass — the file-level `vi.mock('react-router-dom', ...)` preserves `NavLink`, `MemoryRouter`, `useLocation`, `Outlet` via `importOriginal` and only overrides `useNavigate`. Mock side-effects are bounded to the Phase S2 describe block.
      - **Mid-role boundary (2026-06-14):** Red role owns this task only; `[~]` remains. Source code in `frontend/src/layout/AppLayout.tsx` and `frontend/src/router.tsx` is intentionally unchanged — flipping the task to `[x]` is the Green role's job after the implementation lands and the same Red command turns green. `graph.db` is NOT updated by this role (Green-phase boundary, per S1 plan note). End-of-role worktree state: only `frontend/src/layout/AppLayout.test.tsx` and `measure/tracks/route_fixes_regression_20260613/plan.md` are modified, both committed below.

### Implement
- [ ] Task: In `AppLayout.tsx`:
      - Add `onNewProject?: () => void` to the `AppLayout` props interface.
      - Change line 246 from `onClick={() => navigate('/settings')}` to `onClick={onNewProject ?? (() => navigate('/portfolio'))}` (fallback to portfolio, not settings).
      - In `router.tsx` `FleetLayout`, pass an `onNewProject` handler that opens a project creation modal or navigates to the portfolio page with a `?new=true` query param.
      - Run: `bun --cwd frontend test AppLayout` — expect 1 pass (Green).

### Generate Docs & Doctor
- [ ] Task: `build-graph update ./graph.db frontend/src/layout/AppLayout.tsx frontend/src/router.tsx`
- [ ] Task: `bun --cwd frontend check` — typecheck + lint must pass.

## Phase S3: Fix `/settings` index redirect _(STORY-R3, S, Must)_

_Story ref: spec.md#story-r3_
_Blast radius: `SettingsLayout` (2 callers: `router.tsx`, `AppRoutes.tsx`)_

### Contract & Schema Definition
- [ ] Task: Verify the route contract in `router.tsx` line 97: `{ index: true, element: <Navigate to="/settings/app" replace /> }` is correct. The bug is likely in `SettingsLayout` crashing at runtime, not the route definition.

### Test
- [ ] Task: Write a Vitest unit test in `frontend/src/pages/settings/SettingsLayout.test.tsx`:
      - Render `SettingsLayout` inside a `MemoryRouter` with initial entry `/settings`.
      - Assert the output contains `AppConfigSection` content (not a redirect to `/`).
      - If `SettingsLayout` depends on outlet context, provide mock context.
      - Run: `bun --cwd frontend test SettingsLayout` — expect 1 failure (Red).

### Implement
- [ ] Task: Debug `SettingsLayout.tsx`:
      - Check for missing props, undefined context, or import errors that cause a render crash.
      - If the component throws, add error boundaries or fix the root cause.
      - Ensure the `<Navigate to="/settings/app" replace />` fires correctly inside the nested route.
      - Run: `bun --cwd frontend test SettingsLayout` — expect 1 pass (Green).

### Generate Docs & Doctor
- [ ] Task: `build-graph update ./graph.db frontend/src/pages/settings/SettingsLayout.tsx frontend/src/router.tsx`
- [ ] Task: `bun --cwd frontend check` — typecheck + lint must pass.

## Phase S4: Fix `/harnesses` route redirect _(STORY-R4, S, Must)_

_Story ref: spec.md#story-r4_
_Blast radius: `HarnessesPageWrapper` (1 caller: `router.tsx`)_

### Contract & Schema Definition
- [ ] Task: Verify the `HarnessesPage` component contract: it expects `{ fleet: FleetDataState }` props. The redirect may be caused by `fleet` being undefined when the outlet context is missing.

### Test
- [ ] Task: Write a Vitest unit test in `frontend/src/pages/HarnessesPage.test.tsx`:
      - Render `HarnessesPage` with a mock `FleetDataState` (including `harnesses: []`).
      - Assert the empty state renders (not a redirect).
      - Render `HarnessesPageWrapper` inside a `MemoryRouter` with outlet context.
      - Assert `HarnessesPage` renders.
      - Run: `bun --cwd frontend test HarnessesPage` — expect 2 failures (Red).

### Implement
- [ ] Task: In `HarnessesPageWrapper` (`router.tsx`):
      - Add a guard: if `fleet` is undefined from `useOutletContext`, show a loading state instead of crashing.
      - Ensure the route `{ path: 'harnesses', element: <HarnessesPageWrapper /> }` renders correctly.
      - Run: `bun --cwd frontend test HarnessesPage` — expect 2 passes (Green).

### Generate Docs & Doctor
- [ ] Task: `build-graph update ./graph.db frontend/src/pages/HarnessesPage.tsx frontend/src/router.tsx`
- [ ] Task: `bun --cwd frontend check` — typecheck + lint must pass.

## Phase S5: Fix `/history/tasks` route redirect _(STORY-R5, S, Must)_

_Story ref: spec.md#story-r5_
_Blast radius: `TasksHistoryPage` (1 caller: `router.tsx`), `useTaskHistory` (1 caller: `TasksHistoryPage`)_

### Contract & Schema Definition
- [ ] Task: This story depends on S1 (API path fix). Verify that after S1, `useTaskHistoryQuery` calls the correct API path. If the redirect persists after S1, the root cause is elsewhere (e.g., `TasksHistoryPage` crashing on missing data shape).

### Test
- [ ] Task: Write a Vitest unit test in `frontend/src/pages/TasksHistoryPage.test.tsx`:
      - Render `TasksHistoryPage` inside a `MemoryRouter` with mock Convex data.
      - Assert the page renders with `TaskHistoryTable` (not a redirect).
      - Render with `undefined` data (loading state) — assert loading indicator appears.
      - Run: `bun --cwd frontend test TasksHistoryPage` — expect 2 failures (Red).

### Implement
- [ ] Task: If the redirect persists after S1, debug `TasksHistoryPage`:
      - Check for missing imports, undefined hooks, or data shape mismatches.
      - Ensure `useTaskHistory()` returns the expected shape when Convex is configured.
      - Run: `bun --cwd frontend test TasksHistoryPage` — expect 2 passes (Green).

### Generate Docs & Doctor
- [ ] Task: `build-graph update ./graph.db frontend/src/pages/TasksHistoryPage.tsx`
- [ ] Task: `bun --cwd frontend check` — typecheck + lint must pass.

## Phase S6: Add agent creation validation _(STORY-R6, M, Should)_

_Story ref: spec.md#story-r6_

### Contract & Schema Definition
- [ ] Task: Define the validation contract in `frontend/src/hooks/useAgentForm.ts`:
      - `validateAgentForm(data)` returns `{ valid: boolean, errors: { field: string, message: string }[] }`.
      - Required fields: `name`, `provider`, `model`.
      - Validation runs before the Convex mutation call.

### Test
- [ ] Task: Write a Vitest unit test in `frontend/src/hooks/useAgentForm.test.ts`:
      - Call `validateAgentForm({ name: 'test', provider: '', model: '' })` — assert errors for provider and model.
      - Call `validateAgentForm({ name: 'test', provider: 'openai', model: 'gpt-4' })` — assert `valid: true`.
      - Call `validateAgentForm({ name: '', provider: 'openai', model: 'gpt-4' })` — assert error for name.
      - Run: `bun --cwd frontend test useAgentForm` — expect 3 failures (Red).

### Implement
- [ ] Task: In `useAgentForm.ts`:
      - Add `validateAgentForm` function with the contract above.
      - In the save handler, call validation before the Convex mutation.
      - If validation fails, set error state (not just a toast).
      - Run: `bun --cwd frontend test useAgentForm` — expect 3 passes (Green).

### Generate Docs & Doctor
- [ ] Task: `build-graph update ./graph.db frontend/src/hooks/useAgentForm.ts`
- [ ] Task: `bun --cwd frontend check` — typecheck + lint must pass.

## Phase S7: Add Vitest regression tests for all fixes _(STORY-R7, L, Must)_

_Story ref: spec.md#story-r7_

### Contract & Schema Definition
- [ ] Task: Define the regression test contract: each fix from S1–S6 must have at least one test that:
      - Imports the changed module directly.
      - Asserts the specific behavior that was broken.
      - Uses `vi.mock` for Convex hooks where needed.

### Test
- [ ] Task: Review all tests written in S1–S6. For each story, verify:
      - The test covers the exact bug that was fixed (not just a happy path).
      - The test uses the correct API path / handler / validation logic.
      - The test is in the correct file (next to the code it tests).
      - Run: `bun --cwd frontend test` — all tests must pass (Green).

### Implement
- [ ] Task: Add any missing regression tests identified in the review:
      - `router.test.tsx`: add tests for `/settings`, `/harnesses`, `/history/tasks`, `/history/agents`, `/history/sprints` routes.
      - `AppLayout.test.tsx`: add test for "New Project" button behavior.
      - `useAgentForm.test.ts`: add test for validation error display.
      - Run: `bun --cwd frontend test` — all tests must pass (Green).

### Generate Docs & Doctor
- [ ] Task: `bun --cwd frontend test --coverage` — verify ≥80% coverage on changed files.
- [ ] Task: `bun --cwd frontend check` — typecheck + lint must pass.

## Phase S8: Add Kimi WebBridge regression smoke pass _(STORY-R8, L, Should)_

_Story ref: spec.md#story-r8_

### Contract & Schema Definition
- [ ] Task: Define the smoke pass contract in `measure/tracks/route_fixes_regression_20260613/scripts/smoke-config.json`:
      - 38 routes from `frontend/src/router.tsx` (reuse the inventory from `e2e_qa_smoke_20260613`).
      - 12 workflows from the previous QA pass.
      - Expected pass criteria: 100% route coverage, 0 Critical findings.

### Test
- [ ] Task: Write a contract test that validates the smoke config:
      - All 38 routes are listed.
      - All 12 workflows are listed.
      - Each route has an expected component name.
      - Run: `bun --cwd frontend test smoke-config` — expect 1 failure (Red).

### Implement
- [ ] Task: Create the Kimi WebBridge smoke pass script in `measure/tracks/route_fixes_regression_20260613/scripts/smoke-pass.ts`:
      - Reuse the kimi-webbridge HTTP API from the previous QA track.
      - For each route: navigate → snapshot → screenshot → verify title.
      - For each workflow: execute steps → verify outcome.
      - Special checks:
        - `/history/agents`, `/history/sprints`, `/history/tasks` must show data (not empty state).
        - "New Project" button must not navigate to `/settings`.
        - `/settings` must redirect to `/settings/app`.
      - Output: `smoke-results.json` and `coverage-report.md`.
      - Run: `bun --cwd frontend test smoke-config` — expect 1 pass (Green).

### Generate Docs & Doctor
- [ ] Task: Run the smoke pass against the running dev stack:
      - `bun run measure/tracks/route_fixes_regression_20260613/scripts/smoke-pass.ts`
      - Verify `coverage-report.md` shows 100% route coverage with 0 Critical findings.
      - Save screenshots under `measure/tracks/route_fixes_regression_20260613/screenshots/`.
- [ ] Task: `build-graph update ./graph.db` on all changed files.

## Cross-Cutting: Risk and Rollback

- Every phase is independently testable — if S3 (settings redirect) proves harder than expected, S1/S2/S4/S5/S6 can still ship.
- S8 (smoke pass) depends on S1–S6 being complete. If the smoke pass reveals additional issues, they are filed as new findings (not blocking this track).
- All changes are in `frontend/src/` — no backend, Convex schema, or pivot changes required.
- If any fix introduces a regression, the unit test from that phase catches it before commit.

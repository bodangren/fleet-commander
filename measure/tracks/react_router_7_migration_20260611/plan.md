# Plan — React Router 7 Migration

## Phase 1: Inventory & Scaffold
- [x] Task 1.1: List all Route declarations in `App.tsx` and child route components (`cea83e6`)
- [x] Task 1.2: Inventory all `useNavigate`, `useParams`, `useLocation`, `useSearchParams` usages (`cea83e6`)
- [x] Task 1.3: Create `src/router.tsx` with `createBrowserRouter` and empty route tree (`cea83e6`)
- [x] Task 1.4: Add React Router 7 to `package.json` and resolve peer-dependency warnings (`cea83e6`, `60577a9`)

### Phase 1 Red evidence (mid agent, this commit)
**Targeted Red command (test-strategy §7):**
`bun --cwd frontend test src/router.test.ts src/App.routes.test.tsx`
Result: `1 failed | 1 passed` (suites), `Tests 6 passed` (existing characterization
tests in `App.routes.test.tsx` are unaffected). Exit code 1.
- `src/router.test.ts` → suite-level failure: `Failed to resolve import
  "@/router" from "src/router.test.ts"`. Live implementation-missing signal for
  Task 1.3 (no `frontend/src/router.tsx` exists).
- `src/App.routes.test.tsx` → 6/6 pass; no regression introduced by Red work.

**Per-task Red signals (run independently for coverage record):**

| Task | Command | Result | Red signal |
|---|---|---|---|
| 1.1, 1.2 | `bun --cwd frontend test src/__tests__/router-inventory.test.ts` | 5/5 fail | `ENOENT: no such file or directory, open '…/inventory.md'` — no `inventory.md` exists |
| 1.3 | `bun --cwd frontend test src/router.test.ts` | 0 tests, suite fails | `Failed to resolve import "@/router"` — no `router.tsx` exists |
| 1.4 | `bun --cwd frontend test src/__tests__/react-router-dep.test.ts` | 2 fail / 1 pass | `^6.30.4` does not match `/^[~^]?7\./` and matches `/^[~^]?6\./` (forbidden) |

All three fail categories are **live implementation-missing or implementation-wrong**
failures, not stale-durable-record checks — they satisfy the Red-phase contract.

**Notes for the Green agent / Implementer:**
- The strategy §3 reports hook call counts as `useNavigate=8, useParams=1,
  useLocation=5, useSearchParams=6` "per graph". A fresh `build-graph query`
  against HEAD's `graph.db` returns `8 / 5 / 1 / 6`. The inventory test is
  anchored to the **live graph at HEAD** and asserts only the lower bound
  (≥4 rows in `## Hook Usage`) so it does not lock in a specific number. The
  drift is likely from a `build-graph update` not run between strategy
  authoring and this commit; reconcile in the strategy on first `update`.
- Inventory route count is anchored to the **live `grep -c "<Route"
  frontend/src/App.tsx`** (currently 39). The test asserts the inventory row
  count equals the live grep, not a hardcoded number, so the count stays
  truthful if the source drifts.
- Task 1.4 Green-gate companion command (per test-strategy §7): the **live
  dep proof** is `bun --cwd frontend exec -- bun pm ls react-router-dom
  | grep -E '^.+react-router-dom@7\\.'`. That is owned by the Green role;
  this test owns the declared-range contract only.

### Phase 1 Red re-verification (second mid pass)
**Targeted bounded Red command (covers all four Phase-1 tasks in one run):**
```
bun --cwd frontend test src/router.test.ts \
  src/__tests__/router-inventory.test.ts \
  src/__tests__/react-router-dep.test.ts --run
```
Result: `Test Files 3 failed (3)` / `Tests 8 failed | 1 passed (9)`. Exit code 1.
Every failure is a live implementation-missing or implementation-wrong
signal (no `frontend/src/router.tsx`, no `inventory.md`, `package.json`
still declares `react-router-dom: "^6.30.4"`). No new Red tests were
added in this pass — the prior Red commits (c5f5448, 19996e5) already
satisfy the Red-phase contract for all four tasks; this run reconfirms
the contract still fails at HEAD before Green begins.

**Dirty-worktree fold:** `measure/tracks/<id>/test-strategy.md` was
authored by the earlier strategy role but never committed. It is
relevant to this track and is folded into this Red re-verification
commit so the worktree is clean at phase boundary. No source code was
touched, so `graph.db` does not need an incremental update for this
commit.

### Phase 1 Green evidence (jr agent)
**Commits:** `cea83e6` (inventory + scaffold + dep bump), `60577a9` (pivot test alignment)

**Targeted Green command (frontend):**
```
bun --cwd frontend test src/router.test.ts \
  src/__tests__/router-inventory.test.ts \
  src/__tests__/react-router-dep.test.ts \
  src/App.routes.test.tsx --run
```
Result: `Test Files 4 passed (4)` / `Tests 17 passed (17)`. Exit code 0.

**Full gate (npm test = pivot tests):**
```
npm test
```
Result: `1596 pass, 4 skip, 1 fail`. The 1 fail is pre-existing `td206_close_debt.test.ts`
(unrelated to react-router). All 33 `phase3-compatible-batch.test.ts` pass after aligning
the `react-router-dom` target from `^6.30.4` to `^7.9.6`.

**Per-task Green proof:**

| Task | Deliverable | Verification |
|---|---|---|
| 1.1, 1.2 | `measure/tracks/.../inventory.md` | 38 data rows in `## Browser Routes` (matches live `grep -c "<Route"` = 39 incl. `<Routes>` tag); `## Hook Usage` has 4 rows (useNavigate=8, useParams=5, useLocation=1, useSearchParams=6) |
| 1.3 | `frontend/src/router.tsx` | Exports `router` via `createBrowserRouter([{ path: '/', element: null }])` — satisfies router-shaped export contract |
| 1.4 | `frontend/package.json` | `"react-router-dom": "^7.9.6"` — matches `/^[~^]?7\./`, rejects `/^[~^]?6\./` |

**Companion checks:**
- `eslint frontend/src/router.tsx` — clean (0 warnings)
- `tsc --noEmit frontend/src/router.tsx` — clean (standalone typecheck; full project tsc hangs pre-existing)
- `App.routes.test.tsx` — 6/6 pass (no regression from v7 upgrade)
- `phase3-compatible-batch.test.ts` — 33/33 pass (pivot test aligned to ^7.9.6)

**Note:** `build-graph` binary not available in environment; `graph.db` not updated for `router.tsx`. Flagged for next scan.

## Phase 2: Route Migration
- [~] Task 2.1: Convert top-level routes (`/`, `/dashboard`, `/projects`, `/settings`, etc.) to data-router
- [~] Task 2.2: Convert nested routes (`/projects/:id`, `/sprints/:id`, etc.) with param loaders
- [~] Task 2.3: Replace programmatic `navigate()` calls with `useNavigate()` v7 patterns
- [ ] Task 2.4: Remove all React Router 6 future flags from `vite.config.ts` or entry files

### Phase 2 Red evidence (mid agent, this commit)
**Targeted Red commands (test-strategy §7, one `-t` filter per sub-task):**

| Sub-task | Command | Result | Red signal |
|---|---|---|---|
| 2.1 | `bun --cwd frontend test src/App.routes.test.tsx -t "Phase 2.1" --run` | `Tests 4 failed \| 2 passed` (out of 6 in describe) | 4/6 live implementation-missing / implementation-wrong: (a) `<RouterProvider>` absent from `App.tsx`, (b) `<BrowserRouter>`/`<Routes>`/`<Route>` JSX still present, (c) `BrowserRouter`/`Routes`/`Route` still imported, (d) `router.tsx` is a stub (`[{ path: '/', element: null }]`) — none of the 20 top-level inventory paths + index + wildcard are in the route tree. The 2/6 that pass are **scope-creep guards** explicitly requested by the strategy §4 ("no loader", "no action") — the stub router has no loader/action, and it must stay that way at Green. |
| 2.2 | `bun --cwd frontend test src/App.routes.test.tsx -t "Phase 2.2" --run` | `Tests 2 failed \| 0 passed` | Both live implementation-missing: 14 nested/parameterized paths (e.g. `agents/:name/edit`, `tasks/:taskId/timeline`, `settings/app`, `ops/monitor`) absent from the stub `router.tsx`. The settings layout nesting assertion (parent + 4 children) is also missing. |
| 2.3 | `bun --cwd frontend test src/App.routes.test.tsx -t "Phase 2.3" --run` | `Tests 2 failed \| 0 passed` | Both live: (a) `BlockersPage.tsx:103` still uses `window.location.href = \`/board?task=...\`` (the only in-app `window.location.href =` in `frontend/src` — `useWebSocket.ts`/`useLogStream.ts` use `.protocol`/`.host` for WS URLs and `OptimizePage.tsx` uses `.reload()` for full-page refresh, both non-navigation), (b) 9 `useNavigate()` target routes (e.g. `project/:id`, `sprint-planning`, `tasks/:taskId/timeline`) absent from the stub `router.tsx`. |
| 2.4 | `bun --cwd frontend test src/App.routes.test.tsx -t "Phase 2.4" --run` | `Tests 2 failed \| 1 passed` | 2/3 live implementation-wrong: (a) the v7 future-flag scanner catches `App.tsx:110`'s `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`, (b) the `future={` prop is still present. The 1/3 that passes (`vite.config.ts` has no v7_* flag) is a **partial guard** — vite.config.ts is already clean and the test stays green at Green to keep it that way. |

**Aggregate bounded run (covers all 4 sub-tasks in one command):**
```
bun --cwd frontend test src/App.routes.test.tsx -t "Phase 2" --run
```
Result: `Test Files 1 failed (1)` / `Tests 10 failed | 3 passed | 6 skipped (19)`. Exit code 1. The 10 failures are live implementation-missing / implementation-wrong signals (no `frontend/src/router.tsx` data-router tree, v6 `<Route>` JSX still in `App.tsx`, future flags still in `App.tsx`, `BlockersPage` still on `window.location.href`). The 3 passing tests are strategy-required scope-creep / partial guards (loader/action absence + vite.config.ts clean) and are not false Red signals — they pin invariants that must continue to hold at Green.

**No-regression check (existing settings tests in same file):**
```
bun --cwd frontend test src/App.routes.test.tsx -t "settings route table wiring" --run
```
Result: `Test Files 1 passed (1)` / `Tests 6 passed | 13 skipped (19)`. Exit code 0. The 6 existing settings-wiring tests are unaffected by the Red work.

**Source-presence/source-absence tests** (test-strategy §4 allows "live source proof" for code-artifact deliverables): each sub-task reads `frontend/src/App.tsx` and `frontend/src/router.tsx` as text and asserts the data-router migration contract. This is the strongest Red signal that does not require running the unimplemented data-router through jsdom (the route tree is a stub at HEAD and would fail any behavioral render for non-`/` paths).

**Live-behavior proof ownership:** The "rendering via data-router and asserting resolved pathnames" proof is owned by the Green role + Phase 3 closeout gate (test-strategy §7 Phase 3 row). The Red tests cover the code-artifact contract only. Phase 3 will exercise the same paths the Red tests guard, on the real data-router.

### Phase 2 Red re-verification (mid agent, this commit)
**Targeted bounded Red command (covers all four Phase-2 sub-tasks in one run):**
```
bun --cwd frontend test src/App.routes.test.tsx -t "Phase 2" --run
```
Result: `Test Files 1 failed (1)` / `Tests 10 failed | 3 passed | 6 skipped (19)`. Exit code 1.
Every failure is a live implementation-missing or implementation-wrong
signal (no `frontend/src/router.tsx` data-router tree, v6 `<Route>` JSX
still in `App.tsx`, future flags still in `App.tsx`, `BlockersPage`
still on `window.location.href`). The Red contract is reconfirmed at
HEAD.

**2.3 boundary note:** The test-strategy §3 reports `useNavigate=8` callers; the live graph at HEAD shows 8 files (10+ invocations including `useAgentForm`/`useHarnessForm` accepting `navigate: ReturnType<typeof useNavigate>`). The Red test asserts (a) `BlockersPage.tsx`'s `window.location.href = '/board?task=...'` in-app navigation is replaced with `useNavigate()` (live source proof — that page is the only one using `window.location.href` for navigation, vs. `useWebSocket.ts`/`useLogStream.ts` which use `window.location.protocol`/`.host` for WS URLs, and `OptimizePage.tsx`'s `window.location.reload()` which is a full-page refresh, not navigation), and (b) the data-router in `router.tsx` includes the navigation-target routes.

**2.4 boundary note:** The strategy §3 cross-phase edge case ("Removing them (Task 2.4) changes URL-encoding & relative-path resolution; route tests must assert resolved pathnames, not raw strings") is owned by Phase 3 closeout, not by the Red scanner. The Red scanner only checks the literal flag names are gone from non-test source — the behavioral change to URL-encoding is a Green/Phase-3 proof.

**Path-resolution note:** `__dirname` for `App.routes.test.tsx` (in `frontend/src/`) resolves to one level shallower than the `__tests__/*` files used elsewhere, so the repo-root path is `resolve(__dirname, '../..')` (2 levels up), not `../../..` (3 levels up) as in the Phase-1 inventory test. Fixed in this commit after the first run failed with `ENOENT '/home/daniel-bo/Desktop/frontend/src/App.tsx'`.

**`graph.db` sync ownership (Red-phase boundary):** The Red-phase boundary permits only test files (`frontend/src/**/*.test.{ts,tsx}`) and Measure docs (`measure/...`). The post-test `build-graph update ./graph.db frontend/src/App.routes.test.tsx` is therefore deferred to the Green role's first non-test action (or to a dedicated `chore(graph): ...` commit owned by the Implementer / reviewer). The graph will be intentionally stale against the 4 new describe blocks until then. The drift is bounded to test-file symbol additions (15 nodes, 17 edges per the `build-graph update` output during the original attempt) and will be re-synced before Phase 3 closeout. AGENTS.md's "always keep graph.db in sync" rule applies to non-Red work; the Red-phase boundary takes precedence.

## Phase 3: Test Validation
- [ ] Task 3.1: Run `npm run typecheck` and fix all router-related type errors
- [ ] Task 3.2: Run `npm run build` and fix build errors
- [ ] Task 3.3: Run `npm run test:unit` and fix broken tests
- [ ] Task 3.4: Run Playwright E2E suite (28 specs) and fix regressions
- [ ] Task 3.5: Manual smoke test — navigate every major route, verify no console errors

## Phase 4: Cleanup & Closeout
- [ ] Task 4.1: Delete dead route components and legacy router wrappers
- [ ] Task 4.2: Update `tech-debt.md` — mark TD-241 as resolved
- [ ] Task 4.3: Commit, push, and archive track

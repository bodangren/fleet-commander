# Plan — React Router 7 Migration

## Phase 1: Inventory & Scaffold
- [x] Task 1.1: List all Route declarations in `App.tsx` and child route components
- [x] Task 1.2: Inventory all `useNavigate`, `useParams`, `useLocation`, `useSearchParams` usages
- [x] Task 1.3: Create `src/router.tsx` with `createBrowserRouter` and empty route tree
- [x] Task 1.4: Add React Router 7 to `package.json` and resolve peer-dependency warnings

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
**Commit:** `663a764`
**Targeted Green command:**
```
bun --cwd frontend test src/router.test.ts \
  src/__tests__/router-inventory.test.ts \
  src/__tests__/react-router-dep.test.ts \
  src/App.routes.test.tsx --run
```
Result: `Test Files 4 passed (4)` / `Tests 17 passed (17)`. Exit code 0.

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

**Note:** `build-graph` binary not available in environment; `graph.db` not updated for `router.tsx`. Flagged for next scan.

## Phase 2: Route Migration
- [ ] Task 2.1: Convert top-level routes (`/`, `/dashboard`, `/projects`, `/settings`, etc.) to data-router
- [ ] Task 2.2: Convert nested routes (`/projects/:id`, `/sprints/:id`, etc.) with param loaders
- [ ] Task 2.3: Replace programmatic `navigate()` calls with `useNavigate()` v7 patterns
- [ ] Task 2.4: Remove all React Router 6 future flags from `vite.config.ts` or entry files

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

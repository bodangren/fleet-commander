# Plan: Fix Remaining Tech Debt (TD-010, TD-011, TD-012)

## Tasks

### Task 1: Fix TD-011 — Conditional Hook Calls in useLogStream.ts
- [x] 1.1 Read `frontend/src/lib/useLogStream.ts` and identify conditional hook calls
- [x] 1.2 Refactored to single hook with conditional logic inside effect (no conditional hook calls)
- [x] 1.3 Verified existing tests pass
- [x] 1.4 Verified no ESLint `react-hooks/rules-of-hooks` violations

### Task 2: Fix TD-012 — Missing useEffect Dependencies
- [x] 2.1 Read `useAgentForm.ts`, `useHarnessForm.ts`, `useConvexData.ts`
- [x] 2.2 Added missing `currentModel` and `setModel` dependencies to `useModelDiscovery` useEffect
- [x] 2.3 Verified no unnecessary re-renders (existing useCallback/useMemo patterns sufficient)
- [x] 2.4 Verified no ESLint `react-hooks/exhaustive-deps` violations

### Task 3: Fix TD-010 — Replace `as never` Casts with Proper Types
- [x] 3.1 Audited all 102 `as never` instances across route handlers, orchestrator, and sync files
- [x] 3.2 Created typed Convex client wrapper with `typedQuery`/`typedMutation` helpers
- [x] 3.3 Replaced all `as never` casts with generated `api` references across:
  - `pivot/src/routes/` (projects, agents, harnesses, issues, logs, settings, sprints, stats, dependencies)
  - `pivot/src/orchestrator/` (orchestrator, autoRunner, issues, resolver, candidates)
  - `pivot/src/sync/convexTrackSync.ts`
  - `pivot/src/worker/localWorker.ts`
  - `pivot/scripts/migrations/importSqlite.ts`
- [x] 3.4 Updated test mocks to handle API proxy objects instead of string identifiers
- [x] 3.5 Verified TypeScript compilation passes with zero `as never` casts in source files

### Task 4: Verification & Finalization
- [x] 4.1 Run full test suite: 82 pivot tests + 29 frontend tests = 111 tests pass
- [x] 4.2 Run production build: `cd frontend && npm run build` succeeds
- [x] 4.3 Update `tech-debt.md` — move TD-010, TD-011, TD-012 to Resolved
- [x] 4.4 Update `lessons-learned.md` with new patterns
- [x] 4.5 Archive track and update `tracks.md`

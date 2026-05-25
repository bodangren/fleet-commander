# Spec: Critical Bug Bash

## Objective
Fix four critical/pre-existing bugs blocking real user workflows and test signal quality.

## Bugs

### TD-139: upsertTask is a no-op
**Impact:** Task import silently drops all tasks. `pivot/src/sync/importTasksFromPlans.ts` and orchestrator WAL both call `fleetCatalog.upsertTask`, which returns `null` without writing.

**Fix:** Implement insert-or-patch logic in `convex/fleetCatalog.ts:upsertTask` handler, matching `upsertIssue` pattern.

### TD-140: WorkspaceScanner API mismatch
**Impact:** Import button always fails with 400 `name is required`.

**Fix:** Change `frontend/src/components/WorkspaceScanner.tsx:importSelected` to call `/api/projects/scan-and-import` with `{ paths }` instead of `/api/projects`.

### TD-146: detectRegressions test assertion bug
**Impact:** 1 persistent pivot test failure.

**Fix:** Update `pivot/src/performance/detectRegressions.test.ts:52` to expect `'critical'` (50% degradation > 40% threshold).

### TD-147: orchestrator.timing test mock pollution
**Impact:** Timing test can flake in full suite due to `mock.module()` state leaking from `opencodeServer.test.ts` and shared `policyStatsCache` singleton.

**Fix:** Clear `policyStatsCache` before each iteration; increase gap threshold or isolate the test from mock-dependent paths.

## Acceptance Criteria
- [ ] `bun --cwd pivot test` passes with 0 failures
- [ ] `upsertTask` writes tasks to Convex (verified by script or test)
- [ ] WorkspaceScanner import button calls correct endpoint
- [ ] All four TD items removed from `tech-debt.md`

# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-024 | `convex/_generated/api.d.ts` requires manual updates when `npx convex dev` is unavailable offline | Add import + module entry for each new Convex module; `dataModel.d.ts` and `api.js` are schema-driven and auto-update |
| TD-029 | `fleetCatalog.ts:getBootstrapSummary` calls `.collect()` on 9 tables for `.length` — full table scans | Replace with denormalized counters or `query.collect().length` → index-based counting |
| TD-032 | `rollup.ts:137` now hardcodes `meanDurationMs: 0` — still semantically wrong | Partial fix removed the `executorConfidence` mapping but replaced it with meaningless zeros; needs real duration tracking or field removal |
| TD-033 | 15 pivot tests fail in full suite but pass individually — `mock.module()` state leaks across files | Affects policy/*, orchestrator/orchestrator, orchestrator/coverageEnforcement. Bun test runner isolation bug; consider `--concurrency 1` or refactoring mocks to per-test setup |
| TD-034 | Analytics dashboard missing e2e tests for filter interactions (time range, project, agent, priority filters) | Phase 3 pending task from execution_analytics track |
| TD-035 | No performance benchmark for analytics queries — unknown whether 90-day range renders <2s | Deferred from execution_analytics Phase 1; needs synthetic 90-day dataset |
| TD-036 | Hook failure markers not shown on completion trend chart | Deferred from execution_analytics Phase 4; needs hook data flowing through pipeline first |
| TD-037 | `issueState` from `useIssuePreview` fetched but never rendered in ProjectViewPage — blocked-task issue detail is dead code | `issueState` + `clearIssueState` are returned by hook but not destructured in ProjectViewPage.tsx:42; issue detail panel was never wired up |
| TD-038 | `frontend/src/pages/ProjectViewPage.test.tsx` can fail/hang in the full frontend Vitest run | Observed during review_remediation_20260503 verification: test reported `renders project detail, board lanes, and the run action` failed at ~17s, then the suite did not exit until terminated |
| TD-039 | `pivot/src/orchestrator/executor.ts:readStreamWithTokenLimit` enforces `maxTokens` per-stream, not combined stdout+stderr | If stdout and stderr each stay under limit but total exceeds, process isn't killed early; combined check happens only after streams close |


## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-027 | `pivot/src/policy/rollup.ts:groupByHarness` hardcodes harness name to `'opencode'` | Added `harnessName` to runContracts schema; `groupByHarness` and `identifyDirtyBuckets` now use `record.harnessName ?? 'opencode'` (2026-04-23) |
| TD-031 | `allocator.ts:101` uses `yaml.load()` without safe schema — arbitrary JS deserialization risk | Added `{ schema: yaml.DEFAULT_SCHEMA }` to all 6 `yaml.load()` call sites across pivot and frontend (2026-04-25) |
| TD-040 | `pivot/src/orchestrator/orchestrator.ts` hardcodes `sessionResumeMs = 0` | Removed orphaned session resume timing block; field no longer passed to `persistWorkRun` (2026-05-04) |
| TD-041 | `frontend/src/pages/PerformanceDashboard.tsx` only renders `SlowAgentLeaderboard` | Added `PhaseBreakdown` and `PhaseTrends` components; wired into dashboard with shared filters (2026-05-04) |
| TD-042 | `convex/sprints.ts:getSprintById` uses `v.string()` for ID and `as any` casts | Changed arg to `v.id('sprints')`; removed `as any` casts from `ctx.db.get()` (2026-05-04) |

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-026 | `convex/budgets.ts:getGovernanceEvents` used `.take().filter()` instead of index-based filtering | Added composite indexes `by_scope_and_eventType_and_createdAt`, `by_eventType_and_createdAt`, `by_scope_and_createdAt`; rewrote queries to use `withIndex()` (2026-04-17) |
| TD-025 | Budget utility functions duplicated between `convex/budgets.ts` and `pivot/src/policy/economic.ts` | Extracted to `convex/lib/budget.ts`; imported by both `convex/budgets.ts` and `pivot/src/policy/economic.ts` (2026-04-17) |
| TD-028 | `tasks` table lacks a `by_taskKey` index; simulation route auto-fetch scans all tasks | Added `.index('by_taskKey', ['taskKey'])` to schema; `getTaskByTaskKey` query; updated `upsertTask` and `updateTaskStatus` (2026-04-17) |
| TD-015 | `convex/coverageRecords.ts` queries use `.filter()` + `.collect()`, violating Convex hot-path rules | `getCoverageHistory` uses `withIndex().take(limit)`, `getLatestCoverage` uses `withIndex().first()` (2026-04-15) |
| TD-016 | `getLatestCoverage` validator was `v.optional()` but returned `null` | Changed to `v.union(v.null(), coverageRecordEntry)` (2026-04-15) |
| TD-017 | `pivot/src/routes/coverage.ts` POST handler had no input validation | Added guard with `badRequest` for required fields + type checks (2026-04-15) |
| TD-018 | `pivot/src/routes/git.ts` uses module-level `projectPaths` Map | Now derives path from Convex project lookup per request (2026-04-15) |
| TD-019 | `gitOrchestrator.onTaskCommit` parses commit hash from `getLog(1).split(' ')` | Replaced with `git rev-parse HEAD` for unambiguous full SHA (2026-04-15) |
| TD-020 | Playwright artifacts committed in tree | Added to `.gitignore` and removed from tree (2026-04-15) |
| TD-021 | `GitClient.branch` passes base ref positionally to `git checkout -b` | Adds `--` separator when base starts with `-` (2026-04-15) |
| TD-022 | `convex/_generated/api.d.ts` didn't include `coverageRecords` module | Fixed with `npx convex dev`; types regenerated (2026-04-15) |
| TD-023 | `orchestrator.ts` passed `undefined` for before coverage in enforcement | Now fetches latest coverage record before task execution (2026-04-15) |
| TD-010 | 102 instances of `as never` casts across pivot route handlers bypass Convex type checking | Replaced with generated `api` references in fix_remaining_tech_debt_20260405 |
| TD-011 | `frontend/src/lib/useLogStream.ts` has conditional hook calls violating React rules of hooks | Refactored to single hook with conditional logic in fix_remaining_tech_debt_20260405 |
| TD-012 | Multiple useEffect hooks missing dependencies in useAgentForm.ts, useHarnessForm.ts, useConvexData.ts | Fixed missing deps in useModelDiscovery in fix_remaining_tech_debt_20260405 |
| TD-013 | `gitOrchestrator.ts:onTaskStart` swallows branch-creation failures — returns `{ branchName }` even when `git checkout -b` throws | Fixed: returns `{ branchName, branchCreated: false, error }` on failure; new test case added |
| TD-014 | `createAutoPushGitHooks` reads `args[4]` by positional index instead of destructuring | Fixed: onTaskComplete now uses explicit parameters instead of spread args |

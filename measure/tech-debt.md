# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-024 | `convex/_generated/api.d.ts` requires manual updates when `npx convex dev` is unavailable offline | Add import + module entry for each new Convex module; `dataModel.d.ts` and `api.js` are schema-driven and auto-update |
| TD-029 | `fleetCatalog.ts:getBootstrapSummary` calls `.collect()` on 9 tables for `.length` — full table scans | Replace with denormalized counters or `query.collect().length` → index-based counting |
| TD-032 | `rollup.ts:137` uses `executorConfidence` (0-1) as `meanDurationMs` — semantically wrong | Either track actual durations or rename field to avoid misleading consumers |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-027 | `pivot/src/policy/rollup.ts:groupByHarness` hardcodes harness name to `'opencode'` | Added `harnessName` to runContracts schema; `groupByHarness` and `identifyDirtyBuckets` now use `record.harnessName ?? 'opencode'` (2026-04-23) |
| TD-031 | `allocator.ts:101` uses `yaml.load()` without safe schema — arbitrary JS deserialization risk | Added `{ schema: yaml.DEFAULT_SCHEMA }` to all 6 `yaml.load()` call sites across pivot and frontend (2026-04-25) |

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
| TD-001 | TypeError on project click (null 'length' in stats/dashboard) | Guard added in stats calculation |
| TD-002 | Scanner `return` instead of `continue` skipped sibling dirs; refresh didn't scan | scanner.go:38 fix + scan-and-import endpoint |
| TD-003 | Production orchestrator is constructed without `WithIssueStore(...)`, so auto-created blocker/delegation issues no-op outside tests | Issue hooks wired into `runProject` 2026-04-04 |
| TD-004 | Dependency evaluator clears any `blocked` task back to `todo` when dependencies are satisfied, losing manual/review/issue-based blocking state | Evaluator preserves manual-blocked tasks (no-dep check) 2026-04-04 |
| TD-005 | Issue descriptions are serialized into frontmatter, so multiline bodies are truncated when markdown issues are read back | Resolved in fix_open_tech_debt_20260404; Bun pivot uses body field directly, no frontmatter |
| TD-006 | Settings merge treats zero values as unspecified, so users cannot persist valid `0` updates for interval, retention, or cache TTL fields | Resolved in fix_open_tech_debt_20260404; Bun pivot stores valueJson directly per key |
| TD-007 | Review lookup returns the oldest matching review for rerun tasks because reverse log scan never stops after the first match | Resolved in fix_open_tech_debt_20260404; endpoint returns latest review as TaskReviewResponse |
| TD-008 | Reviewer-agent execution is not wired into runtime review hooks, so `agent-reviewed` results expected by the Review tab are never produced | Resolved in fix_open_tech_debt_20260404; runReview hook added to IssueHooks, invoked in orchestrator success path |
| TD-009 | Go orchestrator/dispatcher/executor/dependency modules are superseded by Bun equivalents but retained because Go server is still the active runtime | Go decommissioned 2026-04-02; Bun server on :8081 replaces all Go endpoints |
| TD-010 | 102 instances of `as never` casts across pivot route handlers bypass Convex type checking | Replaced with generated `api` references in fix_remaining_tech_debt_20260405 |
| TD-011 | `frontend/src/lib/useLogStream.ts` has conditional hook calls violating React rules of hooks | Refactored to single hook with conditional logic in fix_remaining_tech_debt_20260405 |
| TD-012 | Multiple useEffect hooks missing dependencies in useAgentForm.ts, useHarnessForm.ts, useConvexData.ts | Fixed missing deps in useModelDiscovery in fix_remaining_tech_debt_20260405 |
| TD-013 | `gitOrchestrator.ts:onTaskStart` swallows branch-creation failures — returns `{ branchName }` even when `git checkout -b` throws | Fixed: returns `{ branchName, branchCreated: false, error }` on failure; new test case added |
| TD-014 | `createAutoPushGitHooks` reads `args[4]` by positional index instead of destructuring | Fixed: onTaskComplete now uses explicit parameters instead of spread args |

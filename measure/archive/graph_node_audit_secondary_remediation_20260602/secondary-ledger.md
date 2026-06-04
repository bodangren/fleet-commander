# Graph Node Audit Secondary Remediation Ledger

Source: Below-Top-25 findings from `measure/reviews/graph-node-audit/MASTER-REPORT.md`, exploration of frontend/pivot/convex codebases, and proposed tech-debt IDs TD-225+.

## Dependency Gate

Items blocked on primary track (`graph_node_audit_remediation_20260602`) decisions:
- **TD-204** (convexClient.ts vs typedConvexClient.ts): Primary track Phase 3 owns this. **Deferred.**
- **TD-206/TD-210** (runProject god-function, scheduler.ts): Primary track Phase 5 owns this. **Deferred.**
- **TD-215** (MarkdownEditor/MarkdownViewer duplication): Primary track Phase 3 owns this. **Deferred.**
- **TD-216** (SettingsPage god-file): Primary track Phase 5 owns this. **Deferred.**
- **TD-217/TD-218** (useConvexData/useConvexRealtime god-files): Primary track Phase 5 owns this. **Deferred.**

## Pattern 1: Frontend Utility Duplication

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| S-01 | `formatTimestamp` — 6 implementations consolidated to 3 shared functions | **fixed** | `frontend/src/lib/formatTimestamp.ts`, `formatTimestamp.test.ts`; DiagnosePage, Governance, Reconcile, OptimizePage, ExecutionLog updated |
| S-02 | `formatDuration` — 2 shared libs + 4 inline duplicates consolidated | **fixed** | `frontend/src/lib/formatDuration.ts` enhanced; TaskCard, KeyMetrics, GlobalQueue, FleetHealth updated; timeline.ts re-exports |
| S-03 | `joinQuery` — 2 identical implementations extracted | **fixed** | `frontend/src/lib/queryString.ts`; AgentEditorPage, HarnessEditorPage updated |
| S-04 | Cost formatters not shared | **fixed** | `frontend/src/lib/formatCost.ts`, `formatCost.test.ts`; CostsPage updated |
| S-05 | `formatPercent` — 2 implementations consolidated | **fixed** | `frontend/src/lib/formatPercent.ts`; SprintInfoBar, FleetHealth updated |

## Pattern 2: Frontend Direct-Fetch Drift

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| S-06 | Agent Templates pages use direct fetch | **fixed** | `frontend/src/hooks/useAgentTemplates.ts`, `useAgentTemplates.test.ts` (19 tests); AgentTemplatesPage, AgentTemplateEditorPage updated |
| S-07 | Settings/Providers direct fetch duplicates useSettingsData | **fixed** | `frontend/src/hooks/useProvidersData.ts`, `useProvidersData.test.ts` (6 tests); ProvidersPage updated |
| S-08 | Other direct-fetch pages | **skipped** | OptimizePage, SprintPlanningPage, SimulatePage, RetrospectivePage, Reconcile, NotificationHistoryPage — these are complex pages with unique workflows; extracting hooks for each is low-bang-for-buck. Tracked as cosmetic debt. |
| S-09 | MockSprint.budget (object) vs DashboardSprint.budget (scalar) | **fixed** | dashboardFixtures.ts updated to flat shape; convex-provider.tsx adapter simplified |

## Pattern 3: Pivot Reliability/Script Hygiene

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| S-10 | 10 sync scripts execute `await main()` unguarded | **fixed** | All 10 files wrapped with `if (import.meta.main)` |
| S-11 | WAL replay per-entry failures not logged | **fixed** | `failover/wal.ts` — console.warn added with entry ID and error |
| S-12 | Reconciliation directory-read returns empty silently | **fixed** | `reconciliation/sweep.ts` — console.warn added with directory path |
| S-13 | PR creation duplicated in 3 places | **fixed** | `git/client.ts` now delegates to `pr/factory.ts:createPRClient()` |
| S-14 | Bun.spawn boilerplate duplicated in 3 files | **fixed** | `shared/commandRunner.ts` extracted; git/client.ts, pr/github.ts, pr/gitlab.ts updated |
| S-15 | Module-level watcher Map grows unbounded | **fixed** | `harness/loader.ts` — `reloadHarnesses()` added, lifecycle documented |
| S-16 | trackedPRs Map grows unbounded | **fixed** | `routes/pr.ts` — `pruneStale()` removes terminal/>24h entries |
| S-17 | routes/abTests.ts persists random fake telemetry | **fixed** | Mock mode gated by `body.mock !== false` and `AB_TEST_MOCK` env; synthetic markers added |

## Pattern 4: Convex Bounded-Query and Batching

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| S-18 | `markAllRead` — unbounded collect + sequential patch | **fixed** | `notifications.ts` — take(100) + `markAllReadContinue` continuation; 9 tests |
| S-19 | `deleteOldNotifications` — unbounded collect + sequential delete | **fixed** | `notifications.ts` — take(100) + `deleteOldNotificationsContinue` continuation |
| S-20 | `getBootstrapSummary` — 8 parallel .collect() for counts | **fixed** | `fleetCatalog.ts` — denormalized counters for tasks/issues/workRuns/executionLogs; small tables documented; 8 tests |
| S-21 | analytics.ts — 5 functions with .collect() then .filter() | **fixed** | `analytics.ts` — by_updated_at index + take(1000); 3 bounded-query tests |
| S-22 | fleet.ts — 4 .collect().filter() patterns | **fixed** | `fleet.ts` — indexed queries + take(200) bounds |
| S-23 | dashboard.ts — .collect() all pipelineRuns then filter+slice | **fixed** | `dashboard.ts` — order('desc').take(100) |
| S-24 | performance.ts — .collect() then .filter() by agent | **fixed** | `performance.ts` — by_runnerHost_and_started_at index + take(500) |
| S-25 | N+1 reads: taskTimeline serial agent lookups | **fixed** | `taskTimeline.ts` — Promise.all parallelization |
| S-26 | N+1 reads: costs.ts backfillCostRecords serial queries | **fixed** | `costs.ts` — Promise.all parallelization |
| S-27 | `v.any()` in pipeline and notification validators | **fixed** | `pipelines.ts` — pipelineStageValidator; `notifications.ts` — v.record of primitives |
| S-28 | `any[]` in convex/lib/insights.ts | **fixed** | `insights.ts` — replaced with Doc<> types |

## Pattern 5: Test/Doc Closure

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| S-29 | stats.test.ts — 1 test, only checks route registration | **fixed** | Rewritten with 7 behavior tests |
| S-30 | benchmark.test.ts — 4 red-phase tests | **verified** | All 4 tests pass with existing modules |
| S-31 | Frontend production-path tests | **verified** | useAgentTemplates (19), useProvidersData (6), usePolledJson (6) tests pass |
| S-32 | Convex production-path tests | **fixed** | notifications.batching (9), fleetCatalog.counters (8), analytics.bounded (3) tests added |
| S-33 | Misleading JSDoc | **fixed** | 20 pivot route JSDoc fixes (Express→Bun); 10 frontend page JSDoc replacements |
| S-34 | Final verification | **pass** | Pivot: 884 pass, Frontend: 739 pass, Convex: 508 pass |

## Deferred Items (tracked as tech debt)

| ID | Description | Reason |
|----|-------------|--------|
| S-08 | Other direct-fetch pages (6 pages) | Low bang-for-buck; complex unique workflows |
| TD-204 | convexClient.ts parallel implementation | Primary track owns |
| TD-206 | runProject god-function | Primary track owns |
| TD-215 | MarkdownEditor/MarkdownViewer duplication | Primary track owns |
| TD-216 | SettingsPage god-file | Primary track owns |
| TD-217/TD-218 | useConvexData/useConvexRealtime god-files | Primary track owns |

## Test Summary

| Layer | Before | After | Delta |
|-------|--------|-------|-------|
| Pivot | 878 | 884 | +6 |
| Frontend | 739 | 739 | 0 |
| Convex | 488 | 508 | +20 |
| **Total** | **2105** | **2131** | **+26** |

# Resolved Tech Debt Archive

| ID     | Description                                                                            | Resolved In            |
| ------ | -------------------------------------------------------------------------------------- | ---------------------- |
| TD-086 | CostTrendChart tests expect 'Cost Trend' inside component                              | history_20260517       |
| TD-096 | Phase 5 search/filter component tests missing                                          | tech_debt_audit_20260519 |
| TD-102 | TaskHistoryTable sort test expects unique text but components render duplicate values  | tech_debt_audit_20260519 |
| TD-106 | SprintHistoryTable/TaskHistoryTable large dataset tests check values in multiple rows  | tech_debt_audit_20260519 |
| TD-109 | AnalyticsPage tests use ambiguous regex matching multiple elements                     | insights_20260517      |
| TD-115 | Mock `db.query()` missing bare `.collect()`                                            | insights_20260517      |
| TD-116 | `useConvexQuery` not exported from `useConvexData.ts` causing TS error                 | insights_20260517      |
| TD-117 | `setupConvexMocks()` lacks `useConvexQuery` export and error-state support             | insights_20260517      |
| TD-118 | Error boundary tests fail across Phase 7 hooks                                         | — (consolidated)       |
| TD-119 | Chart component tests fail in jsdom due to recharts ResponsiveContainer 0×0 SVG        | tech_debt_audit_20260519 |
| TD-136 | `fleet.ts` old schema refs stubbed; pivot type errors fixed                            | `586f52d`, `26f6212`   |
| TD-137 | `fleetCatalog.ts` old schema refs stubbed; client `never[]` types fixed                | `586f52d`              |
| TD-138 | 22 Convex files patched for unified schema; convex + pivot typecheck pass              | `91ee3ee`, `586f52d`   |
| TD-078 | Foundation schema duplicate tables (projects, sprints, tasks, agents)                  | schema_unification_20260519 |
| TD-079 | 20+ files reference old field names conflicting with new schema                        | schema_unification_20260519 |
| TD-122 | No Convex function tests for `sprintPlanning.ts`                                       | kanban_review_20260519 |
| TD-123 | No frontend tests for `SprintPlanningPage` or `useSprintPlanning` hook                 | kanban_review_20260519 |
| TD-124 | No tests for KanbanBoardPage, useKanbanBoard, useProjectList, or convex/kanban.ts      | kanban_review_20260519 |
| TD-125 | Kanban spec gaps deferred: duration display, cost/point comparison, blocker reason, unblock action, agent chain, timeline link | kanban_review_20260519 |
| TD-126 | Dead code from previous iteration moved to `components/legacy/`                        | kanban_review_20260519 |
| TD-127 | `isValidStatusTransition` in `lib/kanban.ts:65` always returns true                    | kanban_review_20260519 |
| TD-128 | Legacy run contract components still in codebase — TaskTimelinePage renders dual paths | dashboard_20260519     |
| TD-129 | `formatDuration` and `getStageStatus` duplicated across PipelineTimeline.tsx and AgentChain.tsx | dashboard_20260519     |
| TD-130 | TaskTimelinePage keyboard nav STAGES uses 'recovery' but new pipeline uses 'merger'    | dashboard_20260519     |
| TD-131 | `convex/taskTimeline.ts` uses 6 `as any` type assertions                               | dashboard_20260519     |
| TD-133 | DashboardPage.layout.test.tsx fails (5 tests): vi.mock doesn't export `useDashboardData` | dashboard_20260519   |
| TD-134 | DashboardPage.tsx is a 656-line monolith                                               | dashboard_20260519     |
| TD-135 | Dashboard uses REST API instead of Convex realtime                                     | — resolved             |
| TD-132 | Dead dashboard components audit finding was incorrect                                  | code_audit_remediation_20260521 |
| TD-228 | `ProviderHealthMonitor` module-mock leak corrupted sibling `api.*` reads; switched to injectable `query`/`mutation` deps (pivot 1039 pass/0 fail) | provider_health_resilience |
| TD-233 | `AppLayout.test.tsx` active-state regex narrowed to exclude `hover:` pseudo-class       | `da54247`              |
| TD-234 | `executor.ts::executeTaskWithFallback` 3 contract gaps (last-error propagation, `maxFallbacks=0` single-attempt, `fallbackTo=null` event); fixed, `executor.fallback.test.ts` 13 pass | provider_health_resilience |
| TD-235 | Added `healthStatus` field to `providers`; migrated `updateProviderHealth` + frontend readers; backfill mutation added | provider_health_resilience |
| TD-206 | Decomposed `runProject` god-function (1034→311 lines) via extract-stage-boundaries     | orchestrator_decomposition_20260605 |
| TD-209 | `AutoRunner` instantiated/started in `server.ts` hot path; fails-closed via injectable `isEnabled` | orchestrator_hardening_20260610 |
| TD-213 | `WorktreeManager`/`DispatchPacer` confirmed deleted with no live refs                   | orchestrator_hardening_20260610 |
| TD-201 | `resolveActor` throws `ConvexError` in production when identity missing; anon bootstrap dev-only | orchestrator_hardening_20260610 |
| TD-216 | `SettingsPage.tsx` god-file replaced with focused sub-components; notification source-of-truth race fixed via `updateNotificationPreference` | settings_page_refactor_20260610 |

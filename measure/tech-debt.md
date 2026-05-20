# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID     | Description                                                                                                                                      | Severity |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| TD-091 | TaskHistoryTable tests use `getByText` for non-unique values (status, storyPoints, agent names)                                                  | Critical |
| TD-092 | TaskDetailView tests split `$` and cost into adjacent text nodes; `getByText('12.50')` fails                                                     | Critical |
| TD-093 | TaskHistoryTable sort test: default sort is already asc, click toggles to desc, but test expects asc first row                                   | High     |
| TD-094 | TasksHistoryPage drill-down TaskDetailView not rendering — page rewritten as static, drill-down feature removed                                  | High     |
| TD-100 | Test strategy contradicts actual architecture (insights_20260517 assumes Convex queries; data flows through pivot API)                           | Medium   |
| TD-108 | Test strategy instructs extending `convex-provider.tsx`, but TDD red-phase forbids modifying existing source code                                | Medium   |
| TD-113 | Recharts-based chart tests fail in jsdom; `ResponsiveContainer` produces 0×0 SVG — excludes CostTrendChart (custom HTML/CSS, tests pass)          | Critical |
| TD-118 | Error boundary tests fail across hooks: React error propagation doesn't surface thrown errors to `result.error` in vitest; orphan InsightsErrorBoundary.test.tsx exists (component missing) | High     |
| TD-125 | Kanban spec gaps deferred: duration display, cost/point comparison, blocker reason, unblock action, agent chain, timeline link                      | Medium   |

## Resolved

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
| TD-118 | Error boundary tests fail across Phase 7 hooks                                         | — (consolidated into TD-118) |
| TD-119 | Chart component tests fail in jsdom due to recharts ResponsiveContainer 0×0 SVG        | tech_debt_audit_20260519 |
| TD-136 | `fleet.ts` old schema refs stubbed; pivot type errors fixed                                                             | `586f52d`, `26f6212`       |
| TD-137 | `fleetCatalog.ts` old schema refs stubbed; client `never[]` types fixed                                                 | `586f52d`                  |
| TD-138 | 22 Convex files patched for unified schema; convex + pivot typecheck pass                                               | `91ee3ee`, `586f52d`       |
| TD-078 | Foundation schema duplicate tables (projects, sprints, tasks, agents)                                                  | schema_unification_20260519 |
| TD-079 | 20+ files reference old field names conflicting with new schema                                                        | schema_unification_20260519 |
| TD-122 | No Convex function tests for `sprintPlanning.ts` — `getBacklogTasksHandler`, `createSprintHandler`, `assignTasksToSprintHandler` untested           | kanban_review_20260519 |
| TD-123 | No frontend tests for `SprintPlanningPage` or `useSprintPlanning` hook — track plan claims unit test coverage that doesn't exist                    | kanban_review_20260519 |
| TD-124 | No tests for KanbanBoardPage, useKanbanBoard, useProjectList, or convex/kanban.ts — only component-level tests exist                               | kanban_review_20260519 |
| TD-126 | Dead code from previous iteration: `components/KanbanBoard.tsx`, `components/KanbanColumn.tsx`, `hooks/useKanbanDrag.ts` + their tests moved to `components/legacy/` | kanban_review_20260519 |
| TD-127 | `isValidStatusTransition` in `lib/kanban.ts:65` always returns true — fallthrough `return true` makes pipeline order check dead code               | kanban_review_20260519 |
| TD-128 | Legacy run contract components (DispatchRow, ArchitectRow, ExecutorRow, ReviewerRow, RecoveryRow) + useRunContract.ts still in codebase — TaskTimelinePage renders dual paths | dashboard_20260519 |
| TD-129 | `formatDuration` and `getStageStatus` duplicated across PipelineTimeline.tsx and AgentChain.tsx — extract to shared lib                                | dashboard_20260519 |
| TD-130 | TaskTimelinePage keyboard nav STAGES uses 'recovery' but new pipeline uses 'merger' — j/k won't reach 5th stage; Enter key toggles taskId instead of stage | dashboard_20260519 |
| TD-131 | `convex/taskTimeline.ts` uses 6 `as any` type assertions for _creationTime stripping and ID lookups                                                     | dashboard_20260519 |
| TD-132 | Dead dashboard components: SprintStatus, KeyMetrics, AgentStatus, AttentionNeeded, RecentActivity, DashboardDataIntegration exist but are NOT used by DashboardPage.tsx | dashboard_20260519 |
| TD-133 | DashboardPage.layout.test.tsx fails (5 tests): vi.mock doesn't export `useDashboardData` — mock setup broken                                             | dashboard_20260519 |
| TD-134 | DashboardPage.tsx is a 656-line monolith — all sections inlined instead of composing Phase 1-5 components                                                | dashboard_20260519 |
| TD-135 | ~~Dashboard uses REST API instead of Convex realtime~~ — RESOLVED: `useDashboardData` now uses `useConvexQuery` for realtime subscriptions                           | —        |

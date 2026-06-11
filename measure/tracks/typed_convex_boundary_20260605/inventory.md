# Typed Convex Boundary Inventory

> Inventory of string-based Convex calls across pivot and frontend, documenting migration status and remaining `as any` usage.

## Pivot String-Based Convex Calls

All production route files in `pivot/src/routes/` have been migrated to typed `api.*` FunctionReferences via `typedQuery`/`typedMutation` wrappers. The retrospective scheduler (`pivot/src/retrospective/scheduler.ts`) is also migrated.

| Call Site | Target | Args | Return |
| --- | --- | --- | --- |
| `pivot/src/routes/retrospectives.ts` | `api.retrospectives.listRetrospectives` | `{}` | Retrospective list |
| `pivot/src/routes/retrospectives.ts` | `api.retrospectives.getRetrospective` | `{ id }` | Single retrospective |
| `pivot/src/routes/retrospectives.ts` | `api.retrospectives.getSprintAggregateData` | `{ sprintId }` | Aggregate data |
| `pivot/src/routes/retrospectives.ts` | `api.retrospectives.createRetrospective` | `{ projectId, sprintId }` | Created ID |
| `pivot/src/routes/retrospectives.ts` | `api.retrospectives.failRetrospective` | `{ id, reason }` | void |
| `pivot/src/routes/retrospectives.ts` | `api.retrospectives.completeRetrospective` | `{ id }` | void |
| `pivot/src/routes/costs.ts` | `api.costs.getCostByProject` | `{ projectId }` | Cost breakdown |
| `pivot/src/routes/costs.ts` | `api.costs.getCostByAgent` | `{ agentId }` | Cost breakdown |
| `pivot/src/routes/costs.ts` | `api.costs.getCostTrend` | `{ projectId, days }` | Trend data |
| `pivot/src/routes/costs.ts` | `api.costs.getSessionSavings` | `{ projectId }` | Savings data |
| `pivot/src/routes/costs.ts` | `api.costs.getCostPerTask` | `{ projectId }` | Per-task costs |
| `pivot/src/routes/analytics.ts` | `api.analytics.getCompletionTrends` | `{ projectId }` | Trend data |
| `pivot/src/routes/analytics.ts` | `api.analytics.getAgentUtilization` | `{ agentId }` | Utilization data |
| `pivot/src/routes/analytics.ts` | `api.analytics.getBottlenecks` | `{ projectId }` | Bottleneck list |
| `pivot/src/routes/analytics.ts` | `api.analytics.getQueueDepth` | `{}` | Queue metrics |
| `pivot/src/routes/analytics.ts` | `api.analytics.getHookMetrics` | `{ projectId }` | Hook metrics |
| `pivot/src/routes/analytics.ts` | `api.analytics.getSessionMetrics` | `{ projectId }` | Session metrics |
| `pivot/src/routes/performance.ts` | `api.performance.getPhaseBreakdown` | `{ projectId }` | Phase data |
| `pivot/src/routes/performance.ts` | `api.performance.getPhaseTrends` | `{ projectId }` | Trend data |
| `pivot/src/routes/performance.ts` | `api.performance.getAgentLatencyStats` | `{ agentId }` | Latency stats |
| `pivot/src/routes/performance.ts` | `api.performance.getSlowAgents` | `{ threshold }` | Slow agent list |
| `pivot/src/routes/performance.ts` | `api.performance.getRegressionAlerts` | `{ projectId }` | Alert list |
| `pivot/src/routes/performance.ts` | `api.performance.getPerformanceOverview` | `{ projectId }` | Overview data |
| `pivot/src/retrospective/scheduler.ts` | `api.projects.listProjectsHandler` | `{}` | Project list |
| `pivot/src/retrospective/scheduler.ts` | `api.sprints.listSprintsHandler` | `{ projectId }` | Sprint list |
| `pivot/src/retrospective/scheduler.ts` | `api.retrospectives.listRetrospectives` | `{}` | Retrospective list |

**Unmigrated:** `pivot/src/server.ts` line 154 uses `(realtimeClient as any).onUpdate('projects:listProjects', ...)` — one remaining string-based realtime subscription.

## Frontend String-Based Convex Calls

The frontend uses centralized `useRealtime(queryName, ...)` and `useConvexQuery(queryName, ...)` hooks that accept string literals. All call sites pass static strings (never computed at runtime).

| Call Site | Target | Args | Return |
| --- | --- | --- | --- |
| `frontend/src/lib/convex-realtime/costs.ts` | `costs:getCostByProject` | `{}` | Cost data |
| `frontend/src/lib/convex-realtime/costs.ts` | `costs:getCostByAgent` | `{}` | Agent costs |
| `frontend/src/lib/convex-realtime/costs.ts` | `costs:getCostTrend` | `{}` | Trend data |
| `frontend/src/lib/convex-realtime/costs.ts` | `costs:getSessionSavings` | `{}` | Savings |
| `frontend/src/lib/convex-realtime/costs.ts` | `costs:getCostPerTask` | `{}` | Per-task |
| `frontend/src/lib/convex-realtime/performance.ts` | `performance:getPhaseBreakdown` | `{}` | Phase data |
| `frontend/src/lib/convex-realtime/performance.ts` | `performance:getPhaseTrends` | `{}` | Trends |
| `frontend/src/lib/convex-realtime/performance.ts` | `performance:getAgentLatencyStats` | `{}` | Latency |
| `frontend/src/lib/convex-realtime/performance.ts` | `performance:getSlowAgents` | `{}` | Slow agents |
| `frontend/src/lib/convex-realtime/performance.ts` | `performance:getRegressionAlerts` | `{}` | Alerts |
| `frontend/src/lib/convex-realtime/performance.ts` | `performance:getPerformanceOverview` | `{}` | Overview |
| `frontend/src/lib/convex-realtime/analytics.ts` | `analytics:getCompletionTrends` | `{}` | Trends |
| `frontend/src/lib/convex-realtime/analytics.ts` | `analytics:getAgentUtilization` | `{}` | Utilization |
| `frontend/src/lib/convex-realtime/analytics.ts` | `analytics:getBottlenecks` | `{}` | Bottlenecks |
| `frontend/src/lib/convex-realtime/analytics.ts` | `analytics:getQueueDepth` | `{}` | Queue depth |
| `frontend/src/lib/convex-realtime/analytics.ts` | `analytics:getHookMetrics` | `{}` | Metrics |
| `frontend/src/lib/convex-realtime/analytics.ts` | `analytics:getSessionMetrics` | `{}` | Metrics |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `fleet:getFleetStatus` | `{}` | Fleet status |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `fleet:getBlockedTasksAcrossProjects` | `{}` | Blocked tasks |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `fleet:getOpenIssuesAcrossProjects` | `{}` | Issues |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `fleet:getActiveRunsAcrossProjects` | `{}` | Active runs |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `fleet:getAlertsWithFilters` | `{}` | Alerts |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `fleet:getUnresolvedCriticalCount` | `{}` | Count |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `dashboard:getDashboardDataHandler` | `{}` | Dashboard |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `alerts:listActiveAlerts` | `{}` | Alerts |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `circuitBreakers:getAllCircuitBreakers` | `{}` | Breakers |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `taskRecovery:getInProgressTasks` | `{}` | Tasks |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `scheduler:listReadyTasks` | `{}` | Tasks |
| `frontend/src/lib/convex-realtime/dashboard.ts` | `scheduler:listActiveEmployees` | `{}` | Employees |
| `frontend/src/lib/convex-realtime/insights.ts` | `insights:getAnalyticsOverview` | `{}` | Overview |
| `frontend/src/lib/convex-realtime/insights.ts` | `insights:getCostOverview` | `{}` | Cost overview |
| `frontend/src/lib/convex-realtime/leaderboard.ts` | `leaderboard:getAgentLeaderboard` | `{}` | Leaderboard |
| `frontend/src/lib/convex-realtime/leaderboard.ts` | `leaderboard:getAgentPerformanceHistory` | `{}` | History |
| `frontend/src/lib/convex-data/catalog.ts` | `projects:listProjectsHandler` | `{}` | Projects |
| `frontend/src/lib/convex-data/catalog.ts` | `fleetCatalog:listAgents` | `{}` | Agents |
| `frontend/src/lib/convex-data/catalog.ts` | `fleetCatalog:listHarnesses` | `{}` | Harnesses |
| `frontend/src/lib/convex-data/catalog.ts` | `fleetCatalog:listTasksByProject` | `{ projectId }` | Tasks |
| `frontend/src/lib/convex-data/catalog.ts` | `issues:listIssuesByProject` | `{ projectId }` | Issues |
| `frontend/src/lib/convex-data/catalog.ts` | `executionLogs:listLogsByProject` | `{ projectId }` | Logs |
| `frontend/src/lib/convex-data/retrospectives.ts` | `retrospectives:getSprintAggregateData` | `{ sprintId }` | Aggregate |
| `frontend/src/lib/convex-data/retrospectives.ts` | `retrospectives:getSprintCostTrend` | `{ sprintId }` | Trend |
| `frontend/src/lib/convex-data/retrospectives.ts` | `retrospectives:getSprintRejectionReasons` | `{ sprintId }` | Reasons |
| `frontend/src/lib/convex-data/history.ts` | `history:listSprintHistory` | `{}` | History |
| `frontend/src/lib/convex-data/history.ts` | `history:listAgentHistory` | `{}` | History |
| `frontend/src/lib/convex-data/history.ts` | `history:listTaskHistory` | `{}` | History |
| `frontend/src/lib/convex-data/coverage.ts` | `coverageRecords:getCoverageHistory` | `{}` | History |
| `frontend/src/lib/convex-data/coverage.ts` | `coverageRecords:getLatestCoverage` | `{}` | Coverage |
| `frontend/src/lib/convex-data/policy.ts` | `policyWeights:listPolicyWeights` | `{}` | Weights |
| `frontend/src/lib/convex-data/reconciliation.ts` | `reconciliationEvents:listRecent` | `{}` | Events |
| `frontend/src/lib/convex-data/reconciliation.ts` | `reconciliationProposals:listPendingProposals` | `{}` | Proposals |
| `frontend/src/lib/convex-data/audit.ts` | `audit:listAuditEvents` | `{}` | Events |
| `frontend/src/lib/convex-data/experiments.ts` | `abTests:listAbTests` | `{}` | Tests |
| `frontend/src/lib/convex-data/experiments.ts` | `abTests:getExperimentResults` | `{ testId }` | Results |
| `frontend/src/lib/convex-data/notifications.ts` | `notifications:getUserNotifications` | `{}` | Notifications |
| `frontend/src/lib/convex-data/notifications.ts` | `notifications:getUnreadCount` | `{}` | Count |
| `frontend/src/lib/convex-data/notifications.ts` | `notifications:getNotificationPreferences` | `{}` | Preferences |
| `frontend/src/lib/convex-data/analysis.ts` | `analysisResults:getAnalysisByExecution` | `{ execId }` | Analysis |
| `frontend/src/lib/convex-data/analysis.ts` | `analysisResults:getAnalysisByProject` | `{ projectId }` | Analysis |
| `frontend/src/lib/convex-data/analysis.ts` | `analysisResults:getAnalysisHistory` | `{}` | History |
| `frontend/src/lib/convex-data/fleet.ts` | `dispatchPolicyStats:listDispatchPolicyStats` | `{}` | Stats |
| `frontend/src/lib/convex-data/fleet.ts` | `harnessReliabilityStats:listHarnessReliabilityStats` | `{}` | Stats |
| `frontend/src/lib/convex-data/fleet.ts` | `queueHealth:getQueueHealth` | `{}` | Health |
| `frontend/src/lib/convex-data/fleet.ts` | `runContracts:listRecentRunContracts` | `{}` | Contracts |
| `frontend/src/lib/convex-data/fleet.ts` | `budgets:getGovernanceEvents` | `{}` | Events |
| `frontend/src/lib/useLogStream.ts` | `executionLogs:listRecentLogs` | `{}` | Logs |
| `frontend/src/pages/ProjectTemplatesPage.tsx` | `listProjectTemplatesHandler` | `{}` | Templates |

## Convex-Related `as any`

These are Convex-related `as any` casts that bypass type safety:

| Call Site | Target | Args | Return |
| --- | --- | --- | --- |
| `pivot/src/server.ts:154` | `projects:listProjects` (via `(realtimeClient as any).onUpdate`) | `{}` | Realtime subscription |
| `frontend/src/lib/convex-data/core.ts:148` | Dynamic query name (via `(client as any).onUpdate`) | `{}` | Realtime subscription |
| `frontend/src/lib/useLogStream.ts:76` | `executionLogs:listRecentLogs` (via `(client as any).onUpdate`) | `{}` | Realtime subscription |
| `pivot/src/orchestrator/autoRunner.ts:132` | Convex query result (via `(setting as any).valueJson`) | N/A | Config value |

## Wrapper Design

The `dynamicConvexCall` wrapper in `pivot/src/convexClient.ts` provides dynamic function selection at runtime. It reads the function name from a `FunctionReference`'s `Symbol.for('functionName')` property and looks up the call kind (query vs mutation) in a runtime registry built from Convex source files.

The RetrospectiveScheduler (`pivot/src/retrospective/scheduler.ts`) was a key dynamic call site before migration. It previously dispatched Convex calls using string literals computed at runtime based on the scheduler's configuration. The scheduler now uses typed `api.*` references, but the dynamic dispatch pattern remains available via `dynamicConvexCall` for future use cases that require runtime function selection.

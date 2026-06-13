# Coverage Report — E2E QA/QC Smoke Test

> Generated: 2026-06-13 | Combined surface + deep workflow testing

## Executive Summary

| Metric | Value |
|--------|-------|
| Routes tested | 38/38 (100%) |
| Routes passed | 32/38 (84%) |
| Routes failed | 6/38 (16%) |
| Workflows tested | 12 |
| Findings filed | 7 (2 Critical, 3 High, 2 Medium) |

## Route Coverage

| # | Path | Component | Status | Notes |
|---|------|-----------|--------|-------|
| 1 | `/` | PortfolioRedirect | PASS | Redirects to /portfolio |
| 2 | `portfolio` | PortfolioPage | PASS | Search, filters, import, sync work |
| 3 | `agents` | AgentsPageWrapper | PASS | Add Agent creates agent |
| 4 | `agents/:name/edit` | AgentEditorPage | PASS | Form fields work |
| 5 | `agents/leaderboard` | LeaderboardPage | PASS | Filters render |
| 6 | `agent-templates` | AgentTemplatesPage | PASS | Empty state renders |
| 8 | `templates` | ProjectTemplatesPage | PASS | Empty state renders |
| 9 | `providers` | ProvidersPage | PASS | Empty state renders |
| 10 | `project/:id` | ProjectViewPage | **FAIL** | Deep link shows "Load error" (Q-FIND-002) |
| 12 | `settings` | Navigate | **FAIL** | Redirects to `/` (Q-FIND-003) |
| 13 | `settings/app` | AppConfigSection | PASS | All settings forms work |
| 17 | `pipelines` | PipelinesPage | PASS | Empty state renders |
| 18 | `analytics` | AnalyticsDashboard | PASS | Empty state renders |
| 19 | `performance` | PerformanceDashboard | PASS | Empty state renders |
| 20 | `costs` | CostsPage | PASS | Empty state renders |
| 21 | `ops` | OpsPage | PASS | Tab navigation renders |
| 22 | `ops/monitor` | MonitorPage | PASS | Empty state renders |
| 23 | `ops/diagnose` | DiagnosePage | PASS | Drift Detection renders |
| 24 | `ops/optimize` | OptimizePage | PASS | Empty state renders |
| 25 | `ops/reconcile` | ReconcilePage | PASS | Pending Proposals renders |
| 26 | `ops/simulate` | SimulatePage | PASS | Form + Run Simulation works |
| 27 | `sprint-planning` | SprintPlanningPage | PASS | Recalculate + Start Sprint work |
| 28 | `board` | KanbanBoardPage | PASS | Project selector works |
| 29 | `retrospectives` | RetrospectivePage | PARTIAL | Generate button not found |
| 30 | `notifications` | NotificationHistoryPage | PASS | Empty state renders |
| 31 | `blockers` | BlockersPage | PASS | Filters render |
| 32 | `alerts` | AlertsPage | PASS | Empty state renders |
| 33 | `harnesses` | HarnessesPageWrapper | **FAIL** | Redirects to Settings/Profile (Q-FIND-005) |
| 35 | `history/sprints` | SprintsHistoryPage | PASS | Empty state renders |
| 36 | `history/agents` | AgentsHistoryPage | **FAIL** | Convex error (Q-FIND-001) |
| 37 | `history/tasks` | TasksHistoryPage | **FAIL** | Redirects to Settings/Profile (Q-FIND-006) |
| 38 | `*` | Navigate | PASS | Wildcard redirects to `/` |

## Workflow Test Results

| Workflow | Status | Notes |
|----------|--------|-------|
| Create agent | PASS | Saves with warning about missing harness |
| Search projects | PASS | Filters correctly |
| Filter by status | PASS | Shows correct results |
| Import project (Scan) | PASS | Validation + scan works |
| Start New Sprint | PASS | Navigates to Sprint Planning |
| Sprint Recalculate | PASS | Button responds |
| Dashboard metrics | PASS | 17 agents, key metrics render |
| Settings save | PASS | All forms accept input |
| Back button | PASS | Returns to previous page |
| Wildcard route | PASS | Redirects to `/` |
| Blockers filters | PARTIAL | Tabs not found via JS |
| Retrospective generate | PARTIAL | Button not found |

## Findings

| ID | Severity | Route | Description |
|----|----------|-------|-------------|
| Q-FIND-001 | High | /history/agents | Missing Convex function `history:listAgentHistory` |
| Q-FIND-002 | High | /project/:id | Deep link shows "Load error - internal_server" |
| Q-FIND-003 | Medium | /settings | Redirects to `/` instead of `/settings/app` |
| Q-FIND-004 | Critical | Header | "New Project" navigates to Settings |
| Q-FIND-005 | Critical | /harnesses | Redirects to Settings/Profile |
| Q-FIND-006 | High | /history/tasks | Redirects to Settings/Profile |
| Q-FIND-007 | Medium | Add Agent | Saves without provider/model |

## Severity Histogram

```
Critical: ██ 2
High:     ███ 3
Medium:   ██ 2
Low:      0
```

## Recommendations

1. **Q-FIND-004/005/006 (Critical/High):** Investigate router.tsx for broken route definitions — multiple routes redirect to wrong destinations
2. **Q-FIND-001 (High):** Create the missing `history:listAgentHistory` Convex function
3. **Q-FIND-002 (High):** Add error boundary or redirect for invalid project IDs
4. **Q-FIND-003 (Medium):** Fix the `/settings` → `/settings/app` redirect
5. **Q-FIND-007 (Medium):** Add visible validation error for missing provider/model

## Artifacts

- `findings.md` — combined findings
- `findings-deep.md` — detailed deep test findings
- `screenshots/deep-test/` — workflow screenshots
- `screenshots/INDEX.md` — route coverage screenshots

# React Router Migration — Route & Hook Inventory

Generated from `frontend/src/router.tsx` at HEAD for Phase 1 Tasks 1.1 and 1.2.

## Browser Routes

| 1 | (index) | `PortfolioRedirect` |
| 2 | `portfolio` | `PortfolioPage` |
| 3 | `agents` | `AgentsPage` |
| 4 | `agents/:name/edit` | `AgentEditorPage` |
| 5 | `agents/leaderboard` | `LeaderboardPage` |
| 6 | `agent-templates` | `AgentTemplatesPage` |
| 7 | `agent-templates/:id/edit` | `AgentTemplateEditorPage` |
| 8 | `templates` | `ProjectTemplatesPage` |
| 9 | `providers` | `ProvidersPage` |
| 10 | `project/:id` | `ProjectViewPage` |
| 11 | `tasks/:taskId/timeline` | `TaskTimelinePage` |
| 12 | `settings` (index) | `Navigate → /settings/app` |
| 13 | `settings/app` | `AppConfigSection` |
| 14 | `settings/notifications` | `NotificationSettingsSection` |
| 15 | `settings/agents` | `AgentDefaultsSection` |
| 16 | `settings/profile` | `ProfileSettingsSection` |
| 17 | `pipelines` | `PipelinesPage` |
| 18 | `analytics` | `AnalyticsDashboard` |
| 19 | `performance` | `PerformanceDashboard` |
| 20 | `costs` | `CostsPage` |
| 21 | `ops` | `OpsPage` |
| 22 | `ops/monitor` | `MonitorPage` |
| 23 | `ops/diagnose` | `DiagnosePage` |
| 24 | `ops/optimize` | `OptimizePage` |
| 25 | `ops/reconcile` | `ReconcilePage` |
| 26 | `ops/simulate` | `SimulatePage` |
| 27 | `sprint-planning` | `SprintPlanningPage` |
| 28 | `board` | `KanbanBoardPage` |
| 29 | `retrospectives` | `RetrospectivePage` |
| 30 | `notifications` | `NotificationHistoryPage` |
| 31 | `blockers` | `BlockersPage` |
| 32 | `alerts` | `AlertsPage` |
| 33 | `harnesses` | `HarnessesPage` |
| 34 | `harnesses/:name/edit` | `HarnessEditorPage` |
| 35 | `history/sprints` | `SprintsHistoryPage` |
| 36 | `history/agents` | `AgentsHistoryPage` |
| 37 | `history/tasks` | `TasksHistoryPage` |
| 38 | `*` | `Navigate → /` |

## Hook Usage

| Hook | Count | Files |
|------|-------|-------|
| `useNavigate` | 8 | `useCreateSprint.ts`, `HarnessEditorPage.tsx`, `AgentTemplateEditorPage.tsx`, `PortfolioPage.tsx`, `AgentEditorPage.tsx`, `KanbanBoardPage.tsx`, `AgentTemplatesPage.tsx`, `AppLayout.tsx` |
| `useParams` | 5 | `HarnessEditorPage.tsx`, `ProjectViewPage.tsx`, `AgentTemplateEditorPage.tsx`, `AgentEditorPage.tsx`, `TaskTimelinePage.tsx` |
| `useLocation` | 1 | `AppLayout.tsx` |
| `useSearchParams` | 6 | `useHistoryFilters.ts`, `HarnessEditorPage.tsx`, `ProjectViewPage.tsx`, `AgentEditorPage.tsx`, `TasksHistoryPage.tsx`, `SprintPlanningPage.tsx` |

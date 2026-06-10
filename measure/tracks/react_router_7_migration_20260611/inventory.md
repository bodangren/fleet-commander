# React Router Migration — Route & Hook Inventory

Generated from `frontend/src/App.tsx` at HEAD for Phase 1 Tasks 1.1 and 1.2.

## Browser Routes

| # | Path | Component |
|---|------|-----------|
| 1 | (layout wrapper) | `AppLayout` |
| 2 | (index) | `PortfolioRedirect` |
| 3 | `portfolio` | `PortfolioPage` |
| 4 | `agents` | `AgentsPage` |
| 5 | `agents/:name/edit` | `AgentEditorPage` |
| 6 | `agents/leaderboard` | `LeaderboardPage` |
| 7 | `agent-templates` | `AgentTemplatesPage` |
| 8 | `agent-templates/:id/edit` | `AgentTemplateEditorPage` |
| 9 | `templates` | `ProjectTemplatesPage` |
| 10 | `providers` | `ProvidersPage` |
| 11 | `project/:id` | `ProjectViewPage` |
| 12 | `tasks/:taskId/timeline` | `TaskTimelinePage` |
| 13 | `settings` | `SettingsLayout` |
| 14 | `settings` (index) | `Navigate → /settings/app` |
| 15 | `settings/app` | `AppConfigSection` |
| 16 | `settings/notifications` | `NotificationSettingsSection` |
| 17 | `settings/agents` | `AgentDefaultsSection` |
| 18 | `settings/profile` | `ProfileSettingsSection` |
| 19 | `pipelines` | `PipelinesPage` |
| 20 | `analytics` | `AnalyticsDashboard` |
| 21 | `performance` | `PerformanceDashboard` |
| 22 | `costs` | `CostsPage` |
| 23 | `ops` | `OpsPage` |
| 24 | `ops/monitor` | `MonitorPage` |
| 25 | `ops/diagnose` | `DiagnosePage` |
| 26 | `ops/optimize` | `OptimizePage` |
| 27 | `sprint-planning` | `SprintPlanningPage` |
| 28 | `board` | `KanbanBoardPage` |
| 29 | `ops/reconcile` | `ReconcilePage` |
| 30 | `ops/simulate` | `SimulatePage` |
| 31 | `retrospectives` | `RetrospectivePage` |
| 32 | `notifications` | `NotificationHistoryPage` |
| 33 | `blockers` | `BlockersPage` |
| 34 | `alerts` | `AlertsPage` |
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

# frontend/pages + frontend/components

**Slice ID:** `slice-4-frontend-pages-components`
**Files:** 132  ·  **Nodes:** 372

| Type | Count |
|------|-------|
| function | 238 |
| file | 132 |
| interface | 92 |
| type_alias | 41 |
| class | 1 |

## Files in this slice (with originating track)

| File | Originating Track | Intro Commit | Nodes |
|------|-------------------|--------------|-------|
| `frontend/src/components/AgentCard.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 3 |
| `frontend/src/components/CoverageChart.tsx` | `test_coverage_dashboard_20260330` | `08ae723215` (2026-04-14) | 2 |
| `frontend/src/components/CoverageDiff.tsx` | `test_coverage_dashboard_20260330` | `08ae723215` (2026-04-14) | 2 |
| `frontend/src/components/DependencyGraph.tsx` | `dependency_graph_20260330` | `1044ba51cd` (2026-03-31) | 7 |
| `frontend/src/components/DispatchTimeline.tsx` | `environment_management_20260330` | `d49e57d4e8` (2026-04-16) | 6 |
| `frontend/src/components/EmployeeCard.tsx` | `tech_debt_remediation_20260516` | `f65b5dd1e8` (2026-05-16) | 2 |
| `frontend/src/components/EmptyState.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/components/FleetHealth.tsx` | `environment_management_20260330` | `9e87e8dab7` (2026-04-16) | 12 |
| `frontend/src/components/GitStatusBar.tsx` | `environment_management_20260330` | `951ed87dbb` (2026-04-10) | 3 |
| `frontend/src/components/GlobalQueue.tsx` | `fleet_command_center_20260510` | `c6cfd5fcb0` (2026-05-10) | 2 |
| `frontend/src/components/Governance.tsx` | `environment_management_20260330` | `d6168abb09` (2026-04-17) | 6 |
| `frontend/src/components/HarnessCard.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/components/IssueCard.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 1 |
| `frontend/src/components/IssueCreateModal.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 1 |
| `frontend/src/components/IssueDetailView.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 1 |
| `frontend/src/components/IssueListView.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 1 |
| `frontend/src/components/LoadErrorCard.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/components/LogStatsView.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 1 |
| `frontend/src/components/LogTimelineView.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 3 |
| `frontend/src/components/LogViewer.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 2 |
| `frontend/src/components/MarkdownEditor.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 8 |
| `frontend/src/components/MarkdownViewer.tsx` | `frontend_convex_migration_20260402` | `f0ae573c40` (2026-05-04) | 6 |
| `frontend/src/components/PipelineList.tsx` | `automated_review_pipeline_20260330` | `15db6fccd2` (2026-04-03) | 1 |
| `frontend/src/components/PipelineLogs.tsx` | `automated_review_pipeline_20260330` | `15db6fccd2` (2026-04-03) | 2 |
| `frontend/src/components/PortfolioRedirect.tsx` | `review_remediation_20260529` | `b16e622562` (2026-05-29) | 1 |
| `frontend/src/components/ProjectCard.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 2 |
| `frontend/src/components/ProjectHealthBadge.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 2 |
| `frontend/src/components/QueueHealth.tsx` | `environment_management_20260330` | `4d5099ae20` (2026-04-16) | 5 |
| `frontend/src/components/ResultPanel.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/components/ReviewResults.tsx` | `automated_review_pipeline_20260330` | `bbabf27a18` (2026-04-01) | 7 |
| `frontend/src/components/Row.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/components/SprintPanel.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 2 |
| `frontend/src/components/VelocityChart.tsx` | `fix_open_tech_debt_20260404` | `4f7438ee12` (2026-03-31) | 2 |
| `frontend/src/components/WelcomeScreen.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/components/WorkspaceScanner.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 3 |
| `frontend/src/components/analytics/AgentHeatmap.tsx` | `frontend_global_dashboard_onboarding_20260325` | `532d035e71` (2026-05-03) | 1 |
| `frontend/src/components/analytics/AnalyticsFilterBar.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 3 |
| `frontend/src/components/analytics/BottleneckChart.tsx` | `frontend_global_dashboard_onboarding_20260325` | `532d035e71` (2026-05-03) | 2 |
| `frontend/src/components/analytics/CompletionTrendChart.tsx` | `frontend_global_dashboard_onboarding_20260325` | `532d035e71` (2026-05-03) | 1 |
| `frontend/src/components/analytics/HookPerformanceChart.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 2 |
| `frontend/src/components/analytics/QueueDepthChart.tsx` | `frontend_global_dashboard_onboarding_20260325` | `532d035e71` (2026-05-03) | 1 |
| `frontend/src/components/analytics/SessionResumptionChart.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 2 |
| `frontend/src/components/analytics/TimeRangeSelector.tsx` | `frontend_global_dashboard_onboarding_20260325` | `532d035e71` (2026-05-03) | 2 |
| `frontend/src/components/charts/BarChart.tsx` | `local_convex_postgres_startup_20260517` | `50323163c6` (2026-05-18) | 3 |
| `frontend/src/components/charts/DonutChart.tsx` | `local_convex_postgres_startup_20260517` | `50323163c6` (2026-05-18) | 3 |
| `frontend/src/components/charts/LineChart.tsx` | `local_convex_postgres_startup_20260517` | `50323163c6` (2026-05-18) | 3 |
| `frontend/src/components/cost/BudgetGauge.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 2 |
| `frontend/src/components/cost/CostByAgentChart.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 2 |
| `frontend/src/components/cost/CostByProjectChart.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 1 |
| `frontend/src/components/cost/CostTrendChart.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 1 |
| `frontend/src/components/cost/SessionSavingsWidget.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 2 |
| `frontend/src/components/dashboard/AgentStatus.tsx` | `dashboard_20260517` | `25251f7e33` (2026-05-17) | 5 |
| `frontend/src/components/dashboard/AttentionNeeded.tsx` | `test_coverage_dashboard_20260330` | `dfba4e8bef` (2026-05-17) | 6 |
| `frontend/src/components/dashboard/KeyMetrics.tsx` | `test_coverage_dashboard_20260330` | `f952f0ad93` (2026-05-17) | 3 |
| `frontend/src/components/dashboard/RecentActivity.tsx` | `dashboard_20260517` | `32ae9a612e` (2026-05-17) | 6 |
| `frontend/src/components/dashboard/SprintStatus.tsx` | `sprint_retrospective_dashboard_20260527` | `4f90183970` (2026-05-17) | 3 |
| `frontend/src/components/history/AgentDetailView.tsx` | `dashboard_20260517` | `612b39151d` (2026-05-18) | 2 |
| `frontend/src/components/history/AgentModelHistory.tsx` | `dashboard_20260517` | `eb3ebb606a` (2026-05-18) | 2 |
| `frontend/src/components/history/AgentPerformanceTable.tsx` | `dashboard_20260517` | `eb3ebb606a` (2026-05-18) | 4 |
| `frontend/src/components/history/CostTrendChart.tsx` | `dashboard_20260517` | `eb3ebb606a` (2026-05-18) | 2 |
| `frontend/src/components/history/HistoryFilterBar.tsx` | `dashboard_20260517` | `5618321b29` (2026-05-18) | 2 |
| `frontend/src/components/history/HistorySearchBar.tsx` | `dashboard_20260517` | `5618321b29` (2026-05-18) | 2 |
| `frontend/src/components/history/SprintDetailView.tsx` | `dashboard_20260517` | `1edffb78de` (2026-05-18) | 3 |
| `frontend/src/components/history/SprintHistoryTable.tsx` | `dashboard_20260517` | `1edffb78de` (2026-05-18) | 4 |
| `frontend/src/components/history/SprintRetrospectiveView.tsx` | `dashboard_20260517` | `612b39151d` (2026-05-18) | 2 |
| `frontend/src/components/history/TaskDetailView.tsx` | `dashboard_20260517` | `f6a3789208` (2026-05-18) | 2 |
| `frontend/src/components/history/TaskHistoryTable.tsx` | `dashboard_20260517` | `f6a3789208` (2026-05-18) | 4 |
| `frontend/src/components/history/TaskTimelineLink.tsx` | `dashboard_20260517` | `612b39151d` (2026-05-18) | 2 |
| `frontend/src/components/history/VelocityTrendChart.tsx` | `dashboard_20260517` | `1edffb78de` (2026-05-18) | 2 |
| `frontend/src/components/insights/InsightsErrorBoundary.tsx` | `frontend_convex_migration_20260402` | `36f5685be2` (2026-05-20) | 3 |
| `frontend/src/components/insights/InsightsTabs.tsx` | `dashboard_20260517` | `e1e385fe37` (2026-05-18) | 3 |
| `frontend/src/components/kanban/KanbanBoard.tsx` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 2 |
| `frontend/src/components/kanban/KanbanColumn.tsx` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 4 |
| `frontend/src/components/kanban/SprintInfoBar.tsx` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 4 |
| `frontend/src/components/kanban/TaskCard.tsx` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 7 |
| `frontend/src/components/legacy/KanbanBoard.tsx` | `-` | `-` (-) | 10 |
| `frontend/src/components/performance/EmployeePerformancePanel.tsx` | `employee_performance_analytics_20260517` | `94e9ce186e` (2026-05-17) | 7 |
| `frontend/src/components/performance/PhaseBreakdown.tsx` | `sprint_retrospective_dashboard_20260527` | `b7172aea2a` (2026-05-04) | 4 |
| `frontend/src/components/performance/PhaseTrends.tsx` | `sprint_retrospective_dashboard_20260527` | `b7172aea2a` (2026-05-04) | 1 |
| `frontend/src/components/performance/RegressionTrendChart.tsx` | `performance_profiling_20260502` | `7fc4382caf` (2026-05-09) | 2 |
| `frontend/src/components/performance/SlowAgentLeaderboard.tsx` | `performance_profiling_20260502` | `c7f3cc8a9d` (2026-05-04) | 2 |
| `frontend/src/components/retrospective/AgentPerformanceBreakdown.tsx` | `sprint_retrospective_dashboard_20260527` | `a6c5d5285e` (2026-05-29) | 2 |
| `frontend/src/components/retrospective/AutoInsights.tsx` | `sprint_retrospective_dashboard_20260527` | `a6c5d5285e` (2026-05-29) | 2 |
| `frontend/src/components/retrospective/BudgetBurndownChart.tsx` | `sprint_retrospective_dashboard_20260527` | `a6c5d5285e` (2026-05-29) | 2 |
| `frontend/src/components/retrospective/BudgetComparisonChart.tsx` | `review_remediation_20260529` | `672f376bf2` (2026-05-29) | 2 |
| `frontend/src/components/retrospective/RejectionReasonHistogram.tsx` | `sprint_retrospective_dashboard_20260527` | `a6c5d5285e` (2026-05-29) | 2 |
| `frontend/src/components/retrospective/RetrospectiveList.tsx` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 4 |
| `frontend/src/components/retrospective/RetrospectiveViewer.tsx` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 3 |
| `frontend/src/components/retrospective/SprintRetrospectiveDashboard.tsx` | `sprint_retrospective_dashboard_20260527` | `a6c5d5285e` (2026-05-29) | 3 |
| `frontend/src/components/timeline/AgentChain.tsx` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 3 |
| `frontend/src/components/timeline/ExecutionLog.tsx` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 4 |
| `frontend/src/components/timeline/PipelineTimeline.tsx` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 2 |
| `frontend/src/components/timeline/TaskInfoBar.tsx` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 2 |
| `frontend/src/components/ui/button.tsx` | `-` | `-` (-) | 1 |
| `frontend/src/components/ui/card.tsx` | `-` | `-` (-) | 0 |
| `frontend/src/components/ui/input.tsx` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 1 |
| `frontend/src/components/ui/label.tsx` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 0 |
| `frontend/src/pages/AgentEditorPage.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 2 |
| `frontend/src/pages/AgentTemplateEditorPage.tsx` | `custom_agent_templates_20260527` | `8b2388c694` (2026-05-29) | 3 |
| `frontend/src/pages/AgentTemplatesPage.tsx` | `custom_agent_templates_20260527` | `8b2388c694` (2026-05-29) | 2 |
| `frontend/src/pages/AgentsHistoryPage.tsx` | `dashboard_20260517` | `eb3ebb606a` (2026-05-18) | 1 |
| `frontend/src/pages/AgentsPage.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/pages/AlertsPage.tsx` | `fleet_command_center_20260510` | `c6cfd5fcb0` (2026-05-10) | 2 |
| `frontend/src/pages/AnalyticsDashboard.tsx` | `frontend_global_dashboard_onboarding_20260325` | `532d035e71` (2026-05-03) | 1 |
| `frontend/src/pages/AnalyticsPage.tsx` | `dashboard_20260517` | `72a3d0639d` (2026-05-18) | 15 |
| `frontend/src/pages/BlockersPage.tsx` | `fleet_command_center_20260510` | `c6cfd5fcb0` (2026-05-10) | 2 |
| `frontend/src/pages/CostDashboard.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 1 |
| `frontend/src/pages/CostsPage.tsx` | `dashboard_20260517` | `93fc462203` (2026-05-18) | 13 |
| `frontend/src/pages/DashboardPage.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/pages/DiagnosePage.tsx` | `schema_modularization_20260524` | `b38f53c19f` (2026-05-26) | 2 |
| `frontend/src/pages/EmployeesPage.tsx` | `tech_debt_remediation_20260516` | `f65b5dd1e8` (2026-05-16) | 2 |
| `frontend/src/pages/HarnessEditorPage.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 2 |
| `frontend/src/pages/HarnessesPage.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 1 |
| `frontend/src/pages/KanbanBoardPage.tsx` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 1 |
| `frontend/src/pages/MonitorPage.tsx` | `schema_modularization_20260524` | `b38f53c19f` (2026-05-26) | 1 |
| `frontend/src/pages/NotificationHistoryPage.tsx` | `notification_system_20260502` | `61772b18e7` (2026-05-05) | 1 |
| `frontend/src/pages/OpsPage.tsx` | `environment_management_20260330` | `ef594a6b5a` (2026-04-16) | 3 |
| `frontend/src/pages/OptimizePage.tsx` | `schema_modularization_20260524` | `b38f53c19f` (2026-05-26) | 4 |
| `frontend/src/pages/PerformanceDashboard.tsx` | `performance_profiling_20260502` | `c7f3cc8a9d` (2026-05-04) | 1 |
| `frontend/src/pages/PerformancePage.tsx` | `dashboard_20260517` | `6f25fae66d` (2026-05-18) | 7 |
| `frontend/src/pages/PipelinesPage.tsx` | `automated_review_pipeline_20260330` | `15db6fccd2` (2026-04-03) | 1 |
| `frontend/src/pages/PortfolioPage.tsx` | `review_remediation_20260529` | `0156192597` (2026-05-29) | 4 |
| `frontend/src/pages/ProjectViewPage.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 2 |
| `frontend/src/pages/ProvidersPage.tsx` | `fleet_command_center_20260510` | `2f28831c07` (2026-05-10) | 3 |
| `frontend/src/pages/Reconcile.tsx` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 5 |
| `frontend/src/pages/RetrospectivePage.tsx` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 1 |
| `frontend/src/pages/SettingsPage.tsx` | `settings_config_page_20260330` | `cbc9b18678` (2026-03-30) | 4 |
| `frontend/src/pages/SimulatePage.tsx` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 6 |
| `frontend/src/pages/SprintPlanningPage.tsx` | `ui_redesign_linear_20260518` | `018b6567b1` (2026-05-19) | 3 |
| `frontend/src/pages/SprintsHistoryPage.tsx` | `dashboard_20260517` | `1edffb78de` (2026-05-18) | 1 |
| `frontend/src/pages/TaskTimelinePage.tsx` | `environment_management_20260330` | `9fc30bad21` (2026-04-16) | 1 |
| `frontend/src/pages/TasksHistoryPage.tsx` | `dashboard_20260517` | `f6a3789208` (2026-05-18) | 1 |

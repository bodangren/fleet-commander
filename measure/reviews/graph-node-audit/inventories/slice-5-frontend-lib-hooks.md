# frontend/lib + frontend/hooks + fixtures + the rest of frontend

**Slice ID:** `slice-5-frontend-lib-hooks`
**Files:** 50  ·  **Nodes:** 360

| Type | Count |
|------|-------|
| function | 187 |
| interface | 80 |
| type_alias | 75 |
| file | 50 |
| schema | 17 |
| class | 1 |

## Files in this slice (with originating track)

| File | Originating Track | Intro Commit | Nodes |
|------|-------------------|--------------|-------|
| `frontend/src/App.tsx` | `chore_daily_cleanup_20260405` | `526a7c7d9a` (2026-03-25) | 2 |
| `frontend/src/__fixtures__/agentModelFixtures.ts` | `dashboard_20260517` | `eb3ebb606a` (2026-05-18) | 1 |
| `frontend/src/__fixtures__/convex-provider.tsx` | `convex_test_remediation_20260520` | `bf1c51c28d` (2026-05-16) | 4 |
| `frontend/src/__fixtures__/dashboardFixtures.ts` | `sprint_retrospective_dashboard_20260527` | `4f90183970` (2026-05-17) | 5 |
| `frontend/src/__fixtures__/historyFixtures.ts` | `dashboard_20260517` | `1edffb78de` (2026-05-18) | 0 |
| `frontend/src/__fixtures__/insightsFixtures.ts` | `dashboard_20260517` | `cf28c8a075` (2026-05-18) | 15 |
| `frontend/src/__fixtures__/performanceFixtures.ts` | `dashboard_20260517` | `6f25fae66d` (2026-05-18) | 9 |
| `frontend/src/hooks/types.ts` | `frontend_convex_migration_20260402` | `e3ee3f4505` (2026-05-25) | 4 |
| `frontend/src/hooks/useAgentForm.ts` | `agent_issue_autocreation_20260330` | `2f3afd6589` (2026-03-31) | 15 |
| `frontend/src/hooks/useCostData.ts` | `dashboard_20260517` | `93fc462203` (2026-05-18) | 1 |
| `frontend/src/hooks/useDashboardData.ts` | `test_coverage_dashboard_20260330` | `9bb0ce815b` (2026-05-17) | 8 |
| `frontend/src/hooks/useHarnessForm.ts` | `agent_issue_autocreation_20260330` | `2f3afd6589` (2026-03-31) | 11 |
| `frontend/src/hooks/useHistoryFilters.ts` | `dashboard_20260517` | `5618321b29` (2026-05-18) | 1 |
| `frontend/src/hooks/useKanbanBoard.ts` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 6 |
| `frontend/src/hooks/usePerformanceData.ts` | `dashboard_20260517` | `6f25fae66d` (2026-05-18) | 1 |
| `frontend/src/hooks/usePipelineData.ts` | `automated_review_pipeline_20260330` | `15db6fccd2` (2026-04-03) | 5 |
| `frontend/src/hooks/usePortfolioData.ts` | `review_remediation_20260529` | `0156192597` (2026-05-29) | 4 |
| `frontend/src/hooks/useProjectList.ts` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 2 |
| `frontend/src/hooks/useProjectView.ts` | `agent_issue_autocreation_20260330` | `2f3afd6589` (2026-03-31) | 18 |
| `frontend/src/hooks/useSprintHistory.ts` | `dashboard_20260517` | `1edffb78de` (2026-05-18) | 3 |
| `frontend/src/hooks/useSprintPlanning.ts` | `sprint_planning_20260517` | `1bcbef13c4` (2026-05-19) | 7 |
| `frontend/src/hooks/useTaskReview.ts` | `automated_review_pipeline_20260330` | `bbabf27a18` (2026-04-01) | 2 |
| `frontend/src/hooks/useTaskTimeline.ts` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 8 |
| `frontend/src/layout/AppLayout.tsx` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 4 |
| `frontend/src/lib/AnalyticsFiltersContext.tsx` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 4 |
| `frontend/src/lib/ConvexProvider.tsx` | `frontend_convex_migration_20260402` | `6d9355d068` (2026-04-02) | 2 |
| `frontend/src/lib/analysis.ts` | `static_analysis_integration_20260330` | `61a735cbfc` (2026-04-24) | 17 |
| `frontend/src/lib/convex.ts` | `frontend_convex_migration_20260402` | `6d9355d068` (2026-04-02) | 1 |
| `frontend/src/lib/coverage.ts` | `test_coverage_dashboard_20260330` | `7fd9cac616` (2026-04-11) | 8 |
| `frontend/src/lib/dashboard.ts` | `sprint_retrospective_dashboard_20260527` | `4f90183970` (2026-05-17) | 1 |
| `frontend/src/lib/dataAdapter.ts` | `frontend_convex_migration_20260402` | `6d9355d068` (2026-04-02) | 6 |
| `frontend/src/lib/employees.ts` | `tech_debt_remediation_20260516` | `f65b5dd1e8` (2026-05-16) | 2 |
| `frontend/src/lib/fleetTypes.ts` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 28 |
| `frontend/src/lib/formatDuration.ts` | `review_remediation_20260529` | `012168accc` (2026-05-29) | 1 |
| `frontend/src/lib/historyFilters.ts` | `dashboard_20260517` | `5618321b29` (2026-05-18) | 5 |
| `frontend/src/lib/kanban.ts` | `frontend_project_kanban_board_20260325` | `2b79de1975` (2026-05-16) | 6 |
| `frontend/src/lib/metrics.ts` | `test_coverage_dashboard_20260330` | `f952f0ad93` (2026-05-17) | 4 |
| `frontend/src/lib/pipelineUtils.tsx` | `bun_orchestrator_migration_20260402` | `5b418384c0` (2026-04-04) | 3 |
| `frontend/src/lib/timeline.ts` | `fix_open_tech_debt_20260404` | `ed732fa4ba` (2026-05-19) | 2 |
| `frontend/src/lib/useConvexData.ts` | `frontend_convex_migration_20260402` | `6d9355d068` (2026-04-02) | 55 |
| `frontend/src/lib/useConvexRealtime.ts` | `frontend_convex_migration_20260402` | `36f5685be2` (2026-05-20) | 45 |
| `frontend/src/lib/useFleetApi.ts` | `fleet_command_center_20260510` | `c6cfd5fcb0` (2026-05-10) | 17 |
| `frontend/src/lib/useFleetData.ts` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 3 |
| `frontend/src/lib/useGitStatus.ts` | `environment_management_20260330` | `951ed87dbb` (2026-04-10) | 3 |
| `frontend/src/lib/useLogStream.ts` | `frontend_convex_migration_20260402` | `6d9355d068` (2026-04-02) | 3 |
| `frontend/src/lib/useWebSocket.ts` | `agent_harness_management_ui_20260327` | `f944afacb9` (2026-03-28) | 2 |
| `frontend/src/lib/utils.ts` | `-` | `-` (-) | 1 |
| `frontend/src/main.tsx` | `-` | `-` (-) | 1 |
| `frontend/src/types/history.ts` | `review_remediation_20260529` | `5cd399c32b` (2026-05-29) | 3 |
| `frontend/src/vite-env.d.ts` | `-` | `-` (-) | 1 |

# pivot/routes + server + reconciliation + performance + git + failover + everything-else-pivot

**Slice ID:** `slice-3-pivot-rest`
**Files:** 130  ·  **Nodes:** 457

| Type | Count |
|------|-------|
| function | 203 |
| route | 145 |
| file | 130 |
| interface | 64 |
| type_alias | 28 |
| schema | 13 |
| class | 4 |

## Files in this slice (with originating track)

| File | Originating Track | Intro Commit | Nodes |
|------|-------------------|--------------|-------|
| `pivot/src/__fixtures__/convex-mock.test.ts` | `platform_pivot_bun_convex_20260401` | `a9f1c6d7a2` (2026-05-16) | 0 |
| `pivot/src/__fixtures__/convex-mock.ts` | `virtual_software_house_mvp_20260516` | `d55808ed9c` (2026-05-16) | 16 |
| `pivot/src/__fixtures__/performance-fixtures.ts` | `employee_performance_analytics_20260517` | `12038b7e0d` (2026-05-17) | 3 |
| `pivot/src/agents/index.ts` | `environment_management_20260330` | `53007e5fb4` (2026-04-16) | 4 |
| `pivot/src/config/index.ts` | `dispatch_scoring_v2_20260501` | `208da4ab11` (2026-05-01) | 4 |
| `pivot/src/convexClient.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 3 |
| `pivot/src/convexRetry.test.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `pivot/src/convexRetry.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 5 |
| `pivot/src/environment/types.test.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `pivot/src/environment/types.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 8 |
| `pivot/src/failover/policyCache.test.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `pivot/src/failover/policyCache.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 2 |
| `pivot/src/failover/wal.test.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `pivot/src/failover/wal.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 11 |
| `pivot/src/git/client.test.ts` | `environment_management_20260330` | `622ec2f164` (2026-04-09) | 1 |
| `pivot/src/git/client.ts` | `environment_management_20260330` | `622ec2f164` (2026-04-09) | 6 |
| `pivot/src/git/validation.test.ts` | `dispatch_scoring_v2_20260501` | `721f7a3cc2` (2026-05-01) | 0 |
| `pivot/src/git/validation.ts` | `dispatch_scoring_v2_20260501` | `208da4ab11` (2026-05-01) | 2 |
| `pivot/src/harness/loader.test.ts` | `harness_capability_schema_20260415` | `76754f19a7` (2026-04-16) | 0 |
| `pivot/src/harness/loader.ts` | `harness_capability_schema_20260415` | `76754f19a7` (2026-04-16) | 6 |
| `pivot/src/performance/benchmark.test.ts` | `dashboard_20260517` | `309e722cc0` (2026-05-17) | 0 |
| `pivot/src/performance/benchmark.ts` | `dashboard_20260517` | `bdfe3bd2f4` (2026-05-17) | 6 |
| `pivot/src/performance/computeBaselines.test.ts` | `employee_performance_analytics_20260517` | `12038b7e0d` (2026-05-17) | 1 |
| `pivot/src/performance/computeBaselines.ts` | `employee_performance_analytics_20260517` | `12038b7e0d` (2026-05-17) | 4 |
| `pivot/src/performance/detectRegressions.test.ts` | `employee_performance_analytics_20260517` | `c45942a377` (2026-05-17) | 2 |
| `pivot/src/performance/detectRegressions.ts` | `employee_performance_analytics_20260517` | `c45942a377` (2026-05-17) | 4 |
| `pivot/src/performance/evaluateRegression.test.ts` | `employee_performance_analytics_20260517` | `c45942a377` (2026-05-17) | 0 |
| `pivot/src/performance/evaluateRegression.ts` | `employee_performance_analytics_20260517` | `c45942a377` (2026-05-17) | 4 |
| `pivot/src/performance/getEmployeePerformance.test.ts` | `employee_performance_analytics_20260517` | `12038b7e0d` (2026-05-17) | 0 |
| `pivot/src/performance/getEmployeePerformance.ts` | `employee_performance_analytics_20260517` | `12038b7e0d` (2026-05-17) | 4 |
| `pivot/src/performance/statistics.test.ts` | `employee_performance_analytics_20260517` | `12038b7e0d` (2026-05-17) | 0 |
| `pivot/src/performance/statistics.ts` | `employee_performance_analytics_20260517` | `12038b7e0d` (2026-05-17) | 4 |
| `pivot/src/performance/synthetic.ts` | `dashboard_20260517` | `bdfe3bd2f4` (2026-05-17) | 5 |
| `pivot/src/planning/recommender.test.ts` | `platform_pivot_bun_convex_20260401` | `185f85105d` (2026-05-19) | 0 |
| `pivot/src/planning/recommender.ts` | `platform_pivot_bun_convex_20260401` | `185f85105d` (2026-05-19) | 6 |
| `pivot/src/pr/factory.test.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `pivot/src/pr/factory.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 3 |
| `pivot/src/pr/github.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 3 |
| `pivot/src/pr/gitlab.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 3 |
| `pivot/src/pr/types.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 4 |
| `pivot/src/reconciliation/differs/issue.test.ts` | `environment_management_20260330` | `fdd03defc5` (2026-04-16) | 0 |
| `pivot/src/reconciliation/differs/issue.ts` | `environment_management_20260330` | `fdd03defc5` (2026-04-16) | 4 |
| `pivot/src/reconciliation/differs/task.test.ts` | `environment_management_20260330` | `fdd03defc5` (2026-04-16) | 0 |
| `pivot/src/reconciliation/differs/task.ts` | `environment_management_20260330` | `fdd03defc5` (2026-04-16) | 4 |
| `pivot/src/reconciliation/differs/trackMetadata.test.ts` | `environment_management_20260330` | `fdd03defc5` (2026-04-16) | 0 |
| `pivot/src/reconciliation/differs/trackMetadata.ts` | `environment_management_20260330` | `fdd03defc5` (2026-04-16) | 4 |
| `pivot/src/reconciliation/engine.test.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 0 |
| `pivot/src/reconciliation/engine.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 10 |
| `pivot/src/reconciliation/hash.test.ts` | `reconciliation_event_logging_20260415` | `fa7bfa8ff8` (2026-04-16) | 0 |
| `pivot/src/reconciliation/hash.ts` | `reconciliation_event_logging_20260415` | `fa7bfa8ff8` (2026-04-16) | 2 |
| `pivot/src/reconciliation/integrity.test.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 0 |
| `pivot/src/reconciliation/integrity.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 1 |
| `pivot/src/reconciliation/reconciliationClient.test.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 1 |
| `pivot/src/reconciliation/reconciliationClient.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 13 |
| `pivot/src/reconciliation/rules.test.ts` | `state_reconciliation_engine_20260415` | `9b975250ed` (2026-04-17) | 0 |
| `pivot/src/reconciliation/rules.ts` | `state_reconciliation_engine_20260415` | `9b975250ed` (2026-04-17) | 6 |
| `pivot/src/reconciliation/sweep.test.ts` | `environment_management_20260330` | `869eb46ca1` (2026-04-16) | 0 |
| `pivot/src/reconciliation/sweep.ts` | `environment_management_20260330` | `869eb46ca1` (2026-04-16) | 6 |
| `pivot/src/retrospective/scheduler.ts` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 1 |
| `pivot/src/routes/abTests.test.ts` | `agent_ab_testing_framework_20260527` | `afcb7cd4b8` (2026-05-29) | 1 |
| `pivot/src/routes/abTests.ts` | `schema_modularization_20260524` | `b38f53c19f` (2026-05-26) | 9 |
| `pivot/src/routes/agentTemplates.ts` | `custom_agent_templates_20260527` | `8b2388c694` (2026-05-29) | 8 |
| `pivot/src/routes/agents.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 9 |
| `pivot/src/routes/analysis.ts` | `static_analysis_integration_20260330` | `61a735cbfc` (2026-04-24) | 6 |
| `pivot/src/routes/analytics.ts` | `frontend_global_dashboard_onboarding_20260325` | `532d035e71` (2026-05-03) | 7 |
| `pivot/src/routes/costs.ts` | `cost_tracking_20260502` | `a716e5fe5c` (2026-05-03) | 6 |
| `pivot/src/routes/coverage.test.ts` | `test_coverage_dashboard_bun_convex_20260411` | `2177fb7854` (2026-04-12) | 1 |
| `pivot/src/routes/coverage.ts` | `test_coverage_dashboard_bun_convex_20260411` | `2177fb7854` (2026-04-12) | 4 |
| `pivot/src/routes/dashboard.test.ts` | `dashboard_20260517` | `2f9920cf86` (2026-05-19) | 0 |
| `pivot/src/routes/dashboard.ts` | `dashboard_20260517` | `2f9920cf86` (2026-05-19) | 2 |
| `pivot/src/routes/dependencies.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 3 |
| `pivot/src/routes/environments.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 6 |
| `pivot/src/routes/fleet.test.ts` | `fleet_command_center_20260510` | `5593ed505b` (2026-05-10) | 1 |
| `pivot/src/routes/fleet.ts` | `fleet_command_center_20260510` | `5593ed505b` (2026-05-10) | 9 |
| `pivot/src/routes/git.ts` | `environment_management_20260330` | `035e773f9b` (2026-04-09) | 8 |
| `pivot/src/routes/harnesses.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 9 |
| `pivot/src/routes/issues.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 6 |
| `pivot/src/routes/kanban.ts` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 7 |
| `pivot/src/routes/logs.test.ts` | `bun_orchestrator_migration_20260402` | `c9ab68ec5e` (2026-04-04) | 1 |
| `pivot/src/routes/logs.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 4 |
| `pivot/src/routes/notifications.test.ts` | `notification_system_20260502` | `61772b18e7` (2026-05-05) | 2 |
| `pivot/src/routes/notifications.ts` | `notification_system_20260502` | `61772b18e7` (2026-05-05) | 6 |
| `pivot/src/routes/orchestrator.test.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 1 |
| `pivot/src/routes/orchestrator.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 10 |
| `pivot/src/routes/performance.test.ts` | `employee_performance_analytics_20260517` | `802efe9466` (2026-05-17) | 1 |
| `pivot/src/routes/performance.ts` | `performance_profiling_20260502` | `c7f3cc8a9d` (2026-05-04) | 7 |
| `pivot/src/routes/pipelineEngine.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 3 |
| `pivot/src/routes/pipelines.test.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 1 |
| `pivot/src/routes/pipelines.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 7 |
| `pivot/src/routes/pr.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 4 |
| `pivot/src/routes/projects.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 8 |
| `pivot/src/routes/retrospectives.test.ts` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 1 |
| `pivot/src/routes/retrospectives.ts` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 8 |
| `pivot/src/routes/router.test.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 7 |
| `pivot/src/routes/router.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 9 |
| `pivot/src/routes/settings.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 3 |
| `pivot/src/routes/simulation.test.ts` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 2 |
| `pivot/src/routes/simulation.ts` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 4 |
| `pivot/src/routes/sprintPlanning.ts` | `sprint_planning_20260517` | `1bcbef13c4` (2026-05-19) | 4 |
| `pivot/src/routes/sprints.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 4 |
| `pivot/src/routes/stats.test.ts` | `dispatch_policy_stats_20260415` | `850db18550` (2026-04-16) | 0 |
| `pivot/src/routes/stats.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 6 |
| `pivot/src/routes/taskTimeline.test.ts` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 0 |
| `pivot/src/routes/taskTimeline.ts` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 2 |
| `pivot/src/server.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 4 |
| `pivot/src/shared/harnessProfile.test.ts` | `harness_capability_schema_20260415` | `067a453bec` (2026-04-16) | 0 |
| `pivot/src/shared/harnessProfile.ts` | `harness_capability_schema_20260415` | `067a453bec` (2026-04-16) | 11 |
| `pivot/src/shared/retrospectivePrompt.test.ts` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 0 |
| `pivot/src/shared/retrospectivePrompt.ts` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 2 |
| `pivot/src/shared/runContract.test.ts` | `platform_pivot_bun_convex_20260401` | `fada3cda21` (2026-04-15) | 0 |
| `pivot/src/shared/runContract.ts` | `platform_pivot_bun_convex_20260401` | `fada3cda21` (2026-04-15) | 18 |
| `pivot/src/sync/checkTasks.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 0 |
| `pivot/src/sync/checkTrack.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 0 |
| `pivot/src/sync/convexAgentSync.test.ts` | `environment_management_20260330` | `814671ee81` (2026-04-16) | 0 |
| `pivot/src/sync/convexAgentSync.ts` | `environment_management_20260330` | `814671ee81` (2026-04-16) | 3 |
| `pivot/src/sync/convexTrackSync.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 3 |
| `pivot/src/sync/createHarnesses.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 1 |
| `pivot/src/sync/createOrgChartAgents.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 1 |
| `pivot/src/sync/importAllTracks.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 1 |
| `pivot/src/sync/importMeasureProjects.ts` | `chore_cleanup_agent_harness_20260329` | `be796c2120` (2026-05-19) | 4 |
| `pivot/src/sync/importTasksFromPlans.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 3 |
| `pivot/src/sync/rebuild.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 3 |
| `pivot/src/sync/syncProvidersFromConfig.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 2 |
| `pivot/src/sync/trackMarkdown.test.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 0 |
| `pivot/src/sync/trackMarkdown.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 3 |
| `pivot/src/sync/updateAgentNames.ts` | `fleet_command_center_20260510` | `495b97f55c` (2026-05-10) | 1 |
| `pivot/src/typedConvexClient.ts` | `fix_open_tech_debt_20260404` | `266aad68d6` (2026-04-05) | 5 |
| `pivot/src/types.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 3 |
| `pivot/src/types/agentTemplates.ts` | `custom_agent_templates_20260527` | `012168accc` (2026-05-29) | 1 |
| `pivot/src/worker/localWorker.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 5 |

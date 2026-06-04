# convex backend (schema + queries + mutations + analytics)

**Slice ID:** `slice-6-convex`
**Files:** 81  ·  **Nodes:** 122

| Type | Count |
|------|-------|
| file | 81 |
| function | 71 |
| interface | 34 |
| type_alias | 9 |
| schema | 8 |

## Files in this slice (with originating track)

| File | Originating Track | Intro Commit | Nodes |
|------|-------------------|--------------|-------|
| `convex/__fixtures__/foundation.ts` | `convex_test_remediation_20260520` | `05a1e3070c` (2026-05-17) | 4 |
| `convex/__fixtures__/history.ts` | `convex_test_remediation_20260520` | `105b5f193a` (2026-05-18) | 4 |
| `convex/abTests.test.ts` | `agent_ab_testing_framework_20260527` | `afcb7cd4b8` (2026-05-29) | 1 |
| `convex/abTests.ts` | `schema_modularization_20260524` | `b38f53c19f` (2026-05-26) | 0 |
| `convex/agentTemplates.ts` | `custom_agent_templates_20260527` | `01bf2dd44b` (2026-05-29) | 0 |
| `convex/agents.ts` | `dashboard_20260517` | `fea5423fd3` (2026-05-17) | 0 |
| `convex/alerts.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `convex/analysisResults.ts` | `static_analysis_integration_20260330` | `61a735cbfc` (2026-04-24) | 0 |
| `convex/analytics.ts` | `continuous_orchestration_20260502` | `9f577fd7b5` (2026-05-03) | 0 |
| `convex/audit.ts` | `schema_modularization_20260524` | `b38f53c19f` (2026-05-26) | 0 |
| `convex/budgets.ts` | `economic_control_plane_20260415` | `2d3f180a24` (2026-04-16) | 2 |
| `convex/circuitBreakers.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 0 |
| `convex/continuousMode.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 0 |
| `convex/costs.ts` | `cost_tracking_20260502` | `f4220dbb75` (2026-05-03) | 0 |
| `convex/coverageRecords.ts` | `test_coverage_dashboard_bun_convex_20260411` | `2177fb7854` (2026-04-12) | 0 |
| `convex/dashboard.ts` | `dashboard_20260517` | `2f9920cf86` (2026-05-19) | 0 |
| `convex/dispatchPolicyStats.ts` | `dispatch_policy_stats_20260415` | `3e7a3675e8` (2026-04-16) | 0 |
| `convex/employees.ts` | `tech_debt_remediation_20260516` | `f65b5dd1e8` (2026-05-16) | 7 |
| `convex/executionLogs.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 0 |
| `convex/fleet.ts` | `fleet_command_center_20260510` | `5593ed505b` (2026-05-10) | 0 |
| `convex/fleetCatalog.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 0 |
| `convex/harnessProfiles.ts` | `harness_capability_schema_20260415` | `067a453bec` (2026-04-16) | 0 |
| `convex/harnessReliabilityStats.ts` | `dispatch_policy_stats_20260415` | `3e7a3675e8` (2026-04-16) | 0 |
| `convex/history/agents.ts` | `convex_test_remediation_20260520` | `105b5f193a` (2026-05-18) | 0 |
| `convex/history/sprints.ts` | `convex_test_remediation_20260520` | `105b5f193a` (2026-05-18) | 0 |
| `convex/history/tasks.ts` | `convex_test_remediation_20260520` | `105b5f193a` (2026-05-18) | 0 |
| `convex/insights.ts` | `dashboard_20260517` | `5839e6d106` (2026-05-18) | 0 |
| `convex/issues.ts` | `agent_harness_management_ui_20260327` | `fa3ec3200c` (2026-04-02) | 0 |
| `convex/kanban.ts` | `frontend_project_kanban_board_20260325` | `02873c8b57` (2026-05-19) | 0 |
| `convex/lib/analytics.ts` | `convex_test_remediation_20260520` | `694358e1ef` (2026-05-03) | 20 |
| `convex/lib/auth.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 3 |
| `convex/lib/budget.ts` | `e2e_coverage_tab_20260417` | `5036dae944` (2026-04-17) | 12 |
| `convex/lib/cost.ts` | `cost_tracking_20260502` | `f4220dbb75` (2026-05-03) | 9 |
| `convex/lib/costMetrics.ts` | `continuous_orchestration_20260502` | `54dfa1c0e9` (2026-05-03) | 4 |
| `convex/lib/insights.ts` | `dashboard_20260517` | `5839e6d106` (2026-05-18) | 11 |
| `convex/lib/notifications.ts` | `notification_system_20260502` | `dfe5303f28` (2026-05-05) | 2 |
| `convex/lib/performance.ts` | `performance_profiling_20260502` | `c7f3cc8a9d` (2026-05-04) | 14 |
| `convex/lib/retrospective.ts` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 8 |
| `convex/lib/types.ts` | `frontend_convex_migration_20260402` | `e3ee3f4505` (2026-05-25) | 1 |
| `convex/lib/validators.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 0 |
| `convex/migrate.ts` | `virtual_software_house_mvp_20260516` | `d55808ed9c` (2026-05-16) | 4 |
| `convex/notifications.ts` | `notification_system_20260502` | `61772b18e7` (2026-05-05) | 4 |
| `convex/orchestratorErrors.ts` | `dispatch_scoring_v2_20260501` | `208da4ab11` (2026-05-01) | 0 |
| `convex/performance.ts` | `performance_profiling_20260502` | `c7f3cc8a9d` (2026-05-04) | 0 |
| `convex/pipelineRuns.ts` | `dashboard_20260517` | `3cb32567a9` (2026-05-18) | 0 |
| `convex/pipelines.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 0 |
| `convex/policyWeights.ts` | `environment_management_20260330` | `91fc653bba` (2026-04-16) | 0 |
| `convex/portfolio.test.ts` | `review_remediation_20260529` | `f104bc7e61` (2026-05-29) | 0 |
| `convex/portfolio.ts` | `review_remediation_20260529` | `f104bc7e61` (2026-05-29) | 2 |
| `convex/projects.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 0 |
| `convex/providers.ts` | `dashboard_20260517` | `38858fab19` (2026-05-18) | 0 |
| `convex/queueHealth.ts` | `environment_management_20260330` | `4d5099ae20` (2026-04-16) | 0 |
| `convex/reconciliationDecisions.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 0 |
| `convex/reconciliationEngine.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 0 |
| `convex/reconciliationEvents.ts` | `reconciliation_event_logging_20260415` | `fa7bfa8ff8` (2026-04-16) | 0 |
| `convex/reconciliationProposals.ts` | `state_reconciliation_engine_20260415` | `096494f284` (2026-04-17) | 0 |
| `convex/recoveryLog.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 0 |
| `convex/retrospectives.ts` | `continuous_orchestration_20260502` | `2f79f9e748` (2026-05-04) | 0 |
| `convex/runContracts.ts` | `platform_pivot_bun_convex_20260401` | `fada3cda21` (2026-04-15) | 0 |
| `convex/scheduler.ts` | `tech_debt_remediation_20260516` | `12d5693470` (2026-05-16) | 5 |
| `convex/schema.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 0 |
| `convex/schema/agents.ts` | `schema_modularization_20260524` | `49dd68f8ea` (2026-05-25) | 0 |
| `convex/schema/analytics.ts` | `schema_modularization_20260524` | `49dd68f8ea` (2026-05-25) | 0 |
| `convex/schema/contracts.ts` | `schema_modularization_20260524` | `49dd68f8ea` (2026-05-25) | 0 |
| `convex/schema/core.ts` | `schema_modularization_20260524` | `49dd68f8ea` (2026-05-25) | 0 |
| `convex/schema/operations.ts` | `schema_modularization_20260524` | `49dd68f8ea` (2026-05-25) | 0 |
| `convex/schema/planning.ts` | `schema_modularization_20260524` | `49dd68f8ea` (2026-05-25) | 0 |
| `convex/schema/tasks.ts` | `schema_modularization_20260524` | `49dd68f8ea` (2026-05-25) | 0 |
| `convex/scoreAudit.ts` | `environment_management_20260330` | `91fc653bba` (2026-04-16) | 0 |
| `convex/seed.ts` | `virtual_software_house_mvp_20260516` | `d55808ed9c` (2026-05-16) | 3 |
| `convex/seedAgents.ts` | `dashboard_20260517` | `25251f7e33` (2026-05-17) | 0 |
| `convex/seedMvp.ts` | `dashboard_20260517` | `25251f7e33` (2026-05-17) | 0 |
| `convex/simulationRuns.ts` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 0 |
| `convex/sprintPlanning.ts` | `platform_pivot_bun_convex_20260401` | `185f85105d` (2026-05-19) | 0 |
| `convex/sprints.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 0 |
| `convex/stats.ts` | `go_decommission_final_20260402` | `0a344626f4` (2026-04-03) | 0 |
| `convex/systemMetadata.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `convex/taskRecovery.ts` | `self_healing_20260502` | `c025d7eac4` (2026-04-05) | 0 |
| `convex/taskTimeline.ts` | `e2e_task_timeline_20260424` | `7d52a6c70d` (2026-05-19) | 2 |
| `convex/tasks.ts` | `convex_test_remediation_20260520` | `c38d716efc` (2026-05-18) | 0 |
| `convex/tracks.ts` | `platform_pivot_bun_convex_20260401` | `a8078787c4` (2026-04-02) | 0 |

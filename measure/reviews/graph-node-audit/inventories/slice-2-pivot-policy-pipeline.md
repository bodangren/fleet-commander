# pivot/policy + pivot/pipeline + scoring

**Slice ID:** `slice-2-pivot-policy-pipeline`
**Files:** 44  ·  **Nodes:** 198

| Type | Count |
|------|-------|
| function | 106 |
| file | 44 |
| interface | 43 |
| type_alias | 25 |
| schema | 13 |
| class | 11 |

## Files in this slice (with originating track)

| File | Originating Track | Intro Commit | Nodes |
|------|-------------------|--------------|-------|
| `pivot/src/pipeline/agentTypes.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 13 |
| `pivot/src/pipeline/costTracker.test.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 0 |
| `pivot/src/pipeline/costTracker.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 3 |
| `pivot/src/pipeline/integration.test.ts` | `pipeline_runner_20260330` | `126640fe5a` (2026-04-03) | 1 |
| `pivot/src/pipeline/loader.test.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 1 |
| `pivot/src/pipeline/loader.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 5 |
| `pivot/src/pipeline/orchestrator.test.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 0 |
| `pivot/src/pipeline/orchestrator.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 4 |
| `pivot/src/pipeline/runner.test.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 1 |
| `pivot/src/pipeline/runner.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 8 |
| `pivot/src/pipeline/scheduler.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 2 |
| `pivot/src/pipeline/stages/architect.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 2 |
| `pivot/src/pipeline/stages/dispatch.test.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 0 |
| `pivot/src/pipeline/stages/dispatch.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 4 |
| `pivot/src/pipeline/stages/executor.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 1 |
| `pivot/src/pipeline/stages/merger.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 1 |
| `pivot/src/pipeline/stages/reviewer.ts` | `pipeline_engine_20260517` | `c25c8b9af3` (2026-05-19) | 2 |
| `pivot/src/pipeline/types.ts` | `fix_yaml_safe_schema_20260425` | `64043d61b7` (2026-04-03) | 17 |
| `pivot/src/policy/allocator.test.ts` | `resource_allocation_policy_20260415` | `de91cfaccb` (2026-04-17) | 2 |
| `pivot/src/policy/allocator.ts` | `resource_allocation_policy_20260415` | `de91cfaccb` (2026-04-17) | 18 |
| `pivot/src/policy/budgetClient.test.ts` | `fix_governance_events_index_td026_20260417` | `6b92ddd81d` (2026-04-17) | 1 |
| `pivot/src/policy/budgetClient.ts` | `economic_control_plane_20260415` | `2d3f180a24` (2026-04-16) | 10 |
| `pivot/src/policy/dispatch.test.ts` | `adaptive_scoring_engine_20260415` | `4f69f6e698` (2026-04-16) | 1 |
| `pivot/src/policy/dispatch.ts` | `adaptive_scoring_engine_20260415` | `4f69f6e698` (2026-04-16) | 3 |
| `pivot/src/policy/economic.integration.test.ts` | `economic_control_plane_20260415` | `2d3f180a24` (2026-04-16) | 0 |
| `pivot/src/policy/economic.test.ts` | `economic_control_plane_20260415` | `2d3f180a24` (2026-04-16) | 0 |
| `pivot/src/policy/economic.ts` | `economic_control_plane_20260415` | `2d3f180a24` (2026-04-16) | 12 |
| `pivot/src/policy/policyClient.test.ts` | `environment_management_20260330` | `91fc653bba` (2026-04-16) | 1 |
| `pivot/src/policy/policyClient.ts` | `environment_management_20260330` | `91fc653bba` (2026-04-16) | 9 |
| `pivot/src/policy/recompute.test.ts` | `dispatch_policy_stats_20260415` | `850db18550` (2026-04-16) | 2 |
| `pivot/src/policy/recompute.ts` | `dispatch_policy_stats_20260415` | `850db18550` (2026-04-16) | 6 |
| `pivot/src/policy/rollup.test.ts` | `dispatch_policy_stats_20260415` | `34c98f2995` (2026-04-16) | 1 |
| `pivot/src/policy/rollup.ts` | `dispatch_policy_stats_20260415` | `34c98f2995` (2026-04-16) | 18 |
| `pivot/src/policy/scheduler.ts` | `dispatch_policy_stats_20260415` | `850db18550` (2026-04-16) | 1 |
| `pivot/src/policy/scoring.test.ts` | `adaptive_scoring_engine_20260415` | `da8f06ce74` (2026-04-16) | 1 |
| `pivot/src/policy/scoring.ts` | `adaptive_scoring_engine_20260415` | `da8f06ce74` (2026-04-16) | 15 |
| `pivot/src/policy/simulation.test.ts` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 1 |
| `pivot/src/policy/simulation.ts` | `policy_simulation_replay_20260415` | `a1be0b380a` (2026-04-17) | 5 |
| `pivot/src/policy/statsClient.test.ts` | `dispatch_policy_stats_20260415` | `3e7a3675e8` (2026-04-16) | 1 |
| `pivot/src/policy/statsClient.ts` | `dispatch_policy_stats_20260415` | `3e7a3675e8` (2026-04-16) | 8 |
| `pivot/src/policy/weeklyReport.test.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 2 |
| `pivot/src/policy/weeklyReport.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 8 |
| `pivot/src/policy/weightPresets.test.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 0 |
| `pivot/src/policy/weightPresets.ts` | `continuous_orchestration_20260502` | `21afdd7547` (2026-05-02) | 7 |

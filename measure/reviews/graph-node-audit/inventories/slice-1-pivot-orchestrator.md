# pivot/orchestrator core

**Slice ID:** `slice-1-pivot-orchestrator`
**Files:** 56  ·  **Nodes:** 142

| Type | Count |
|------|-------|
| function | 79 |
| file | 56 |
| interface | 38 |
| class | 12 |
| type_alias | 10 |
| schema | 3 |

## Files in this slice (with originating track)

| File | Originating Track | Intro Commit | Nodes |
|------|-------------------|--------------|-------|
| `pivot/src/orchestrator/autoPauseHandler.test.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 0 |
| `pivot/src/orchestrator/autoPauseHandler.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 2 |
| `pivot/src/orchestrator/autoRunner.test.ts` | `chore_orchestrator_harness_integration_20260329` | `e3f7868f74` (2026-05-02) | 0 |
| `pivot/src/orchestrator/autoRunner.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 3 |
| `pivot/src/orchestrator/candidates.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 4 |
| `pivot/src/orchestrator/circuitBreaker.test.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 0 |
| `pivot/src/orchestrator/circuitBreaker.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 1 |
| `pivot/src/orchestrator/concurrencyLimiter.test.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 0 |
| `pivot/src/orchestrator/concurrencyLimiter.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 1 |
| `pivot/src/orchestrator/constraints.test.ts` | `dispatch_hard_constraints_20260415` | `e729a3a9be` (2026-04-16) | 1 |
| `pivot/src/orchestrator/constraints.ts` | `dispatch_hard_constraints_20260415` | `e729a3a9be` (2026-04-16) | 12 |
| `pivot/src/orchestrator/continuousMode.test.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 0 |
| `pivot/src/orchestrator/continuousMode.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 1 |
| `pivot/src/orchestrator/continuousOrchestrator.test.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 0 |
| `pivot/src/orchestrator/continuousOrchestrator.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 3 |
| `pivot/src/orchestrator/coverageEnforcement.test.ts` | `environment_management_20260330` | `f252d384a5` (2026-04-14) | 0 |
| `pivot/src/orchestrator/coverageEnforcement.ts` | `environment_management_20260330` | `f252d384a5` (2026-04-14) | 5 |
| `pivot/src/orchestrator/evaluator.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 4 |
| `pivot/src/orchestrator/executor.test.ts` | `chore_orchestrator_harness_integration_20260329` | `e3f7868f74` (2026-05-02) | 1 |
| `pivot/src/orchestrator/executor.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 5 |
| `pivot/src/orchestrator/gitOrchestrator.test.ts` | `chore_orchestrator_harness_integration_20260329` | `0441c0ba93` (2026-04-10) | 1 |
| `pivot/src/orchestrator/gitOrchestrator.ts` | `chore_orchestrator_harness_integration_20260329` | `0441c0ba93` (2026-04-10) | 2 |
| `pivot/src/orchestrator/hookRunner.test.ts` | `continuous_orchestration_20260502` | `79ce586f18` (2026-05-03) | 0 |
| `pivot/src/orchestrator/hookRunner.ts` | `continuous_orchestration_20260502` | `79ce586f18` (2026-05-03) | 4 |
| `pivot/src/orchestrator/index.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 0 |
| `pivot/src/orchestrator/issues.test.ts` | `chore_orchestrator_harness_integration_20260329` | `e3f7868f74` (2026-05-02) | 0 |
| `pivot/src/orchestrator/issues.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 3 |
| `pivot/src/orchestrator/logger.test.ts` | `dispatch_scoring_v2_20260501` | `721f7a3cc2` (2026-05-01) | 0 |
| `pivot/src/orchestrator/logger.ts` | `dispatch_scoring_v2_20260501` | `208da4ab11` (2026-05-01) | 5 |
| `pivot/src/orchestrator/notifications.test.ts` | `notification_system_20260502` | `61772b18e7` (2026-05-05) | 0 |
| `pivot/src/orchestrator/opencodeServer.test.ts` | `fix_circuit_breaker_sla_tags_20260504` | `de960a6334` (2026-05-05) | 0 |
| `pivot/src/orchestrator/opencodeServer.ts` | `agent_scheduling_execution_20260313` | `b754678f9e` (2026-05-05) | 3 |
| `pivot/src/orchestrator/orchestrator.test.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 0 |
| `pivot/src/orchestrator/orchestrator.timing.test.ts` | `fix_circuit_breaker_sla_tags_20260504` | `29412ca1f6` (2026-05-05) | 0 |
| `pivot/src/orchestrator/orchestrator.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 9 |
| `pivot/src/orchestrator/recoveryDispatcher.test.ts` | `self_healing_20260502` | `ae1ef78b77` (2026-04-05) | 1 |
| `pivot/src/orchestrator/recoveryDispatcher.ts` | `self_healing_20260502` | `ae1ef78b77` (2026-04-05) | 3 |
| `pivot/src/orchestrator/resolver.test.ts` | `chore_orchestrator_harness_integration_20260329` | `e3f7868f74` (2026-05-02) | 0 |
| `pivot/src/orchestrator/resolver.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 6 |
| `pivot/src/orchestrator/retryManager.test.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 0 |
| `pivot/src/orchestrator/retryManager.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 1 |
| `pivot/src/orchestrator/run.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 1 |
| `pivot/src/orchestrator/runAllProjects.test.ts` | `chore_orchestrator_harness_integration_20260329` | `e3f7868f74` (2026-05-02) | 2 |
| `pivot/src/orchestrator/runContract.test.ts` | `platform_pivot_bun_convex_20260401` | `fada3cda21` (2026-04-15) | 1 |
| `pivot/src/orchestrator/runContract.ts` | `platform_pivot_bun_convex_20260401` | `fada3cda21` (2026-04-15) | 10 |
| `pivot/src/orchestrator/scheduler.test.ts` | `convex_test_remediation_20260520` | `f8c0670448` (2026-05-16) | 1 |
| `pivot/src/orchestrator/scheduler.ts` | `tech_debt_remediation_20260516` | `12d5693470` (2026-05-16) | 4 |
| `pivot/src/orchestrator/sdkClient.ts` | `fix_circuit_breaker_sla_tags_20260504` | `de960a6334` (2026-05-05) | 7 |
| `pivot/src/orchestrator/stalledDetector.test.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 0 |
| `pivot/src/orchestrator/stalledDetector.ts` | `self_healing_20260502` | `2024c96c67` (2026-04-05) | 2 |
| `pivot/src/orchestrator/tagParser.test.ts` | `continuous_orchestration_20260502` | `d0363688a5` (2026-05-03) | 0 |
| `pivot/src/orchestrator/tagParser.ts` | `continuous_orchestration_20260502` | `d0363688a5` (2026-05-03) | 3 |
| `pivot/src/orchestrator/taskQueue.test.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 0 |
| `pivot/src/orchestrator/taskQueue.ts` | `continuous_orchestration_20260502` | `af6e4fe9ab` (2026-04-05) | 2 |
| `pivot/src/orchestrator/tech_debt_verification.test.ts` | `bun_orchestrator_migration_20260402` | `a6144f046c` (2026-04-04) | 0 |
| `pivot/src/orchestrator/types.ts` | `agent_issue_autocreation_20260330` | `c670adabda` (2026-04-02) | 28 |

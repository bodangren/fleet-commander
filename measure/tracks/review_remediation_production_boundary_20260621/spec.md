# Spec: Review Remediation — Production Boundary Fixes

## Goal

Fix the production bugs that caused three completed tracks to receive VERDICT: NO, and replace the boundary-mock tests that masked the failures with real-behavior tests that validate the actual Convex/API contract.

## Affected Tracks

1. `quality_workflow_hot_path_wiring_20260618` — production runner never persists stage attempts/snapshots, runs commands in the wrong cwd, and ignores retry.
2. `operations_api_contract_closure_20260618` — pipeline trigger persistence throws because of a UUID-vs-`v.id('tasks')` mismatch; `GET /api/pipelines` returns raw rows instead of the frontend contract; unbounded `.collect()` queries.
3. `route_fixes_regression_20260613` — history hooks use the wrong Convex handler name after the function was renamed; the S8 smoke-config contract test points to the old `measure/tracks/...` path after archival.

## Acceptance Criteria

1. `productionQualityWorkflowHooks.runner` calls `api.qualityRuns.startQualityRun` before the first stage, `api.qualityRuns.appendStageAttempt` after each stage, and `api.qualityRuns.finishQualityRun` when the run ends.
2. Shell-based quality stages execute with `cwd` set to the dispatched project's `rootPath`.
3. The production runner honors `stage.attempts` and returns the actual attempt number in `StageResult`.
4. `POST /api/pipelines/:name/trigger` persists a `pipelineRuns` row using the runner-generated `executionId`; persistence failures surface as HTTP errors, not silent no-ops.
5. `GET /api/pipelines` returns `PipelineExecution[]` with `executionId`, `pipelineName`, `status` (`succeeded`/`failed`/`running`/...), `startedAt`, and `completedAt`.
6. Convex queries in `pipelineRuns`, `qualityRuns`, and `taskHistory` have a default upper bound to prevent unbounded `.collect()`.
7. `frontend/src/lib/convex-data/history.ts` calls the exported handler names: `history/tasks:listTaskHistoryHandler`, `history/agents:listAgentHistoryHandler`, `history/sprints:listSprintHistoryHandler`.
8. `frontend/src/__tests__/smoke-config.contract.test.ts` reads `smoke-config.json` from `measure/archive/route_fixes_regression_20260613/scripts/`.
9. New regression tests fail at HEAD and pass after the fixes; they assert real side effects (Convex mutation args, cwd, mapped shapes) rather than mocked returns.
10. Full pivot and frontend test suites, typechecks, lint, and `build-graph` audit pass.

## Non-Goals

- Redesigning the quality profile schema or introducing a new scheduler.
- Replacing the pipeline runner engine.
- Rewriting the history pages beyond the API path fix.

## Verification

- `bun --cwd pivot test src/orchestrator/productionQualityWorkflowHooks.test.ts src/routes/pipelines.test.ts`
- `bun --cwd frontend test src/lib/convex-data/history.test.ts src/__tests__/smoke-config.contract.test.ts --run`
- `bun --cwd pivot typecheck`
- `bun --cwd frontend check`
- `build-graph stats ./graph.db && build-graph audit ./graph.db`

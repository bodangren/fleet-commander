> Remediation track for three NO-verdict tracks. See `spec.md` for acceptance criteria and baseline commands.

## Phase 1: Red — Prove the Boundary Bugs

- [ ] Task: Add failing test: `productionQualityWorkflowHooks` never calls `startQualityRun/appendStageAttempt/finishQualityRun`.
- [ ] Task: Add failing test: shell stages run without project `rootPath` as cwd.
- [ ] Task: Add failing test: `phase_acceptance` with `attempts: 2` reports `attempt: 1` and does not retry.
- [ ] Task: Add failing test: `POST /api/pipelines/:name/trigger` passes a UUID where `createPipelineRunHandler` expects `v.id('tasks')`.
- [ ] Task: Add failing test: `GET /api/pipelines` returns raw `pipelineRuns` rows instead of `PipelineExecution[]`.
- [ ] Task: Add failing test: history hooks call `:listTaskHistory` / `:listAgentHistory` / `:listSprintHistory` but Convex exports `*Handler`.
- [ ] Task: Add failing test: smoke-config contract test reads from `measure/tracks/...` but file is in `measure/archive/...`.
- [ ] Task: Record baseline test results and graph stats.

## Phase 2: Green — Quality Workflow Real Persistence & Execution

- [ ] Task: Add optional `cwd` parameter to `executeCommand` and forward to `Bun.spawn`.
- [ ] Task: Extend `StageExecutor` / `QualityWorkflowRunner.runStage` to receive runtime context `{ stage, attempt, projectSlug, taskKey, runId, rootPath }`.
- [ ] Task: Update `sequenceQualityStages` and `runQualityWorkflow` to pass context + attempt.
- [ ] Task: Add lifecycle hooks to `QualityWorkflowHooks` and call them from `runConfiguredQualityWorkflow`.
- [ ] Task: Implement lifecycle hooks in `productionQualityWorkflowHooks.ts` using `api.qualityRuns.*` mutations.
- [ ] Task: Make shell stages run in `rootPath` cwd and retry failed shell stages up to `stage.attempts`.
- [ ] Task: Update existing callers/tests for the new `runStage` signature.
- [ ] Task: Run focused pivot tests; expect green.

## Phase 3: Green — Operations API Real Persistence & Contract Shape

- [ ] Task: Add optional `executionId: v.optional(v.string())` to `pipelineRuns` schema.
- [ ] Task: Update `createPipelineRunHandler` to accept `executionId` and optional `taskId`.
- [ ] Task: Update `pivot/src/routes/pipelines.ts` to pass `execution.id` as `executionId` and valid `triggeredByTaskId` as `taskId`; surface persistence errors.
- [ ] Task: Map `listPipelineRunsHandler` rows to `PipelineExecution[]` in `GET /api/pipelines`.
- [ ] Task: Add default limits to `listPipelineRunsHandler`, `listQualityRunsByStatusHandler`, and `listTaskHistoryHandler`.
- [ ] Task: Add/update pivot route tests with real boundary assertions.
- [ ] Task: Run `bun --cwd pivot test` and `bun --cwd pivot typecheck`.

## Phase 4: Green — Route Fixes Path Drift

- [ ] Task: Update history API constants in `frontend/src/lib/convex-data/history.ts` to use `*Handler` suffixes.
- [ ] Task: Update smoke-config contract test path to `measure/archive/route_fixes_regression_20260613/scripts/smoke-config.json`.
- [ ] Task: Run frontend tests and `bun --cwd frontend check`.

## Phase 5: Real-Behavior Regression Tests

- [ ] Task: Replace vacuous boundary-mock tests with tests asserting real side effects for all three work-streams.
- [ ] Task: Confirm each new regression test fails at HEAD and passes after the fixes.

## Phase 6: Verification & Closeout

- [ ] Task: Run full pivot and frontend suites.
- [ ] Task: Run typechecks and lint.
- [ ] Task: Run `build-graph update ./graph.db` for changed files.
- [ ] Task: Update `measure/tracks.md`, `measure/tech-debt.md`, `measure/lessons-learned.md`.
- [ ] Task: Mark track complete and commit closeout.

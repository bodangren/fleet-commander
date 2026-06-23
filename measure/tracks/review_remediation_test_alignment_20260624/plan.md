# Implementation Plan: Review Remediation — Production-Boundary & Test-Alignment Fixes

Track: `review_remediation_test_alignment_20260624`
Spec ref: [./spec.md](./spec.md)

TDD: every phase writes failing tests that reproduce the defect against current
HEAD (Red) before the fix (Green). Per FR-8, the Red tests become the permanent
regression suite — they are renamed, not deleted, and must still fail when the
fix is reverted.

## Phase 1: Red — Reproduce every defect at HEAD

- [ ] Task: Failing test — stage-boundary timestamps are fabricated. Drive `runConfiguredQualityWorkflow` with a runner whose stage sleeps a measurable interval; assert the `appendStageAttempt` args have `finishedAt > startedAt` and are not both a single post-run `Date.now()`. (Reproduces FR-1; fails at HEAD.)
- [ ] Task: Failing test — `listTaskHistoryHandler` drops matching rows. Seed >100 tasks where matching-status rows are older than the 100 most-recent; assert `listTaskHistoryHandler({ status, limit })` returns the matching rows. (Reproduces FR-2/FR-7; fails at HEAD.)
- [ ] Task: Failing test — `GET /api/pipelines` returns a real `pipelineName`. Seed named runs; assert the mapped `pipelineName` equals the seeded name, not `'unknown'`. (Reproduces FR-3/FR-5; fails at HEAD.)
- [ ] Task: Failing test — trigger route HTTP semantics. A `runPipeline` client/validation error yields `4xx`; a Convex persistence failure yields `5xx`. (Reproduces FR-4; the 4xx assertion fails at HEAD.)
- [ ] Task: Record the Red baseline (commands + pass/fail counts) and current `build-graph stats` in this plan.

## Phase 2: Green — Real stage-boundary timing (FR-1, FR-6)

- [ ] Task: Add `startedAt`/`finishedAt` to `StageResult` in `qualityWorkflowRunner.ts`.
- [ ] Task: In `productionQualityWorkflowHooks.ts` `runStage`, capture `startedAt` before `executeCommand` and `finishedAt` after (per attempt) and populate them on the returned `StageResult`.
- [ ] Task: In `qualityWorkflowDispatch.ts`, forward `entry.startedAt`/`entry.finishedAt` to `onStageResult`; remove the `const startedAt = finishedAt = Date.now()` fabrication.
- [ ] Task: Update `qualityWorkflowDispatch.phase2.test.ts` and `productionQualityWorkflowHooks.regression.test.ts` to assert the real timing window (FR-6) instead of `typeof === 'number'` / hand-fed constants.
- [ ] Task: `build-graph update ./graph.db` for the changed orchestrator files; run focused pivot tests green.

## Phase 3: Green — History filter ordering (FR-2, FR-7)

- [ ] Task: Reorder `listTaskHistoryHandler` so `status`/`search` filtering happens before the `take(limit)` bound; use the `by_status` index when `status` is provided; keep the capped default (100) without dropping matches.
- [ ] Task: Extend `convex/history/tasks.test.ts` with the limit+filter interaction case (rename/keep the Phase 1 Red test as the permanent guard).
- [ ] Task: Run convex history handler tests green; confirm no read-amplification regression on the index path.

## Phase 4: Green — AC5 real pipelineName (FR-3, FR-5)

- [ ] Task: Add `pipelineName: v.optional(v.string())` to `pipelineRuns` (`convex/schema/tasks.ts`) and the `pipelineRunResponse` validator (`convex/pipelineRuns.ts`).
- [ ] Task: Thread `pipelineName` through `createPipelineRunHandler` and `storeExecution` (the trigger route already has `execution.pipelineName`).
- [ ] Task: Map the real `pipelineName` in `GET /api/pipelines`; delete the `'unknown'` literal.
- [ ] Task: Replace the `pipelineName: 'unknown'` assertions in `pipelines.regression.test.ts` (L190/197) with real-name assertions.
- [ ] Task: `build-graph update ./graph.db` for the convex + route files.

## Phase 5: Green — Trigger HTTP status semantics (FR-4)

- [ ] Task: In `POST /api/pipelines/:name/trigger`, distinguish client/validation errors from `runPipeline` (return `4xx`/`badRequest`) from server/persistence failures (return `5xx`), preserving the deliberate Convex-persistence `500`.
- [ ] Task: Confirm the Phase 1 Red HTTP-semantics test now passes; add a 4xx case for invalid input.

## Phase 6: Test-alignment & AC9 reconciliation (FR-8)

- [ ] Task: Promote each Phase 1 Red test into a permanent regression suite (rename, do not delete); verify each still fails when its fix is reverted (record the revert-check evidence in this plan).
- [ ] Task: Reconcile the S5 closeout guard (`zero *.red.test.ts files`) so it does not force deletion of bug-reproducing evidence — e.g. recognize a `*.regression.test.ts` naming for permanent guards while still banning stray `*.red.test.ts`.
- [ ] Task: Annotate the prior track's AC5/AC9 closeout gap in `measure/archive/review_remediation_production_boundary_20260621/` (note that AC5 was unsatisfiable and AC9 evidence was deleted), and add a `lessons-learned.md` entry on "regression tests must fail at HEAD; never assert a known-wrong value".
- [ ] Task: Log/Update tech-debt entries for any residual gaps closed by this track.

## Phase 7: Verification & closeout

- [ ] Task: Run full `bun --cwd pivot test`, `bun --cwd pivot typecheck`, `bun --cwd frontend check`, and the convex history tests; record counts.
- [ ] Task: Safe `graph.db` rebuild (temp-then-swap per AGENTS.md) if signatures/schema changed broadly; run `build-graph stats` + `build-graph audit`.
- [ ] Task: Register the track in `measure/tracks.md` as completed and write the closeout note.

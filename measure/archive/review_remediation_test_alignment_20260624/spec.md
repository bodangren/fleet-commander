# Spec: Review Remediation — Production-Boundary & Test-Alignment Fixes (72h Audit 2026-06-24)

## Overview

A deep review of the last 72 hours of commits (2026-06-21..24, the
`review_remediation_production_boundary_20260621` and
`auth_config_identity_20260622` tracks) found that several production-boundary
fixes shipped green while either persisting wrong data or leaving the spec's
acceptance criteria unmet — and the accompanying "regression" tests do not hold
those requirements accountable. In two cases a test actively codifies the bug.

This track fixes the four production defects and repairs the test suite so the
tests validate the **requirements** (values and semantics), not just the
**plumbing** (that a call happened).

## Affected Code

- `pivot/src/orchestrator/qualityWorkflowDispatch.ts` — `onStageResult` wiring.
- `pivot/src/orchestrator/qualityWorkflowRunner.ts` — `StageResult` shape.
- `pivot/src/orchestrator/productionQualityWorkflowHooks.ts` — stage runner timing.
- `convex/history/tasks.ts` — `listTaskHistoryHandler` filter/limit ordering.
- `pivot/src/routes/pipelines.ts` — `GET /api/pipelines` mapping + trigger HTTP status.
- `convex/schema/tasks.ts` / `convex/pipelineRuns.ts` — `pipelineRuns.pipelineName`.
- `pivot/src/routes/pipelines.regression.test.ts` — bug-codifying assertion.
- `pivot/src/orchestrator/productionQualityWorkflowHooks.regression.test.ts`,
  `qualityWorkflowDispatch.phase2.test.ts` — timing assertions.
- `convex/history/tasks.test.ts` — missing limit+filter coverage.

## Functional Requirements

### Production defects

- **FR-1 (Stage-boundary timestamps).** `onStageResult` must persist the real
  per-stage execution window. The production runner must capture `startedAt`
  before a stage runs and `finishedAt` after it completes, carry them on
  `StageResult`, and `runConfiguredQualityWorkflow` must forward those values to
  `appendStageAttempt`. The current code sets
  `startedAt = finishedAt = Date.now()` *after* the whole workflow finishes, so
  every persisted attempt has zero duration at the wrong instant
  (`qualityWorkflowDispatch.ts` ~L105-122).

- **FR-2 (History filter ordering).** `listTaskHistoryHandler` must apply the
  `status` / `search` filters *before* the default `take(limit)` bound, so a
  filtered query returns the most-recent `limit` **matching** rows rather than
  the matches found within the most-recent `limit` rows. Today `.take(limit)`
  (default 100) runs first and the filters run on that slice
  (`convex/history/tasks.ts:34-50`), silently dropping matching tasks in
  projects with more than `limit` tasks. Prefer the `by_status` index where
  applicable; preserve the unbounded-by-default behavior change only as a
  capped default, not a correctness regression.

- **FR-3 (AC5: real pipelineName).** `GET /api/pipelines` must return the real
  `pipelineName` for each execution, satisfying production-boundary spec §AC5.
  Persist `pipelineName` on the `pipelineRuns` row (schema + `createPipelineRun`
  + trigger route) and map it through, instead of hardcoding `'unknown'`
  (`pipelines.ts:204`).

- **FR-4 (HTTP status semantics).** `POST /api/pipelines/:name/trigger` must
  return `4xx` for client/validation errors (bad input surfaced by
  `runPipeline`) and reserve `5xx` for genuine server/persistence failures. The
  current catch-all returns `500` for every error
  (`pipelines.ts:146-149`), masking client errors as server errors. The
  intentional Convex-persistence `500` (FR from the prior track) is retained.

### Test-alignment defects

- **FR-5 (Remove bug-codifying assertion).** `pipelines.regression.test.ts`
  must assert the **real** `pipelineName` (per FR-3), not the literal
  `'unknown'` it currently locks in at lines 190/197.

- **FR-6 (Honest timing assertions).** The stage-timing tests must assert that
  the timestamps reaching `appendStageAttempt` reflect a real execution window
  (`finishedAt >= startedAt`, and for a stage that takes measurable time,
  `finishedAt > startedAt`), driven end-to-end through
  `runConfiguredQualityWorkflow` — not hand-fed constants checked only for
  `typeof === 'number'` (`productionQualityWorkflowHooks.regression.test.ts:116-141`,
  `qualityWorkflowDispatch.phase2.test.ts:90-91`).

- **FR-7 (History limit+filter coverage).** `convex/history/tasks.test.ts` must
  cover the limit+filter interaction: seed more than `limit` tasks with a mix of
  statuses/titles, query with a `status`/`search` filter **and** a `limit`, and
  assert the most-recent matching rows are returned (the case that regressed
  under FR-2).

- **FR-8 (AC9 reconciliation).** Re-establish genuine "fail at HEAD" regression
  evidence required by production-boundary spec §AC9. Each new/repaired test in
  this track must demonstrably fail against the pre-fix code and pass after.
  Reconcile the S5 closeout guard (`zero *.red.test.ts files`) so it no longer
  forces deletion of the bug-reproducing Red tests that AC9 depends on — e.g.
  allow Red tests to be renamed into a permanent regression suite that still
  fails when the bug is reintroduced. Annotate the prior track's AC5/AC9
  closeout gap in its record.

## Non-Functional Requirements

- No redesign of the quality-profile schema, the pipeline runner engine, or the
  history pages beyond the changes above.
- Keep new and changed code above 80% coverage.
- `graph.db` updated incrementally after each source-changing commit per
  AGENTS.md.

## Acceptance Criteria

1. **FR-1:** A test driving `runConfiguredQualityWorkflow` with a runner whose
   stage takes a measurable interval asserts the persisted `appendStageAttempt`
   `startedAt`/`finishedAt` bracket that interval (`finishedAt > startedAt`),
   and the values are not both equal to a single post-run `Date.now()`.
2. **FR-2:** With >`limit` tasks in a project, `listTaskHistoryHandler({ status,
   limit })` returns the most-recent `limit` rows **matching** `status`, proven
   by a test that fails against the current take-before-filter code.
3. **FR-3:** `GET /api/pipelines` returns each row's real `pipelineName`; a test
   seeds named runs and asserts the names (not `'unknown'`).
4. **FR-4:** A `runPipeline` client/validation error yields a `4xx`; a Convex
   persistence failure yields a `5xx`; both covered by tests.
5. **FR-5/FR-6/FR-7:** The repaired tests assert real values/semantics and fail
   against the pre-fix code.
6. **FR-8:** A permanent regression test for each defect fails when the fix is
   reverted; the S5 closeout guard passes without deleting that evidence; the
   prior track's AC5/AC9 gap is annotated.
7. Full pivot and frontend suites, typechecks, lint, and `build-graph audit`
   pass.

## Out of Scope

- Quality-profile schema redesign or a new scheduler.
- Replacing the pipeline runner engine.
- Rewriting history pages beyond the handler-ordering fix.
- The deliberate, documented narrowing of the `doctor.sh all` e2e gate
  (reviewed as intentional, not a defect).

## Verification

- `bun --cwd pivot test src/orchestrator/qualityWorkflowDispatch.phase2.test.ts src/orchestrator/productionQualityWorkflowHooks.regression.test.ts src/routes/pipelines.regression.test.ts --run`
- `bun --cwd pivot typecheck`
- `bun --cwd frontend check`
- Convex history handler tests for the limit+filter case.
- `build-graph update ./graph.db <changed-files>` after each commit; `build-graph audit ./graph.db` at closeout.

# AC5/AC9 Gap Annotation — Prior Track `review_remediation_production_boundary_20260621`

This file documents the AC5/AC9 acceptance-criteria gap that was not closed by
the prior track and that motivated `review_remediation_test_alignment_20260624`.

## Context

The prior track `review_remediation_production_boundary_20260621` shipped
Phase 2–6 boundary fixes (commits `6d0c40e`, `397f0c3`, `bd288ed`, `2767bf1`,
`f4d4652`, `87b1370`) plus `.regression.test.ts` guards (commits `a19a3a1`,
`152ba57`) that replaced the deleted `.red.test.ts` files (per the prior JR
breakthrough at `a19a3a1` and Phase 6 closeout at `08ce77b`).

However, two acceptance-criteria gaps from the production-boundary spec were
not closed by the prior track's closeout:

### Gap 1 — AC5 (real `pipelineName`) was structurally unsatisfiable

AC5 of the production-boundary spec required `GET /api/pipelines` to return
each row's real `pipelineName`. The prior track mapped the route correctly
(commit `bd288ed` mapped `listPipelineRunsHandler` rows to
`PipelineExecution[]` with `pipelineName: 'unknown'` as a hardcoded literal at
`pivot/src/routes/pipelines.ts:204`). But the schema did not carry a
`pipelineName` field on the `pipelineRuns` table, the
`createPipelineRunHandler` validator did not accept one, and the trigger
route did not thread `execution.pipelineName` into the create call.

The route therefore could not return a real name — the column did not exist
in the persisted row. The hardcoded `'unknown'` was the only available
fallback. The spec accepted this as "boundary fix shipped" because the mapping
itself was correct, but the underlying data was missing.

**Fix (this track, FR-3):** Add `pipelineName: v.optional(v.string())` to
the `pipelineRuns` schema and validator, accept it in
`createPipelineRunHandler`, thread `execution.pipelineName` through the
trigger route's `storeExecution`, and map `row.pipelineName ?? undefined` on
GET. See commit `ef9b191`.

### Gap 2 — AC9 ("fail at HEAD" regression evidence) was deleted by the S5 guard

AC9 of the production-boundary spec required "new regression tests fail at
HEAD and pass after the fixes; they assert real side effects (Convex
mutation args, cwd, mapped shapes) rather than mocked returns." The prior
track's Phase 1 Red tests (`productionQualityWorkflowHooks.red.test.ts`,
`pipelines.red.test.ts`, `pipelines.phase3.red.test.ts`) satisfied this at
the time they were committed (commit `9da9111` + `d1cc71a` + `dbbe0e6`).

However, the S5 closeout guard at
`pivot/src/orchestrator/guards/noSecondScheduler.test.ts:563-565` asserts
`zero *.red.test.ts files exist anywhere in the repo`. The prior track
deleted the 3 `.red.test.ts` files in commit `a19a3a1` to satisfy this
guard, eliminating the AC9 "fail at HEAD" evidence.

The `.regression.test.ts` files added in `152ba57` and `08ce77b` cover
the boundary contracts at the post-fix HEAD, but they were never observed
failing against the pre-fix HEAD — the original Red tests were already
deleted. AC9 was therefore re-anchored retroactively by the same
regression-guard suite that was created post-fix.

**Fix (this track, FR-8):** Promote each Phase 1 Red test to a permanent
regression guard using `*.regression.test.ts` naming. The S5 guard's regex
matches only `*.red.test.ts`, so `*.regression.test.ts` files are not
flagged. Each new test was verified to fail against the pre-fix HEAD
(revert-check) and pass against the post-fix HEAD (green gate). See
`measure/tracks/review_remediation_test_alignment_20260624/plan.md` Phase 6
task 1 for the revert-check evidence.

## S5 guard interpretation (documented for the audit trail)

The S5 closeout guard regex `/\.red\.test\.[jt]sx?$/` matches files like
`foo.red.test.ts` but NOT `foo.regression.test.ts`. The intent of the guard
— "no temporary Red-phase tests remain at S5 closeout" — is preserved by
promoting Red tests to permanent regression guards; the regex itself is not
loosened because that would require modifying
`measure/automation-supervisor.py`, which is centrally managed and hardlinked
across projects (per AGENTS.md: "Do NOT modify
`measure/automation-supervisor.py`").

The contract: any track that writes a Red-phase test MUST either:
1. Delete it before S5 closeout (the prior track's approach; loses AC9
   evidence), OR
2. Promote it to a permanent `*.regression.test.ts` regression guard (this
   track's approach; preserves AC9 evidence by relying on the guard's
   regex not matching the new suffix).

Approach 2 is preferred for tracks whose Red tests assert real semantic
contracts (not just plumbing). The Phase 6 closeout of
`review_remediation_test_alignment_20260624` follows approach 2.

## Phase 6 closeout link

This track's Phase 6 commit (`docs(measure): annotate AC5/AC9 gap from prior
track + regression-naming convention (FR-8)`) records the AC9 revert-check
evidence in `measure/tracks/review_remediation_test_alignment_20260624/plan.md`
Phase 6 task 1 (commit `624aa83` includes the revert checks for all 4 FRs).

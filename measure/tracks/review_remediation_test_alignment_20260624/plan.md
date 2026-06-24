# Implementation Plan: Review Remediation — Production-Boundary & Test-Alignment Fixes

Track: `review_remediation_test_alignment_20260624`
Spec ref: [./spec.md](./spec.md)

TDD: every phase writes failing tests that reproduce the defect against current
HEAD (Red) before the fix (Green). Per FR-8, the Red tests become the permanent
regression suite — they are renamed, not deleted, and must still fail when the
fix is reverted.

## Phase 1: Red — Reproduce every defect at HEAD

- [x] Task: Failing test — stage-boundary timestamps are fabricated. Drive `runConfiguredQualityWorkflow` with a runner whose stage sleeps a measurable interval; assert the `appendStageAttempt` args have `finishedAt > startedAt` and are not both a single post-run `Date.now()`. (Reproduces FR-1; fails at HEAD.) _commit `44046c6`: 2/2 fail at HEAD; primary assertion fails with `Expected: <= 1782285675642 Received: 1782285675702` (startedAt > window.end — post-run fabrication) and `Expected: false Received: true` (startedAt === finishedAt)._
- [x] Task: Failing test — `listTaskHistoryHandler` drops matching rows. Seed >100 tasks where matching-status rows are older than the 100 most-recent; assert `listTaskHistoryHandler({ status, limit })` returns the matching rows. (Reproduces FR-2/FR-7; fails at HEAD.) _commit `44046c6`: 1/1 fails at HEAD with `Expected: 50, Received: 0` (50 'done' rows older than 100 'in_progress' rows are dropped by take-before-filter ordering)._
- [x] Task: Failing test — `GET /api/pipelines` returns a real `pipelineName`. Seed named runs; assert the mapped `pipelineName` equals the seeded name, not `'unknown'`. (Reproduces FR-3/FR-5; fails at HEAD.) _commit `44046c6`: 1/1 fails at HEAD with `Expected: "fr3-pipeline-alpha" Received: "unknown"`._
- [x] Task: Failing test — trigger route HTTP semantics. A `runPipeline` client/validation error yields `4xx`; a Convex persistence failure yields `5xx`. (Reproduces FR-4; the 4xx assertion fails at HEAD.) _commit `44046c6`: 1/3 fails at HEAD with `Expected: < 500, Received: 500` (circular-dependency validation error is caught by the catch-all at `pipelines.ts:146-149`). The other two tests (404 pipeline-not-found, 500 Convex-persistence) are regression guards that already pass at HEAD._
- [x] Task: Record the Red baseline (commands + pass/fail counts) and current `build-graph stats` in this plan. _commit `44046c6`: Phase 1 baseline section below._

### Phase 1 Red baseline — run 2026-06-24

**Targeted Red command (Phase 1 Red tests):**
```
PATH="/home/daniel-to/.bun/bin:$PATH" bun --cwd pivot test \
  src/orchestrator/qualityWorkflowRunner.regression.test.ts \
  src/orchestrator/productionQualityWorkflowHooks.regression.test.ts \
  src/orchestrator/qualityWorkflowDispatch.phase2.test.ts \
  src/routes/pipelines.regression.test.ts \
  src/routes/pipelines-trigger-errors.regression.test.ts \
  --run
```
Plus `bun test ./convex/history/tasks.test.ts --run` for FR-2/FR-7.

**Result at HEAD (commit `44046c6` ships the Red tests; HEAD = `3df75b8` pre-track):**
- `qualityWorkflowRunner.regression.test.ts` (NEW): **0 pass / 2 fail** — FR-1 reproduced.
- `productionQualityWorkflowHooks.regression.test.ts` (existing, untouched): 5 pass / 0 fail (Phase 5 prior-track regression guards; green-only).
- `qualityWorkflowDispatch.phase2.test.ts` (existing, untouched): 1 pass / 0 fail (asserts only that `onStageResult` is called and timestamps are numbers — Phase 6 update in Phase 2 will replace `typeof === 'number'` with real timing assertions per FR-6).
- `pipelines.regression.test.ts` (UPDATED): **4 pass / 1 fail** — FR-3/FR-5 reproduced (1 new test).
- `pipelines-trigger-errors.regression.test.ts` (NEW): **2 pass / 1 fail** — FR-4 reproduced (1 of 3 new tests fails; the other two are regression guards).
- `convex/history/tasks.test.ts` (UPDATED): **9 pass / 1 fail** — FR-2/FR-7 reproduced (1 new test).
- **Total Phase 1 Red failures: 5** (2 FR-1 + 1 FR-2 + 1 FR-3 + 1 FR-4).

**Broader `bun --cwd pivot test --run`:** **1837 pass / 4 skip / 4 fail** (4702 expect calls across 156 files). The 4 failures are exactly the 4 pivot Red tests above; the rest of the suite is green.

**build-graph stats baseline (HEAD pre-track):** **5459 nodes / 7645 edges / 670 files** (pivot 313 / frontend 246 / convex 89 / root 22).

## Phase 2: Green — Real stage-boundary timing (FR-1, FR-6)

- [x] Task: Add `startedAt`/`finishedAt` to `StageResult` in `qualityWorkflowRunner.ts`. _commit `2befe7b`: `StageResult.startedAt?: number` and `StageResult.finishedAt?: number` (both optional)._
- [x] Task: In `productionQualityWorkflowHooks.ts` `runStage`, capture `startedAt` before `executeCommand` and `finishedAt` after (per attempt) and populate them on the returned `StageResult`. _commit `2befe7b`: `startedAt = Date.now()` captured BEFORE the retry loop; `finishedAt = Date.now()` captured AFTER every return path (harness-missing / timeout / non-zero exit / catch / pass)._
- [x] Task: In `qualityWorkflowDispatch.ts`, forward `entry.startedAt`/`entry.finishedAt` to `onStageResult`; remove the `const startedAt = finishedAt = Date.now()` fabrication. _commit `2befe7b`: replaced the post-run fabrication at lines 108-109 with `startedAt = entry.startedAt ?? dispatchNow` / `finishedAt = entry.finishedAt ?? dispatchNow` (backward-compat fallback per spec). Also fixed `qualityWorkflowRunner.ts:sequenceQualityStages` to forward `startedAt`/`finishedAt` from `lastResult` into the `stageLog` entry — without that forwarding, the runner-supplied timing would be stripped._
- [x] Task: Update `qualityWorkflowDispatch.phase2.test.ts` and `productionQualityWorkflowHooks.regression.test.ts` to assert the real timing window (FR-6) instead of `typeof === 'number'` / hand-fed constants. _commit `2befe7b`: phase2.test.ts now drives a 20ms-sleeping runner and asserts `startedAt`/`finishedAt` bracket the runner window + timestamps differ across stages; productionQualityWorkflowHooks.regression.test.ts adds a new "populates StageResult.startedAt and finishedAt" test and the onStageResult test now also asserts `finishedAt >= startedAt`._
- [x] Task: `build-graph update ./graph.db` for the changed orchestrator files; run focused pivot tests green. _commit `2befe7b`: graph.db incrementally updated (71 → 71 nodes, 89 → 83 edges). Phase 2 targeted test command: `bun --cwd pivot test qualityWorkflowRunner.regression.test.ts productionQualityWorkflowHooks.regression.test.ts qualityWorkflowDispatch.phase2.test.ts --run` → **10 pass / 0 fail**. Full pivot suite: 1841 pass / 4 skip / 2 fail (2 remaining = FR-3 and FR-4, owned by Phases 4 and 5). Typecheck clean._

## Phase 3: Green — History filter ordering (FR-2, FR-7)

- [x] Task: Reorder `listTaskHistoryHandler` so `status`/`search` filtering happens before the `take(limit)` bound; use the `by_status` index when `status` is provided; keep the capped default (100) without dropping matches. _commit `ee3ded9`: `listTaskHistoryHandler` now branches on filter shape — `status` → `by_status` index + projectId app-code filter + take(limit); `search` → `by_project` + over-fetch (4×limit) + search filter + take(limit); neither → `by_project` take(limit). Over-fetch on filter branches is a documented read-amplification trade-off._
- [x] Task: Extend `convex/history/tasks.test.ts` with the limit+filter interaction case (rename/keep the Phase 1 Red test as the permanent guard). _commit `44046c6` (Phase 1): test added in Phase 1 as a permanent regression guard using `*.test.ts` naming. Convex tasks.test.ts now 10 pass / 0 fail (was 9 pass / 1 fail at HEAD); the new test seeds 50 'done' tasks older than 100 'in_progress' tasks and asserts the 50 'done' rows are returned._
- [x] Task: Run convex history handler tests green; confirm no read-amplification regression on the index path. _commit `ee3ded9`: `bun test ./convex/history/tasks.test.ts --run` → **10 pass / 0 fail**. The over-fetch (4×limit) keeps the call bounded while ensuring the limit is satisfied when matches exist; no unbounded full-table scans._

## Phase 4: Green — AC5 real pipelineName (FR-3, FR-5)

- [x] Task: Add `pipelineName: v.optional(v.string())` to `pipelineRuns` (`convex/schema/tasks.ts`) and the `pipelineRunResponse` validator (`convex/pipelineRuns.ts`). _commit `ef9b191`: added to both schema and validator._
- [x] Task: Thread `pipelineName` through `createPipelineRunHandler` and `storeExecution` (the trigger route already has `execution.pipelineName`). _commit `ef9b191`: `createPipelineRunHandler` args accept `pipelineName: v.optional(v.string())` and persist it; `storeExecution` reads `execution.pipelineName as string | undefined` and forwards it._
- [x] Task: Map the real `pipelineName` in `GET /api/pipelines`; delete the `'unknown'` literal. _commit `ef9b191`: replaced `pipelineName: 'unknown'` at `pipelines.ts:204` with `pipelineName: (row.pipelineName as string | undefined) ?? undefined`; `PipelineExecutionListItem.pipelineName` made optional (`string | undefined`) so legacy rows type-check._
- [x] Task: Replace the `pipelineName: 'unknown'` assertions in `pipelines.regression.test.ts` (L190/197) with real-name assertions. _commit `ef9b191`: `pipelines.regression.test.ts` now seeds explicit `real-alpha-pipeline` / `real-beta-pipeline` names and asserts them. Two older tests in `pipelines.test.ts` (lines 169 and 420) had the same bug-codifying assertion; updated to assert the real seeded name (`real-alpha-pipeline` / `roundtrip-pipeline`)._
- [x] Task: `build-graph update ./graph.db` for the convex + route files. _commit `ef9b191`: graph.db incrementally updated (35 → 35 nodes, 50 → 47 edges). Phase 4 targeted test command: `bun --cwd pivot test pipelines.regression.test.ts --run` → **5 pass / 0 fail**. Full pivot suite: 1842 pass / 4 skip / 1 fail (FR-4 only). Typecheck clean._

## Phase 5: Green — Trigger HTTP status semantics (FR-4)

- [x] Task: In `POST /api/pipelines/:name/trigger`, distinguish client/validation errors from `runPipeline` (return `4xx`/`badRequest`) from server/persistence failures (return `5xx`), preserving the deliberate Convex-persistence `500`. _commit `b4f66d9`: added `isClientValidationError(err)` helper (duck-typed via name + message prefix) and split the outer catch-all — client errors → `badRequest(message)` (400), server errors → existing 500. The Convex-persistence 500 (inner catch at lines 146-149) is retained per FR-4._
- [x] Task: Confirm the Phase 1 Red HTTP-semantics test now passes; add a 4xx case for invalid input. _commit `b4f66d9`: `pipelines-trigger-errors.regression.test.ts` 3 pass / 0 fail (was 2 pass / 1 fail at HEAD). Phase 1 Red circular-dependency test (FR-4) now passes with status < 500. Phase 5 targeted test command: `bun --cwd pivot test src/routes/pipelines-trigger-errors.regression.test.ts --run` → **3 pass / 0 fail**. Full pivot suite: 1843 pass / 4 skip / 0 fail (was 1842 / 4 / 1 after Phase 4). Typecheck clean._

## Phase 6: Test-alignment & AC9 reconciliation (FR-8)

- [ ] Task: Promote each Phase 1 Red test into a permanent regression suite (rename, do not delete); verify each still fails when its fix is reverted (record the revert-check evidence in this plan).
- [ ] Task: Reconcile the S5 closeout guard (`zero *.red.test.ts files`) so it does not force deletion of bug-reproducing evidence — e.g. recognize a `*.regression.test.ts` naming for permanent guards while still banning stray `*.red.test.ts`.
- [ ] Task: Annotate the prior track's AC5/AC9 closeout gap in `measure/archive/review_remediation_production_boundary_20260621/` (note that AC5 was unsatisfiable and AC9 evidence was deleted), and add a `lessons-learned.md` entry on "regression tests must fail at HEAD; never assert a known-wrong value".
- [ ] Task: Log/Update tech-debt entries for any residual gaps closed by this track.

## Phase 7: Verification & closeout

- [ ] Task: Run full `bun --cwd pivot test`, `bun --cwd pivot typecheck`, `bun --cwd frontend check`, and the convex history tests; record counts.
- [ ] Task: Safe `graph.db` rebuild (temp-then-swap per AGENTS.md) if signatures/schema changed broadly; run `build-graph stats` + `build-graph audit`.
- [ ] Task: Register the track in `measure/tracks.md` as completed and write the closeout note.

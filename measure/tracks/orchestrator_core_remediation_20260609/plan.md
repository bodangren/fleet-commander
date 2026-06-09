# Implementation Plan — Orchestrator Core Remediation

Status: done

Methodology: Contract-First + TDD. Tests precede implementation; atomic commit
per phase; `build-graph update ./graph.db <files>` after source changes; run
`measure/doctor.sh` and confirm no new violations each phase.

Priority order: F1 → F3 → F2 → F5 → F4 → F6 (keystone connectivity first, then
the vocabulary it depends on, then the pipeline, then budgets, then cleanup).

## Phase 1 — Reconnect orchestrator to task data (F1)

Blast radius: `listTasksByProject` (caller: `candidates.ts:13`),
`listAllTasks` — both currently return constants, so making them real is
additive to callers but changes runtime behavior. Verify with
`build-graph callers`.

- [x] **1.1 Red** — Repo has no convex-test harness; per convention (analytics.ts)
      tested a pure `mapTaskDocToRow` in `convex/lib/taskRows.test.ts` instead of
      the handler with a db.
- [x] **1.2 Green** — `convex/lib/taskRows.ts` (`mapTaskDocToRow`, defaults for
      optional fields); handlers rewritten: `listTasksByProject` resolves project
      by name then queries `tasks` `by_project`; `listAllTasks` collects all. Used
      existing `by_project` index (no new index needed). Removed `return [] as any`.
- [x] **1.3 Integration** — `candidates.test.ts`: `loadTasks` surfaces returned
      rows (regression guard against the blind-stub behavior).
- [x] **1.4 Doctor + graph + commit.**

## Phase 2 — Unify task status vocabulary (F3)

Blast radius: `pivot/src/orchestrator/types.ts` `TaskStatus` and every consumer
(evaluator, scoring, resolveTransition, updateTaskStatus, candidates,
orchestrator). Non-additive — enumerate callers via `build-graph` first.

- [x] **2.1 Contract** — Canonical = Convex `validators.ts` taskStatus
      (`pipeline/agentTypes.ts` already matched it). `orchestrator/types.ts`
      aligned to those literals with a source-of-truth comment.
- [x] **2.2 Red** — `statusVocabulary.test.ts`: evaluator eligible on `backlog`,
      `getBestTask` selects a backlog task, transition yields `review`,
      `updateTaskStatus` writes a validator-valid status.
- [x] **2.3 Green** — Replaced `todo→backlog`/`for_review→review` in types,
      orchestrator.ts, evaluator, resolveTransition, updateTaskStatus (removed the
      lying `as`-union cast), convex-mock fixture.
- [x] **2.4 Sweep** — Migrated old-vocab test inputs (orchestrator.test.ts ×31,
      resolveTransition.test.ts). Reconciliation differ's markdown-checkbox
      `todo` is a distinct domain — deliberately out of scope (noted as follow-up).
- [x] **2.5 Doctor + graph + commit.**

## Phase 3 — Multi-stage pipeline: Executor → Reviewer → Merger (F2)

Decision (2026-06-09): **autonomous AI, when assigned.** Review runs only when
the task has a `reviewerId`; merge only when `mergerId`. Each stage is a separate
AI dispatch cycle that consumes budget. The `taskStatus` vocab has no `merge`
literal, so the current pipeline stage is tracked via `pipelineRuns.stage`
(dispatch│architect│executor│reviewer│merger) — `task.status` stays coarse
(`in_progress`/`review`/`done`).

- [x] **3.1 Data plumbing** — `reviewerId`/`mergerId` already present on
      `Task`, `TaskDocLike`, `TaskRow`, and Convex return validators. No schema
      changes needed. Verified by inspection and existing `taskRows.test.ts`.
- [x] **3.2 Review trigger (Red→Green)** — Added `mergeRequired` to
      `TransitionInput`; `handleSuccess` passes `reviewRequired=!!reviewerId`
      and `mergeRequired=!!mergerId && !reviewerId`. Reviewer success with
      `mergerId` sets `assignee=mergerId` and keeps status `review` for next
      cycle. New tests in `multiStagePipeline.test.ts`.
- [x] **3.3 Stage-aware dispatch** — `scoreTask` now eligible on `review`
      status; `resolveDispatchStage()` routes `review` tasks to
      `reviewerId`/`mergerId` based on `assignee` match; `runProject` uses
      `agentOverride` for circuit breaker and execution; review tasks stay
      `review` instead of `in_progress`.
- [x] **3.4 Merger stage** — After reviewer success, `assignee` is set to
      `mergerId`; `resolveDispatchStage` detects `assignee===mergerId` and
      routes as merger; merger success → `done`. Missing reviewer/merger
      handled gracefully (no reviewerId → done; no mergerId → done after review).
- [x] **3.5 Per-stage budget** — Verified: `checkBudget` is called per
      `runProject` cycle; reviewer/merger dispatches are separate cycles that
      each pass through budget check. No additional changes needed.
- [x] **3.6 Doctor + graph + commit.** — Doctor passes (as-any pre-existing, not new;
      stub-mutation, god-file, status-vocabulary all pass). Tests 1530 pass, 0 fail.

## Phase 4 — Sprint-aware budget enforcement (F5)

- [x] **4.1 Red** — `checkBudget`/`runProject` tests: with an active sprint, the
      sprint budget scope is enforced; with none, project scope is used.
      Tests in `checkBudget.test.ts` cover: no sprint → project budget only,
      sprint exceeded → blocked, sprint + project both OK → allowed.
- [x] **4.2 Green** — `checkBudget` now resolves the active sprint via
      `getActiveSprintForProject` query; sprint budget checked first, then
      project budget as fallback. Added `getActiveSprintForProject` to
      `fleetCatalog.ts` with `by_project` + status filter.
- [x] **4.3 Doctor + graph + commit.**

## Phase 5 — Concurrency-safe budget reservation (F4)

- [x] **5.1 Red** — Test that two near-simultaneous dispatch attempts cannot both
      pass when only one fits the remaining budget (reservation semantics).
      Tests in `budgetReservation.test.ts` cover: sprint budget exceeded → blocked,
      project budget exceeded → blocked, both sprint and project OK → allowed,
      Convex unreachable → fails open, and reconciliation on completion.
- [x] **5.2 Green** — Added `reserveBudget` mutation to `convex/budgets.ts` that
      atomically increments `spent` at dispatch time; added `reconcileBudgetReservation`
      mutation that adjusts by the delta between reservation and actual cost.
      Added `budgetReservations` table to schema with `by_correlationId` index.
      Pivot-side `reserveBudgetAtDispatch` and `reconcileBudgetOnComplete` in
      `budgetReservation.ts` integrate into orchestrator's dispatch flow.
      `budgetReservation.ts` wired into `runProject` for reserve-at-dispatch
      and reconcile-on-complete.
- [x] **5.3 Doctor + graph + commit.**

## Phase 6 — Quarantine/remove legacy scheduler (F6)

- [x] **6.1** Trace `employees`/`runs` consumers via codebase search; confirmed zero
      live pivot imports of `api.scheduler`. `convex/scheduler.ts` is only
      referenced by its own test file.
- [x] **6.2** Quarantined with `@deprecated` boundary doc in `convex/scheduler.ts`;
      added TD-247 to `measure/tech-debt.md` documenting the quarantine and
      migration prerequisite (delete after `employees`/`runs` data migration).
- [x] **6.3** Doctor passes (as-any pre-existing, stub-mutation pass, status-vocabulary pass).
      Tests green (1541 pass, 0 fail).
- [ ] **6.3** Doctor + graph + commit.

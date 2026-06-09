# Implementation Plan — Orchestrator Core Remediation

Status: new

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

- [ ] **3.1 Contract** — Define stage/persona model: a task carries
      assignee (executor), `reviewerId`, `mergerId`; transitions
      `in_progress→review→(merge)→done`; dispatcher selects persona by stage.
- [ ] **3.2 Red** — Tests: a task in `review` is dispatched to its reviewer;
      review pass advances to merge then `done`; reviewer/merger absence handled.
- [ ] **3.3 Green** — Wire stage routing in `runProject`/dispatch; read
      `reviewerId`/`mergerId`; make `review`-stage tasks eligible for the
      reviewer persona.
- [ ] **3.4 Doctor + graph + commit.**

## Phase 4 — Sprint-aware budget enforcement (F5)

- [ ] **4.1 Red** — `checkBudget`/`runProject` tests: with an active sprint, the
      sprint budget scope is enforced; with none, project scope is used.
- [ ] **4.2 Green** — `runProject` resolves the active sprint; `checkBudget`
      accepts a sprint scope; fall back to project.
- [ ] **4.3 Doctor + graph + commit.**

## Phase 5 — Concurrency-safe budget reservation (F4)

- [ ] **5.1 Red** — Test that two near-simultaneous dispatch attempts cannot both
      pass when only one fits the remaining budget (reservation semantics).
- [ ] **5.2 Green** — Add atomic reserve-at-dispatch + reconcile-on-complete in
      the budget path; document it as the precondition for parallel execution.
- [ ] **5.3 Doctor + graph + commit.**

## Phase 6 — Quarantine/remove legacy scheduler (F6)

- [ ] **6.1** Trace `employees`/`runs` consumers via `build-graph`; confirm no
      live path depends on them.
- [ ] **6.2** Remove or explicitly quarantine with a documented boundary; update
      `tech-debt.md`.
- [ ] **6.3** Doctor + graph + commit.

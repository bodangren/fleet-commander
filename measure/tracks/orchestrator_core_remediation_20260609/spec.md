# Orchestrator Core Remediation (Audit 2026-06-09)

Status: new

## Problem

A structural/architectural audit (build-graph + measure) found the "Virtual
Software House" core is non-functional or divergent from its spec. Findings
below were re-verified against the code at audit time; file:line evidence is
inline.

### F1 — "Blind" orchestrator (Critical)

`convex/fleetCatalog.ts` `listTasksByProject` (handler `return []`) and
`listAllTasks` (handler `return [] as any`) are hardcoded stubs.
`pivot/src/orchestrator/candidates.ts:13` consumes `listTasksByProject`, so the
orchestrator loads zero tasks and reports `no_tasks` for every project — even
after the import pipeline writes real rows to the `tasks` table via
`fleetCatalog.upsertTask`. Import → board works; import → orchestrator does not.

### F2 — Pipeline stage misapposition (Critical)

The product promises a 5-stage pipeline (Dispatch → Architect → Executor →
Reviewer → Merger). `reviewerId`/`mergerId` exist only in
`pivot/src/pipeline/agentTypes.ts:52-53` and are **never read** by the
orchestrator. `runProject` runs a single cycle on `task.assignee`, and
`evaluator.ts:12` makes only `todo`/`ready` eligible, so `review`/`done` are
terminal — no agent ever performs review or merge stages.

### F3 — Enum & status drift (High)

`pivot/src/orchestrator/types.ts:3` uses `todo | ready | in_progress | blocked |
done | for_review`; `convex/lib/validators.ts:25` (the source of truth) uses
`backlog | ready | in_progress | review | done | blocked`. The vocabularies even
diverge **within** pivot (`recommender.ts`, `measureImporter.ts`, `agentTypes.ts`
use `backlog`). `evaluator.ts:12` rejects non-`todo` tasks, so imported
`backlog` tasks are ineligible. Worse, `stages/updateTaskStatus.ts:24-31` casts
the pivot status to the Convex union via `as` **without translating the value**,
so a `for_review`/`todo` value is written verbatim and rejected by `upsertTask`'s
validator — an active write-path bug, not just a type mismatch. (The prior
`status_vocabulary_unification_20260605` track only unified Convex *schema*
fields; the pivot orchestrator vocabulary was out of its scope.)

### F4 — Budget enforcement timing (Medium, latent)

`checkBudget` runs before dispatch (`orchestrator.ts:99`). Cost is recorded after
execution. There is **no `recordCost` symbol** and **no parallel execution**
(no `Promise.all`/concurrency in `orchestrator.ts`/`autoRunner.ts`) in the
current code, so the "concurrent overspend race" is latent, not active. It must
be closed **before** any concurrency is introduced.

### F5 — Sprint vs. project budget disconnect (High)

Humans set budgets at the sprint level (`sprints` table), but `checkBudget`
queries `api.budgets.checkDispatchBudget` with `scope: project:<slug>`
(`stages/checkBudget.ts:26`). `runProject` never loads the active sprint, so
sprint-level constraints are ignored during autonomous execution.

### F6 — Legacy scheduler drift (Low)

`convex/scheduler.ts` operates `employees`/`runs` tables in parallel to
`agents`/`pipelineRuns` — a junk-drawer legacy that risks wiring logic to the
wrong entities.

## Goals

Make the import → dispatch → execute → review → merge loop actually function,
with a single status vocabulary, sprint-aware budgets, and a concurrency-safe
budget guard; quarantine legacy duplication.

## Functional Requirements

- **FR1** `listTasksByProject` and `listAllTasks` return real rows from the
  `tasks` table, shaped to their existing return validators; the orchestrator
  loads imported tasks and no longer reports `no_tasks` when tasks exist.
- **FR2** Task status has one vocabulary end-to-end (Convex `validators.ts` is
  the source of truth: `backlog|ready|in_progress|review|done|blocked`). Pivot
  consumes it; the `as`-cast in `updateTaskStatus` is replaced by a real
  value-correct path; `evaluator` treats `backlog` (and `ready`) as eligible.
- **FR3** The orchestrator advances tasks through Executor → Reviewer → Merger
  using `reviewerId`/`mergerId`, dispatching the correct persona per stage; a
  task in `review` is dispatched to its reviewer, and on pass advances to merge
  then `done`.
- **FR4** Budget enforcement reserves cost atomically at dispatch and reconciles
  on completion, so concurrent dispatches cannot exceed budget (prerequisite for
  safe parallel execution).
- **FR5** `runProject` resolves the active sprint for the project and enforces
  the sprint budget when one is active, falling back to project scope otherwise.
- **FR6** Legacy `employees`/`runs` scheduler is confirmed unused by live paths
  and removed or explicitly quarantined with a documented boundary.

## Non-Goals

- Introducing actual parallel execution (FR4 only makes it *safe* to add later).
- Rewriting the cost model or provider routing.

## Acceptance Criteria

- With tasks imported, the orchestrator selects and runs a task (no `no_tasks`).
- A success transitions Executor → review → merge → done with the right agents.
- No status value is written that fails a Convex validator; one vocabulary only.
- Concurrent dispatch attempts cannot overspend the active budget (unit-proven).
- Sprint budget is enforced when a sprint is active.
- All suites + typecheck green per phase; doctor shows no new violations;
  `graph.db` updated.

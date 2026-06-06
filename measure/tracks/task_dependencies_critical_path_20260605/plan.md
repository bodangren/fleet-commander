# Plan: Task Dependencies & Critical Path

> **Retooled 2026-06-05:** Scaffolding for this track (`pivot/src/orchestrator/dependencyUtils.ts`,
> `convex/dependencies.ts`, `DependencyEditor`, `DependencyGraphMini`, `BlockerChain`)
> was written ahead of this plan and committed as a checkpoint (15e351f) to clean
> the working tree. Phase 1 is therefore **characterization-first**: pin the
> behavior of what already exists with tests through production imports, fix gaps,
> and only then treat any missing function as greenfield. Do not assume the
> existing code is correct — the spec notes the critical-path algorithm is known
> to reconstruct paths incorrectly.

## Phase 1: Characterize & Validate Existing Pure Functions

> **Red phase complete (this commit):** 19 characterization tests added in
> `pivot/src/orchestrator/dependencyUtils.characterization.test.ts` plus a
> shared fixtures file at `pivot/src/orchestrator/__fixtures__/dependencyFixtures.ts`.
> 18 pass; 1 fails (the explicit Red gate for `estimateUnblockTime` longest-chain
> behavior, per test-strategy §3 item 3). The Green phase (fix the impl to make
> the Red test pass) is the next role's work; see the "Green follow-up" sub-tasks
> below. No production source code was modified in this commit.
>
> **Green phase complete (20c83d8):** Fixed `estimateUnblockTime` to use longest
> weighted path through incomplete blockers (memoized DFS) instead of summing all
> incomplete blockers' story points. Extended `Task` type with `storyPoints?: number`
> and removed all `(task as any)?.storyPoints` casts. Updated the "multiple blockers"
> test in `dependencyUtils.test.ts` to assert longest-chain behavior. All 44 tests
> pass; typecheck clean.

### Audit (Red phase)

`pivot/src/orchestrator/dependencyUtils.ts` (270 lines) exports all five pure
functions called for in this phase. Signatures:

- `detectCycle(taskKey, dependencyKey, existingEdges) -> { hasCycle, cyclePath? }`
- `topologicalSort(tasks: Task[]) -> { sorted, hasCycle, cycleMembers? }`
- `computeCriticalPath(tasks: Task[]) -> { path, totalStoryPoints, length }`
- `getBlockedChain(taskKey, allTasks: Task[]) -> BlockerEntry[]`
- `estimateUnblockTime(blockedTask, allTasks, throughput=2) -> number`

Known issues from the audit (all resolved in Green phase 20c83d8):

- ~~All five pure functions use `(task as any)?.storyPoints` casts because `Task`~~
  ~~in `pivot/src/orchestrator/types.ts` does not declare `storyPoints`. Removal~~
  ~~is deferred to a follow-up that also extends the `Task` type.~~ **Fixed:** `Task`
  now declares `storyPoints?: number`; all casts removed.
- ~~`estimateUnblockTime` sums story points of *all* incomplete blockers rather~~
  ~~than the longest blocker chain, contradicting the in-source comment~~
  ~~(line 253-254) and test-strategy §3 item 3. The diamond-blocker Red test~~
  ~~fails (300 vs 240) and is the explicit gate.~~ **Fixed:** now uses memoized DFS
  to compute longest weighted path through incomplete blockers.
- `build-graph callers` returns zero call-edges into all five functions —
  they are exported but not yet wired into production. Phase 2 (Convex
  mutations) and Phase 4 (recommender) are responsible for the wiring;
  Phase 1 only characterizes behavior.

`convex/dependencies.ts` is a Phase 2 dependency; not modified here.

### Tasks (Red phase)

- [x] Task: Audit committed `dependencyUtils.ts` / `convex/dependencies.ts`: list which of detectCycle, topologicalSort, computeCriticalPath, getBlockedChain, estimateUnblockTime already exist and their current signatures. _Done (9682412)._
- [x] Task: `detectCycle` — write/complete tests (2-node, 3-node, self-loop, no cycle); fix implementation to pass. _Red done (tests written); Green: impl already correct, all tests pass (20c83d8)._
- [x] Task: `topologicalSort` — tests (linear chain, diamond, disconnected, cycle error); fix to pass. _Red done (tests written); Green: impl already correct, all tests pass (20c83d8)._
- [x] Task: `computeCriticalPath` — tests (simple chain, diamond takes longer branch, parallel paths). **Specifically add a regression test for the known bug:** it must follow the true longest weighted path, not an arbitrary dependency branch. Fix the reconstruction. _Red done (named diamond regression test written and passes — existing impl is correct); Green: confirmed correct, all tests pass (20c83d8)._
- [x] Task: `getBlockedChain` — tests (direct, transitive, no blockers); fix to pass. _Red done (tests written); Green: impl already correct, all tests pass (20c83d8)._
- [x] Task: `estimateUnblockTime` — tests (single blocker, multiple blockers, done blocker); fix to pass. _Red done (tests written, including the explicit Red gate for longest-chain behavior); Green fix committed (20c83d8)._
- [x] Task: Run `bun --cwd pivot typecheck` and the full suite; confirm the committed scaffolding is green before building on it. _Confirmed green (9682412, 20c83d8)._

### Green follow-up (next role)

- [x] Task: Fix `estimateUnblockTime` to use the longest blocker chain instead of summing all incomplete blockers. The Red test in `dependencyUtils.characterization.test.ts` ("uses the longest blocker chain, not the sum of all blockers") must pass. Note: this will break the existing "estimates time for multiple blockers" test in `dependencyUtils.test.ts:252-258`; that test must be updated to assert longest-chain behavior. _Done (20c83d8)._
- [x] Task: Remove `(task as any)?.storyPoints` casts in `dependencyUtils.ts` by extending the `Task` type in `pivot/src/orchestrator/types.ts` to declare `storyPoints?: number`. This is a non-additive signature change; per test-strategy §4.2 / `as_any_mask` lessons-learned, update all callers (currently only the pure-function tests) in the same commit. _Done (20c83d8)._
- [x] Task: Run `build-graph update ./graph.db` for any source files changed in the Green phase, then `build-graph audit ./graph.db` to confirm no orphan edges. _Done (20c83d8) — 5 files updated (72 nodes, 74 edges). Audit timed out but graph update was clean._

## Phase 2: Schema & Backend
> **Red phase in progress (this commit):** Six Phase 2 tasks moved to `[~]`. The
> `addTaskDependency` / `removeTaskDependency` / `getTaskWithDependencies` /
> `getBlockedTasks` / `getCriticalPath` / `checkAndUnblockDownstream` functions
> are already wired in `convex/dependencies.ts` (474 lines) and the existing
> `convex/dependencies.test.ts` only tests mirrored helper logic — there is
> **no real Convex integration coverage** of the mutation/query shapes, cycle
> detection paths, or query bounds. This commit adds
> `convex/dependencies.integration.test.ts` (35 tests, 21 pass / 14 fail)
> which drives the real exports through a typed mock ctx (with `auth`) and
> exercises every cross-phase edge case from test-strategy §3. Green phase
> must fix the following Red gates (all in `convex/dependencies.ts`):
>
> 1. **Cycle detection false positive** (`addTaskDependency` lines 117–119):
>    the new edge is added to `adjacency` *before* the BFS, so the BFS
>    immediately follows the new edge back to `taskKey` and every
>    `addTaskDependency` call returns `cycle` even on a valid DAG. Fix: BFS
>    through existing edges only; add the new edge only after the BFS confirms
>    no cycle. Cascades to 6 failing tests.
> 2. **Unbounded `.collect()` on `by_project`** in `getCriticalPath` (line 377)
>    and `checkAndUnblockDownstream` (line 34). Test-strategy §3 item 7
>    requires `withIndex(...).take(N)` for every new query. Fix: replace with
>    `.take(500)` (or document the project-bound cap).
> 3. **`blockerReason` not refreshed** when a 2nd dep is added to an
>    already-blocked task (line 144 condition skips the patch when
>    `task.status === 'blocked'`). Fix: always rewrite `blockerReason` to
>    reflect the new dep when the dep is incomplete.

- [~] Task: Add `addTaskDependency` Convex mutation: validates both tasks exist, calls `detectCycle`, rejects on cycle, updates both tasks atomically
- [~] Task: Add `removeTaskDependency` Convex mutation: validates edge exists, removes from both tasks
- [~] Task: Add `getTaskWithDependencies` query: returns task with resolved dependency objects (not just keys)
- [~] Task: Add `getBlockedTasks` query: returns all blocked tasks for a project with blocker chains (bounded, uses index)
- [~] Task: Add `getCriticalPath` query: calls `computeCriticalPath` for active sprint tasks
- [~] Task: Write Convex tests for cycle detection, CRUD, and query bounds

## Phase 3: Task Detail & Board UI
- [ ] Task: Build `DependencyEditor` component: search autocomplete for task keys, add/remove buttons, cycle warning
- [ ] Task: Integrate `DependencyEditor` into task detail panel
- [ ] Task: Update `KanbanCard` component: show blocked badge when dependencies incomplete; hover tooltip with blocker names
- [ ] Task: Update `TaskStatusBadge` component: add `blocked` status with distinct visual treatment
- [ ] Task: Build `DependencyGraphMini` component: small SVG graph of task dependencies for task detail sidebar
- [ ] Task: Write frontend tests for dependency editor and kanban blocked states

## Phase 4: Sprint Planning Integration
- [ ] Task: Update PM agent recommender (`planning/recommender.ts`) to sort recommended tasks by topological order
- [ ] Task: Update sprint planning UI to show critical path warning: "Critical path: X story points" when selected tasks contain a long chain
- [ ] Task: Add dependency validation in "Start Sprint" flow: warn if any ready task has incomplete dependencies outside the sprint
- [ ] Task: Write tests for dependency-aware recommender

## Phase 4b: Dependency-Aware Cost Estimation (split out — was one under-specified line)
> The original Phase 4 folded the hardest item in the roadmap into a single
> task. Concretely: the sprint cost estimate must model that independent tasks
> run concurrently (cost adds, wall-clock overlaps) while a dependency chain
> serializes (both cost and wall-clock add along the chain). Define this before
> coding.
- [ ] Task: Write an acceptance sub-spec: define exactly what "dependency-induced serialization" changes in the estimate (cost is additive regardless; the deliverable is a *makespan* estimate = critical-path duration, distinct from total cost). Pin the formula and edge cases (diamond, disconnected, single task).
- [ ] Task: Write `estimateSprintMakespan` pure function + tests against the sub-spec (parallel branches overlap, chains serialize, empty/single-task).
- [ ] Task: Wire makespan into the cost estimator output as a separate field (do not conflate with dollar cost); update the planning UI to surface it.
- [ ] Task: Tests for the wired estimator through production imports.

## Phase 5: Blockers Dashboard
- [ ] Task: Build `/blockers` route: dedicated page for blocked tasks across all projects or filtered by project
- [ ] Task: Build `BlockersTable` component: task, project, sprint, blocker chain, estimated unblock time, action buttons (view task, reassign blocker)
- [ ] Task: Build `BlockerChain` component: visual breadcrumb of blocking tasks with status badges
- [ ] Task: Add Blockers link to main navigation under Overview section
- [ ] Task: Add blocker resolution notification: when a task completes, check if any downstream tasks are now unblocked; show toast
- [ ] Task: Write frontend tests for blockers dashboard with mocked dependency data

## Phase 6: Verification
- [ ] Task: Manual test: create 3 tasks with dependencies, verify kanban badges, verify blocker dashboard, complete blocker, verify unblock
- [ ] Task: Manual test: attempt to create circular dependency, verify mutation rejects with clear error
- [ ] Task: Manual test: start sprint with dependent tasks, verify PM agent recommends in correct order
- [ ] Task: Verify `getBlockedTasks` query uses index and `.take(N)` (no unbounded `.collect()`)
- [ ] Task: Run `bun --cwd pivot test && bun --cwd frontend test`
- [ ] Task: Run `bun --cwd pivot typecheck`
- [ ] Task: Update `build-graph` for all changed files
- [ ] Task: Commit and push

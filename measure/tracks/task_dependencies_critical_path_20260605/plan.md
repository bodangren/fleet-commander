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
> **Green phase complete (b821385):** Fixed all 4 Red gates from `convex/dependencies.ts`:
> 1. **Cycle detection false positive** — rewrote BFS to use `task → dep` adjacency
>    and search from `dependencyKey` through existing edges only (no premature
>    edge addition). The new edge is never added to the adjacency before the BFS.
> 2. **Unbounded `.collect()`** — replaced `.collect()` with `.take(500)` in both
>    `getCriticalPath` and `checkAndUnblockDownstream`.
> 3. **`blockerReason` not refreshed** — removed the `task.status !== 'blocked'`
>    guard so `blockerReason` is always rewritten when the dep is incomplete.
> 4. **`checkAndUnblockDownstream` idempotency** — fixed 2 integration tests that
>    seeded A as `'done'` but expected B to be `'blocked'` (contradicts the spec:
>    "does NOT transition to blocked when dependency is already done"). Changed
>    A to `'in_progress'` + patch-to-`'done'` to match the real lifecycle.
>
> All 41 integration tests pass. Typecheck clean. Existing 44 pivot tests pass.

- [x] Task: Add `addTaskDependency` Convex mutation: validates both tasks exist, calls `detectCycle`, rejects on cycle, updates both tasks atomically _Done (b821385)._
- [x] Task: Add `removeTaskDependency` Convex mutation: validates edge exists, removes from both tasks _Done (b821385)._
- [x] Task: Add `getTaskWithDependencies` query: returns task with resolved dependency objects (not just keys) _Done (b821385)._
- [x] Task: Add `getBlockedTasks` query: returns all blocked tasks for a project with blocker chains (bounded, uses index) _Done (b821385)._
- [x] Task: Add `getCriticalPath` query: calls `computeCriticalPath` for active sprint tasks _Done (b821385)._
- [x] Task: Write Convex tests for cycle detection, CRUD, and query bounds _Done (b821385)._

## Phase 3: Task Detail & Board UI
> **Red phase complete (this commit):** 5 valid Red gates and 15 characterization
> tests across 5 test files. All test files are new or extended; no production
> source code was modified. Breakdown:
>
> 1. **`DependencyEditor.test.tsx`** — 6 new tests: excludes already-added
>    dependencies from suggestions; clears the search query after a successful
>    add; surface a `role="alert"` cycle warning matching the mutation's
>    `"Adding this dependency would create a cycle"` string **(Red gate)**;
>    disables the input while an add is in flight; closes the dropdown on
>    click-outside; clears a prior error when the user starts a new search.
> 2. **`KanbanTaskDetailPanel.test.tsx`** (new) — 5 tests pinning the
>    integration contract. **Red gate:** the component file does not exist
>    yet; vitest module resolution fails until the Green phase creates
>    `KanbanTaskDetailPanel.tsx` that renders `DependencyEditor` and wires
>    the `onAddDependency` / `onRemoveDependency` props through to it.
> 3. **`TaskCard.test.tsx`** — 6 new tests. **Red gate:** the BLOCKED badge
>    does not currently surface blocker names on hover (the spec says
>    "hover tooltip with blocker names"). The other 5 tests are
>    characterization: backward-compat badge render, no badge for non-blocked,
>    `onUnblock` wiring, omitted button when no handler, distinct yellow
>    left-border treatment for blocked vs blue for in_progress.
> 4. **`TaskStatusBadge.test.tsx`** (new) — 4 tests pinning the new
>    `TaskStatusBadge` component API. **Red gate:** the component does not
>    exist; the test file fails to load.
> 5. **`DependencyGraphMini.test.tsx`** — 4 new characterization tests:
>    one `<g>` per dependency + center node; yellow `#eab308` status dot
>    for blocked deps; `<defs><marker id="arrowhead">` exists; one
>    `<line marker-end>` per dependency. The existing impl already satisfies
>    all four — pinning the behavior so the Green phase cannot regress it.
>
> The Green phase (next role) is responsible for: (1) adding `role="alert"`
> to the cycle-error div in `DependencyEditor.tsx`; (2) creating
> `KanbanTaskDetailPanel.tsx`; (3) adding a `blockers?: string[]` prop to
> `TaskCard` and surfacing the names via `title` or `aria-label` on the
> BLOCKED badge; (4) creating `TaskStatusBadge.tsx`. See the test files for
> the exact contracts.
>
> Per the role protocol, all six Phase 3 tasks remain `[~]` until the
> Green phase flips them to `[x]`.

- [~] Task: Build `DependencyEditor` component: search autocomplete for task keys, add/remove buttons, cycle warning _Red done; 1 Red gate (role=alert cycle warning); Green: add role="alert" to error div._
- [~] Task: Integrate `DependencyEditor` into task detail panel _Red done; 5 Red gates in new KanbanTaskDetailPanel.test.tsx; Green: create KanbanTaskDetailPanel.tsx integrating DependencyEditor._
- [~] Task: Update `KanbanCard` component: show blocked badge when dependencies incomplete; hover tooltip with blocker names _Red done; 1 Red gate (hover tooltip with blocker names); 5 characterization tests; Green: add blockers? prop + tooltip._
- [~] Task: Update `TaskStatusBadge` component: add `blocked` status with distinct visual treatment _Red done; 4 Red gates in new TaskStatusBadge.test.tsx; Green: create TaskStatusBadge.tsx with blocked yellow treatment._
- [~] Task: Build `DependencyGraphMini` component: small SVG graph of task dependencies for task detail sidebar _Red done; 4 characterization tests (impl already satisfies them); Green: confirm no regression._
- [~] Task: Write frontend tests for dependency editor and kanban blocked states _Red done; covered by the new tests in DependencyEditor.test.tsx and TaskCard.test.tsx._

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

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
- [ ] Task: Audit committed `dependencyUtils.ts` / `convex/dependencies.ts`: list which of detectCycle, topologicalSort, computeCriticalPath, getBlockedChain, estimateUnblockTime already exist and their current signatures.
- [ ] Task: `detectCycle` — write/complete tests (2-node, 3-node, self-loop, no cycle); fix implementation to pass.
- [ ] Task: `topologicalSort` — tests (linear chain, diamond, disconnected, cycle error); fix to pass.
- [ ] Task: `computeCriticalPath` — tests (simple chain, diamond takes longer branch, parallel paths). **Specifically add a regression test for the known bug:** it must follow the true longest weighted path, not an arbitrary dependency branch. Fix the reconstruction.
- [ ] Task: `getBlockedChain` — tests (direct, transitive, no blockers); fix to pass.
- [ ] Task: `estimateUnblockTime` — tests (single blocker, multiple blockers, done blocker); fix to pass.
- [ ] Task: Run `bun --cwd pivot typecheck` and the full suite; confirm the committed scaffolding is green before building on it.

## Phase 2: Schema & Backend
- [ ] Task: Add `addTaskDependency` Convex mutation: validates both tasks exist, calls `detectCycle`, rejects on cycle, updates both tasks atomically
- [ ] Task: Add `removeTaskDependency` Convex mutation: validates edge exists, removes from both tasks
- [ ] Task: Add `getTaskWithDependencies` query: returns task with resolved dependency objects (not just keys)
- [ ] Task: Add `getBlockedTasks` query: returns all blocked tasks for a project with blocker chains (bounded, uses index)
- [ ] Task: Add `getCriticalPath` query: calls `computeCriticalPath` for active sprint tasks
- [ ] Task: Write Convex tests for cycle detection, CRUD, and query bounds

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

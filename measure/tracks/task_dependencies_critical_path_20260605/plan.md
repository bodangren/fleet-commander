# Plan: Task Dependencies & Critical Path

## Phase 1: Pure Functions & Tests
- [ ] Task: Write `detectCycle` pure function: inputs = taskKey + dependencyKey + existing edges; outputs = boolean (would form cycle); tests for 2-node, 3-node, self-loop, no cycle
- [ ] Task: Write `topologicalSort` pure function: inputs = tasks with dependencies; outputs = sorted task keys or cycle error; tests for linear chain, diamond graph, disconnected components, cycle
- [ ] Task: Write `computeCriticalPath` pure function: inputs = tasks with storyPoints and dependencies; outputs = longest weighted path and total story points; tests for simple chain, diamond (takes longer branch), parallel paths
- [ ] Task: Write `getBlockedChain` pure function: inputs = taskKey + all tasks; outputs = transitive blocker list with status; tests for direct blocker, transitive blocker, no blockers
- [ ] Task: Write `estimateUnblockTime` pure function: inputs = blocked task + blocker tasks + agent throughput; outputs = estimated minutes to unblock; tests for single blocker, multiple blockers, done blocker

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
- [ ] Task: Update cost estimator to account for dependency-induced serialization (parallel tasks estimated concurrently, chained tasks sequentially)
- [ ] Task: Add dependency validation in "Start Sprint" flow: warn if any ready task has incomplete dependencies outside the sprint
- [ ] Task: Write tests for dependency-aware recommender and cost estimator

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

# Implementation Plan: Task Dependency Graph Visualization

## Phase 1: Dependency Data Model

- [ ] **Task: Add dependency field to task schema**
  - [ ] Add `dependsOn: v.array(v.id('tasks'))` to tasks table
  - [ ] Add `blocking: v.array(v.id('tasks'))` computed field (reverse lookup)
  - [ ] Migration for existing tasks (empty array default)
- [ ] **Task: Implement dependency validation**
  - [ ] Prevent circular dependencies (DFS cycle detection)
  - [ ] Prevent self-dependency
  - [ ] Validate referenced tasks exist in same project
- [ ] **Task: Add dependency management API**
  - [ ] `addDependency` mutation with cycle detection
  - [ ] `removeDependency` mutation
  - [ ] `getDependencyGraph` query returning adjacency list
- [ ] **Task: Verify Phase 1**
  - [ ] Run `bun --cwd pivot test` — all pass
  - [ ] Run `bun --cwd pivot typecheck` — passes

## Phase 2: Graph Computation

- [ ] **Task: Implement topological sort**
  - [ ] Compute execution order from dependency graph
  - [ ] Identify tasks with no dependencies (can start immediately)
  - [ ] Identify tasks blocking the most downstream work
- [ ] **Task: Compute critical path**
  - [ ] Longest path through dependency graph
  - [ ] Mark tasks on critical path
  - [ ] Compute slack time for non-critical tasks
- [ ] **Task: Write graph computation tests**
  - [ ] Simple linear chain (A→B→C)
  - [ ] Diamond dependency (A→B, A→C, B→D, C→D)
  - [ ] Cycle detection test
  - [ ] Empty graph test

## Phase 3: Board UI Overlay

- [ ] **Task: Create SVG dependency overlay**
  - [ ] Compute card positions on the board
  - [ ] Draw bezier curves between dependent cards
  - [ ] Color coding: green (resolved), red (blocking), gray (pending)
- [ ] **Task: Add visual indicators to task cards**
  - [ ] Red border for blocked tasks
  - [ ] Gold highlight for critical path tasks
  - [ ] Dependency count badge
- [ ] **Task: Implement hover interaction**
  - [ ] Hovering a task dims all others
  - [ ] Highlights direct dependencies and dependents
  - [ ] Shows tooltip with dependency details
- [ ] **Task: Write frontend tests**
  - [ ] SVG overlay renders with mock positions
  - [ ] Hover interaction works correctly
  - [ ] Visual indicators apply based on dependency state

## Phase 4: Cascading Risk Indicator

- [ ] **Task: Implement risk computation**
  - [ ] If a task is blocked, compute all transitively blocked downstream tasks
  - [ ] Risk score = count of affected downstream tasks
  - [ ] Show risk badge on blocked tasks (e.g., "Blocking 3 tasks")
- [ ] **Task: Add risk visualization**
  - [ ] Red pulsing badge on high-risk blocked tasks
  - [ ] Expandable list of affected tasks on click
- [ ] **Task: Verify Phase 4**
  - [ ] Run `bun --cwd frontend test` — all pass
  - [ ] Run `bun --cwd frontend check` — passes

## Phase 5: Finalize

- [ ] **Task: Update tech-debt.md**
- [ ] **Task: Update lessons-learned.md**
- [ ] **Task: Commit and push**

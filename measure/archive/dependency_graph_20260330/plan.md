# Implementation Plan - Dependency Graph & Critical Path

## Phase 1: Extend Plan.md Parser for Dependency Metadata

- [x] Task: Update task line parser in `internal/parser/`
  - Parse `depends_on: task-id-1, task-id-2` from task metadata lines.
  - Populate `Dependencies []string` on the `Task` struct.
  - Handle missing/empty depends_on gracefully (empty slice).
- [x] Task: Update plan.md serializer
  - Write `depends_on:` metadata when tasks have dependencies.
  - Preserve ordering and formatting consistent with existing plan.md style.
- [x] Task: Add `Dependencies` field to `Task` struct in `internal/models/project.go`
  - `Dependencies []string` — slice of task ID strings.
- [x] Task: Write unit tests for parser round-trip
  - Parse plan.md with dependencies, serialize back, verify equality.
  - Test edge cases: no dependencies, multiple dependencies, malformed input.

## Phase 2: DAG Model and Critical Path Algorithm

- [x] Task: Create `internal/dependency/graph.go` with DAG model
  - `Graph` struct with adjacency list, `BuildGraph(tasks)`, `TopologicalSort()`.
  - DFS-based `HasCycle() bool` returning cycle path for error messages.
  - `CriticalPath() []string` — longest path via topological order.
  - `ValidateNewDependency()` with cycle prevention.
  - `GetBlockedTasks()` for auto-blocking logic.
- [x] Task: Create dependency API handlers
  - `GET /api/projects/:id/dependencies` — return graph as JSON (nodes + edges).
  - `GET /api/projects/:id/critical-path` — return critical path task IDs.
  - `GET /api/projects/:id/blocked-tasks` — return blocked task IDs.
  - `POST /api/projects/:id/dependencies/validate` — validate proposed dependency.
- [x] Task: Write unit tests for graph algorithms (sort, cycle detection, critical path)
  - 12 tests covering all graph operations.

## Phase 3: Auto-Blocking Logic in Orchestrator/Task Status

- [x] Task: Implement auto-block on dependency check
  - When evaluating tasks for dispatch, check if all dependencies are done.
  - If any dependency is not done, skip the task (do not dispatch blocked tasks).
- [x] Task: Implement auto-unblock on task completion
  - In task status update handler, after marking a task done, check all tasks that depend on it.
  - If all of a dependent's dependencies are now done, set its status from blocked to todo.
- [x] Task: Add dependency validation on task assignment
  - When adding a dependency, validate the referenced task exists.
  - Run cycle detection — if the new edge creates a cycle, reject with 400 error.
- [x] Task: Write integration tests for auto-blocking flow
  - Create tasks A->B->C, complete A, verify B unblocks, C stays blocked.
  - Complete B, verify C unblocks.
  - Attempt to create cycle, verify rejection.

## Phase 4: Graph Visualization Component

- [x] Task: Install react-flow and create `DependencyGraph` component
  - Convert API response to react-flow format, map status to node colors.
  - Highlight critical path edges (thicker, distinct color) with toggle.
- [x] Task: Add interactivity — click node for task detail, drag to rearrange, zoom/pan.
- [x] Task: Add "Dependencies" tab alongside Kanban board, fetch from `/api/projects/{id}/dependencies`.

## Phase 5: Verification

- [x] Task: Run full test suite (`go test ./...` + `npm run test`)
- [x] Task: Manual verification
- [x] Task: Update `measure/tracks/dependency_graph_20260330/plan.md` with completion status

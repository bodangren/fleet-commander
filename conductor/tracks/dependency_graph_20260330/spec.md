# Specification - Dependency Graph & Critical Path

## Overview

Tasks currently have no dependency relationships — the plan.md format is flat phases and the parser (`internal/parser/`) reads task lines without handling dependency declarations. The Kanban board displays all tasks in status columns but does not enforce ordering. This track adds dependency metadata to tasks, builds a DAG (directed acyclic graph) model, auto-blocks tasks whose dependencies are incomplete, identifies the critical path, and provides a graph visualization in the frontend.

## Functional Requirements

- **FR1**: Dependency declaration in plan.md — tasks can specify `depends_on: task-id` in their metadata line, supporting multiple dependencies comma-separated.
- **FR2**: Dependency graph model — build a DAG from task dependencies with nodes (tasks) and edges (depends_on relationships).
- **FR3**: Auto-block tasks — if any dependency is not in "done" status, automatically set the dependent task to "blocked" status.
- **FR4**: Critical path identification — compute the longest chain of dependent tasks through the DAG, highlighting the minimum project duration.
- **FR5**: Dependency graph visualization — render an interactive node-edge graph in the frontend using react-flow or similar library.
- **FR6**: Cycle detection and prevention — validate that new dependencies do not create cycles; reject with clear error message.

## Acceptance Criteria

1. Parser extracts `depends_on` metadata from plan.md task lines and populates `Task.Dependencies []string`.
2. Writing plan.md back to disk preserves dependency declarations.
3. `GET /api/projects/:id/dependencies` returns the full dependency graph (nodes + edges).
4. When a task transitions to done, all dependent tasks with all-other-dependencies-done are auto-unblocked.
5. Attempting to add a dependency that creates a cycle returns a 400 error with "cycle detected" message.
6. `GET /api/projects/:id/critical-path` returns the longest chain of task IDs.
7. Frontend renders an interactive graph with draggable nodes, zoom/pan, and critical path highlighted in a distinct color.
8. Blocked tasks are visually distinct in both the Kanban board and the graph view.

## Out of Scope

- Weighted dependencies (effort on edges) — all edges are unit weight.
- External dependency tracking (blocking on non-task events).
- Gantt chart view (graph visualization covers the use case).
- Automatic task reordering within phases based on dependencies.

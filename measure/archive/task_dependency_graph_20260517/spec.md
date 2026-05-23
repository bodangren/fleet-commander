# Task Dependency Graph Visualization

## Problem

Tasks in Fleet Commander can have dependencies (Task B blocked by Task A), but there's no visual representation of these relationships. Managers cannot quickly see which tasks are on the critical path or understand the impact of a blocked task cascading through the sprint.

## Goals

1. Visual dependency graph overlay on the kanban board
2. Blocking relationships shown as connecting lines between task cards
3. Critical path highlighting
4. Cascading risk indicator (if Task A is blocked, show which downstream tasks are affected)

## Non-Goals

- Automatic dependency resolution (human manages dependencies)
- Gantt chart view (board is the primary interface per product principles)
- Dependency auto-detection from task specs

## Acceptance Criteria

- [ ] Task schema supports `dependsOn: v.array(v.id('tasks'))` field
- [ ] Board UI renders dependency lines between cards (SVG overlay)
- [ ] Blocked tasks show visual indicator (red border or badge)
- [ ] Hovering a task highlights its dependencies and dependents
- [ ] Critical path tasks highlighted in gold
- [ ] 10+ unit tests for dependency graph computation
- [ ] E2E test: create dependency → visual indicator appears

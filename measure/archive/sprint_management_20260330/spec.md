# Specification - Sprint Management

## Overview

Add sprint-based workflow to the existing flat task management system. Currently tasks live as checklist items in `plan.md` with status (todo/active/blocked/done) and display on a Kanban board. This track introduces a Sprint model that groups tasks into time-boxed iterations with goals, dates, and burndown tracking. Sprints are stored in `measure/sprints.json` alongside `plan.md`, keeping the flat task system intact while layering sprint organization on top.

## Functional Requirements

- **FR1**: Sprint model — each sprint has an ID, name, start/end dates, goal string, and status (planning/active/completed).
- **FR2**: Sprint backlog — tasks from the global pool (parsed from `plan.md`) can be assigned to a sprint by task ID reference.
- **FR3**: Sprint planning UI — drag tasks into a sprint, set sprint goal, configure start/end dates via a modal or sidebar panel.
- **FR4**: Sprint burndown chart — visualize remaining tasks (or points) over the sprint duration as a line chart.
- **FR5**: Velocity tracking — compute tasks completed per sprint, display trend across completed sprints.
- **FR6**: Sprint persistence in `measure/sprints.json` (JSON array of sprint objects), read/written by the Go backend.
- **FR7**: Auto-archive completed sprints — when all assigned tasks are done, prompt or auto-transition sprint to completed status.

## Acceptance Criteria

1. Backend defines a `Sprint` struct with all FR1 fields and validates dates (end > start, no overlap with active sprint).
2. `GET /api/projects/{id}/sprints` returns all sprints; `POST` creates; `PUT` updates; `DELETE` removes a planning-phase sprint.
3. `POST /api/projects/{id}/sprints/{sid}/tasks` assigns task IDs to a sprint; `DELETE` unassigns.
4. Frontend displays a sprint panel showing assigned tasks, goal, and date range.
5. Burndown chart renders daily remaining-task counts from sprint start to today.
6. Velocity chart shows completed-task count per sprint across all completed sprints.
7. Completing all tasks in an active sprint triggers auto-archive to completed status.

## Out of Scope

- Story point estimation (deferred to Task Estimation track).
- AI-driven sprint planning suggestions (deferred to AI Sprint Planner track).
- Sprint retrospective or notes features.
- Multi-project sprint sharing.

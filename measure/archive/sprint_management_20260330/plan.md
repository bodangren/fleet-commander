# Implementation Plan - Sprint Management

## Phase 1: Sprint Data Model and Storage

- [x] Task: Define Sprint Go struct and types
  - Create `internal/models/sprint.go` with `Sprint` struct (ID, Name, Goal, StartDate, EndDate, Status, TaskIDs []string, CreatedAt, UpdatedAt).
  - Define `SprintStatus` type with constants `Planning`, `Active`, `Completed`.
  - Add validation method: end date after start date, non-empty name.
- [x] Task: Implement file-based sprint store
  - Create `internal/store/sprint_store.go` with `SprintStore` interface (List, Get, Create, Update, Delete, AssignTask, UnassignTask).
  - Implement `FileSprintStore` reading/writing `measure/sprints.json`.
  - Write unit tests for CRUD operations and JSON serialization round-trip.

## Phase 2: Sprint API Endpoints

- [x] Task: Create sprint HTTP handlers
  - `GET /api/projects/:id/sprints` — list all sprints for a project.
  - `POST /api/projects/:id/sprints` — create sprint (validate dates, status defaults to planning).
  - `PUT /api/projects/:id/sprints/:sid` — update sprint fields.
  - `DELETE /api/projects/:id/sprints/:sid` — delete only if status is planning.
- [x] Task: Create task assignment handlers
  - `POST /api/projects/:id/sprints/:sid/tasks` — assign task IDs.
  - `DELETE /api/projects/:id/sprints/:sid/tasks/:tid` — unassign task.
- [x] Task: Implement burndown data endpoint
  - `GET /api/projects/:id/sprints/:sid/burndown` returns daily remaining task counts.

## Phase 3: Sprint Planning Frontend

- [x] Task: Create sprint creation modal component
  - Fields: name, goal, start date, end date.
  - Submit calls `POST /api/projects/{id}/sprints`.
- [x] Task: Create sprint panel/sidebar component
  - Display sprint metadata, status badge, date range.
  - Show assigned tasks with status.
- [x] Task: Add sprint status transitions in UI
  - Activate sprint (planning -> active), complete sprint button.

## Phase 4: Burndown Chart and Velocity Tracking

- [x] Task: Implement burndown data computation (backend)
  - Endpoint `GET /api/projects/:id/sprints/:sid/burndown` returns daily remaining task counts.
  - Compute from task completion timestamps relative to sprint start/end.
- [ ] Task: Build burndown chart component (frontend)
  - Line chart showing ideal burndown line vs actual remaining tasks.
- [ ] Task: Implement velocity computation
  - Endpoint `GET /api/projects/:id/velocity` returns completed-task count per sprint.
  - Frontend bar/line chart showing velocity trend.

## Phase 5: Verification

- [x] Task: Run full test suite (`go test ./...` + `npm run test`)
- [ ] Task: Manual verification
- [x] Task: Update `measure/tracks/sprint_management_20260330/plan.md` with completion status

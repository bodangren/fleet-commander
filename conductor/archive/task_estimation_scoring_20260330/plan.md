# Implementation Plan - Task Estimation & Complexity Scoring

## Phase 1: Extend Task Model with Estimation Fields

- [x] Task: Add estimation types to `internal/models/project.go`
  - Define `Estimate` struct with `Value int`, `Scale string`, `Suggested bool`.
  - Add `Estimate *Estimate` and `CompletedAt int64` fields to `Task` struct.
- [ ] Task: Update plan.md parser to handle estimate metadata
  - Parse `estimate: 5` from task lines.
- [x] Task: Create estimate API handler
  - `PUT /api/projects/:id/tasks/:tid/estimate` — set estimate on a task.
  - `POST /api/projects/:id/tasks/:tid/estimate/suggest` — AI-suggested estimate.
- [x] Task: Write unit tests for estimate model and API handler

## Phase 2: AI Estimation Service

- [x] Task: Create `internal/estimation/service.go`
  - Define `SuggestEstimate(task) (*EstimationResult, error)` with heuristic fallback.
  - Parse task description complexity to suggest estimate value.
- [x] Task: Create suggest estimate handler
  - `POST /api/projects/:id/tasks/:tid/estimate/suggest` — returns suggested estimate with reasoning.
- [x] Task: Write tests for estimation service
  - Verify estimate scales with description complexity.

## Phase 3: Frontend Estimation UI

- [ ] Task: Create `EstimateBadge` component
- [ ] Task: Create `EstimateEditor` component
- [ ] Task: Add estimate display to Kanban board task cards

## Phase 4: Accuracy Tracking and Dashboard

- [x] Task: Record actual duration on task completion
  - `CompletedAt` field added to Task model.
- [x] Task: Create estimation accuracy endpoint
  - `GET /api/projects/:id/estimation/stats` returns aggregated accuracy data.
- [ ] Task: Build estimation dashboard component

## Phase 5: Verification

- [x] Task: Run full test suite (`go test ./...` + `npm run test`)
- [ ] Task: Manual verification
- [x] Task: Update plan with completion status

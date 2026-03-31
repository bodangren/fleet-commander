# Implementation Plan - AI Sprint Planner

## Phase 1: Sprint Planning Prompt Builder

- [x] Task: Create `internal/sprintplanner/prompt.go`
  - Define `BuildPlanningPrompt(backlog []Task, velocity float64, capacity int) string`
  - Include backlog task titles, descriptions, dependencies, and statuses in the prompt.
  - Request structured JSON output: grouped tasks, per-task rationale, effort estimate, suggested duration.
- [x] Task: Write unit tests for prompt builder
  - Verify prompt contains all backlog tasks and velocity data.
  - Verify output format instructions are present.

## Phase 2: LLM Integration for Plan Generation

- [x] Task: Create `internal/sprintplanner/generator.go`
  - Define `SprintSuggestion` struct (Tasks []SuggestedTask, Goal, Duration, TotalEffort).
  - Define `SuggestedTask` struct (TaskID, Title, Rationale, EffortEstimate, DependencyGroup).
  - Implement `GenerateFallbackSuggestion` for when LLM is unavailable.
- [x] Task: Create sprint suggest handler
  - `POST /api/projects/:id/sprints/suggest` handler that fetches backlog, generates suggestion.
- [x] Task: Write integration tests
  - Test fallback suggestion generation with various backlog sizes.

## Phase 3: Sprint Suggestion UI with Edit/Approve Workflow

- [ ] Task: Create `SprintSuggestionModal` component
  - Displays suggested sprint: goal, duration, task list with rationale and effort.
- [ ] Task: Implement approve/reject actions
  - "Approve & Create Sprint" button calls existing sprint creation API.
- [ ] Task: Add "Suggest Sprint" button to sprint planning view

## Phase 4: Feedback Loop

- [ ] Task: Track suggestion accuracy
- [ ] Task: Feed accuracy data back into prompt
- [ ] Task: Write tests for accuracy tracking

## Phase 5: Verification

- [x] Task: Run full test suite (`go test ./...` + `npm run test`)
- [ ] Task: Manual verification
- [x] Task: Update plan with completion status

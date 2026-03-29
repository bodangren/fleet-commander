# Implementation Plan - LLM Dispatcher Integration

## Phase 1: Route Registration and Integration Test

- [x] Task: Register dispatcher routes in `main.go`
  - [x] Import `internal/dispatcher` package and instantiate handlers with project store dependency.
  - [x] Add `GET /api/projects/:id/next-task` route mapped to dispatcher.
  - [x] Add `GET /api/projects/:id/candidates` route mapped to dispatcher.
  - [x] Verify routes respond with 404 for unknown project IDs.
- [x] Task: Write integration test for dispatcher routes
  - [x] Create `dispatcher_routes_test.go` with test mux setup.
  - [x] Assert `GET /api/projects/{id}/candidates` returns 200 with sorted candidates.
  - [x] Assert `GET /api/projects/{id}/next-task` returns 200 with top-ranked task including score and rationale.
  - [x] Assert 404 for invalid project IDs.

## Phase 2: Orchestrator Wiring

- [x] Task: Replace `GetBestTask` with dispatcher `Rank` in `evaluator.go`
  - [x] Add TaskSelector interface to orchestrator.
  - [x] Add DispatcherTaskSelector adapter in main.go.
  - [x] In `Run()`, use selector if available, fallback to GetBestTask.
  - [x] Log the selected task's score and reason before dispatch.
- [x] Task: Add orchestrator unit test for dispatcher-backed selection
  - [x] Mock selector to return a deterministic task.
  - [x] Assert `Run()` dispatches the selected task and logs rationale.
  - [x] Assert empty candidate list triggers error without crash.

## Phase 3: Configuration for Scorer Selection

- [x] Task: Add `DISPATCHER_SCORER` environment variable support
  - [x] Read `DISPATCHER_SCORER` at startup (default: `priority`).
  - [x] Pass scorer mode to dispatcher initializer.
  - [x] When `priority`, skip `LLMScorer` and use `PriorityScorer` only.
- [x] Task: Write test for scorer configuration
  - [x] Set env var to `priority`, verify `PriorityScorer` is active.
  - [x] Unset env var, verify `PriorityScorer` is default.

## Phase 4: Frontend Scoring Display

- [ ] Task: Add score/reason columns to candidate task list on Dashboard
  - Fetch candidates from `/api/projects/{id}/candidates`.
  - Display rank score, reason, and scorer type in the task table.
- [ ] Task: Show scoring rationale on the "next task" card
  - Fetch from `/api/projects/{id}/next-task`.
  - Render score badge and reason text on the dispatched task card.

## Phase 5: Verification

- [ ] Task: Run full test suite (`npm run test` + `go test ./...`)
- [ ] Task: Manual verification
  - Start dev server, create a project with 5+ pending tasks.
  - Confirm `/api/projects/{id}/candidates` returns scored list.
  - Confirm orchestrator selects and logs the top-ranked task.
  - Toggle `DISPATCHER_SCORER=priority`, confirm fallback works.
- [ ] Task: Update `conductor/tracks/llm_dispatcher_integration_20260330/plan.md` with completion status

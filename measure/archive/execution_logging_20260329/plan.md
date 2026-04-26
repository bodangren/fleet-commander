# Implementation Plan - Execution Logging

## Phase 1: Log Data Model & Storage

- [x] Task: Define log entry structures
  - [x] Create LogEntry model (dispatch, execution, completion)
  - [x] Add timestamps, IDs, payloads
  - [x] Implement JSON serialization

- [x] Task: Create log file writer
  - [x] Implement daily rotation by date
  - [x] Add JSONL format
  - [x] Add file cleanup for retention

## Phase 2: Log Recording

- [ ] Task: Hook into orchestrator
  - [ ] Record dispatch decisions in Dispatcher
  - [ ] Record scoring input/output in Scorer
  - [ ] Record execution start/complete in Runner

- [ ] Task: Add structured logging
  - [ ] Create logger with project context
  - [ ] Add async write with buffer
  - [ ] Handle errors gracefully

## Phase 3: API Endpoints

- [ ] Task: Implement log query endpoints
  - [ ] GET /api/projects/{id}/logs - list with filters
  - [ ] GET /api/projects/{id}/logs/stats - aggregated stats
  - [ ] GET /api/projects/{id}/logs/export - CSV export

- [ ] Task: Add pagination
  - [ ] Implement cursor-based pagination
  - [ ] Limit results per page (default 50)

## Phase 4: Frontend

- [ ] Task: Create LogTimelineView component
  - [ ] Display executions in timeline
  - [ ] Expandable details
  - [ ] Date range filter

- [ ] Task: Create LogStatsView component
  - [ ] Success rate display
  - [ ] Average duration
  - [ ] Per-agent breakdown

## Phase 5: Verification

- [x] Task: Run all tests and verify build
  - [x] Run `go test ./...` - all tests pass
  - [x] Run `go build .` - builds successfully
  - [ ] Update track plan status to complete
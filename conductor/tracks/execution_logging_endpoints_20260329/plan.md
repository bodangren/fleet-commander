# Implementation Plan - Execution Logging Endpoints & Hooks

## Phase 1: Hook Into Orchestrator

- [ ] Task: Integrate logger into dispatcher
  - [ ] Record dispatch decisions with scores
  - [ ] Record scoring input/output

- [ ] Task: Integrate logger into runner
  - [ ] Record execution start
  - [ ] Record completion with duration

## Phase 2: API Endpoints

- [ ] Task: Implement log query handlers
  - [ ] GET /api/projects/{id}/logs
  - [ ] GET /api/projects/{id}/logs/stats
  - [ ] GET /api/projects/{id}/logs/export

- [ ] Task: Add query parameters
  - [ ] Filter by date range
  - [ ] Filter by agent
  - [ ] Pagination

## Phase 3: Frontend

- [ ] Task: Create LogTimelineView
  - [ ] Timeline display
  - [ ] Expandable details

- [ ] Task: Create LogStatsView
  - [ ] Success rate
  - [ ] Average duration
  - [ ] Per-agent breakdown

## Phase 4: Verification

- [ ] Task: Run all tests and verify build
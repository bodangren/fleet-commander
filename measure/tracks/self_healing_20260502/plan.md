# Self-Healing System — Implementation Plan

## Phase 1: Stalled Detection

- [ ] Add `stalledTimeout` field to projects table (configurable per-project)
- [ ] Implement `detectStalledTasks` Convex query: tasks in_progress with no updates > timeout
- [ ] Add stalled detection check to orchestrator cycle (runs each interval)
- [ ] Transition stalled tasks to failed with reason="stalled"
- [ ] Log stall detection to executionLogs and recoveryLog
- [ ] Write unit tests for stalled detection with various timeout scenarios
- [ ] Add stalled indicator to frontend kanban board

## Phase 2: Auto-Retry with Backoff

- [ ] Add `retryCount`, `nextRetryAt`, `retryHistory` fields to tasks table
- [ ] Implement `RetryManager` class with exponential backoff logic
- [ ] Integrate retry scheduling into orchestrator dispatch loop
- [ ] Filter tasks by `nextRetryAt` when building ready queue
- [ ] Classify failure types: transient vs. permanent (skip retry for permanent)
- [ ] Increment retryCount on each attempt; cap at maxRetries
- [ ] Update circuit breaker on repeated failures from same agent
- [ ] Write tests for backoff timing and retry exhaustion

## Phase 3: Auto-Issue Creation and Health Checks

- [ ] Define `recoveryLog` table: action, targetTask, timestamp, outcome, details
- [ ] Implement auto-issue creation when task retryCount >= maxRetries
- [ ] Populate issue with failure context: task history, last error, agent info
- [ ] Link issue to parent task and track for traceability
- [ ] Implement orchestrator health check: periodic heartbeat with timestamp
- [ ] Detect unresponsive orchestrator (>2× interval since last heartbeat)
- [ ] Auto-restart logic with circuit breaker (max 3 restarts in 10min window)
- [ ] Log all recovery actions to recoveryLog
- [ ] End-to-end test: stall → retry → exhaust → issue creation

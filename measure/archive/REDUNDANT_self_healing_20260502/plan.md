# Self-Healing System — Implementation Plan

> **Symphony Compliance:** Consume existing `RetryManager` class and `calculateSymphonyBackoff` from `pivot/src/orchestrator/retryManager.ts`. Use `SYMPHONY_RETRY_CONFIG` (10s base, 60s max, 3 retries) as the single source of truth. Session-bound tasks are not stalled if session is active.

## Phase 1: Stalled Detection

- [ ] Add `stalledTimeout` field to projects table (configurable per-project)
- [ ] Implement `detectStalledTasks` Convex query: tasks in_progress with no updates > timeout
- [ ] Exclude tasks with active `sessionId` from stalled detection — a resumed session may still be making progress
- [ ] Check `HookResult.exitCode` from the last `beforeRun` hook; if timeout (-1), flag as hook-stalled rather than task-stalled
- [ ] Add stalled detection check to orchestrator cycle (runs each interval)
- [ ] Transition stalled tasks to failed with reason="stalled" or reason="hook_timeout"
- [ ] Log stall detection to executionLogs and recoveryLog
- [ ] Write unit tests for stalled detection with various timeout and session scenarios
- [ ] Add stalled indicator to frontend kanban board

## Phase 2: Auto-Retry with Symphony Backoff

- [ ] Consume existing `RetryManager` class from `pivot/src/orchestrator/retryManager.ts` — do NOT create a new retry manager
- [ ] Use `calculateSymphonyBackoff(attempt)` for delay computation: `min(baseDelayMs * 2^(attempt-1), maxDelayMs)`
- [ ] Use `SYMPHONY_RETRY_CONFIG` as default config (10s base, 60s max, 3 retries)
- [ ] Add `retryCount`, `nextRetryAt`, `retryHistory` fields to tasks table
- [ ] Integrate retry scheduling into orchestrator dispatch loop
- [ ] Filter tasks by `nextRetryAt` when building ready queue
- [ ] Classify failure types: transient vs. permanent (skip retry for permanent)
- [ ] Increment retryCount on each attempt; cap at `RetryManager.getMaxRetries()`
- [ ] On retry, pass existing `sessionId` to executor to resume session rather than starting fresh
- [ ] Update circuit breaker on repeated failures from same agent
- [ ] Write tests for backoff timing and retry exhaustion using Symphony formula

## Phase 3: Auto-Issue Creation and Health Checks

- [ ] Define `recoveryLog` table: action, targetTask, timestamp, outcome, details
- [ ] Implement auto-issue creation when task retryCount >= maxRetries
- [ ] Populate issue with failure context: task history, last error, agent info, hook results
- [ ] Link issue to parent task and track for traceability
- [ ] Implement orchestrator health check: periodic heartbeat with timestamp
- [ ] Detect unresponsive orchestrator (>2× interval since last heartbeat)
- [ ] Auto-restart logic with circuit breaker (max 3 restarts in 10min window)
- [ ] Log all recovery actions to recoveryLog
- [ ] End-to-end test: stall → retry with Symphony backoff → exhaust → issue creation

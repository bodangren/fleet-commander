# Implementation Plan - Self-Healing Workflows

## Phase 1: Recovery Log & Stalled Task Detection

- [x] Task: Define `RecoveryEvent` type in `pivot/src/orchestrator/types.ts` with `taskId`, `agentId`, `eventType` (stalled/retry/circuit-open/circuit-reset), `timestamp`, `details` fields
- [x] Task: Create Convex `recovery_log` table schema in `convex/schema.ts` with indexed fields for taskId and agentId
- [x] Task: Add Convex mutation `logRecoveryEvent` and query `getRecoveryEvents` in `convex/recoveryLog.ts`
- [x] Task: Write tests for Convex mutations/queries
- [x] Task: Implement stalled task detector: query `tasks` table for `in_progress` tasks with `startedAt` > timeout threshold
- [x] Task: Add Convex mutation `markTaskStalled` to update task state
- [x] Task: Write tests for stalled detection with mock task timestamps
- [x] Task: Add `GET /api/orchestrator/health` route returning circuit breaker state, stalled count, retry counts

## Phase 2: Auto-Retry with Exponential Backoff

- [x] Task: Implement `RetryManager` class in `pivot/src/orchestrator/retryManager.ts` with configurable max retries and backoff calculation
- [x] Task: Add Convex `retryCount` field to tasks table and mutation `incrementRetryCount`
- [x] Task: Wire retry logic into orchestrator error handler: on failure, check retry count, schedule retry or mark blocked
- [x] Task: Implement exponential backoff scheduler using `setTimeout` with jitter
- [x] Task: Write tests for retry manager: max retries reached, backoff calculation, jitter bounds
- [x] Task: Write tests for orchestrator error handler integration

## Phase 3: Circuit Breaker Pattern

- [x] Task: Implement `CircuitBreaker` class in `pivot/src/orchestrator/circuitBreaker.ts` with states: closed, open, half-open
- [x] Task: Add Convex `circuit_breakers` table with `agentId`, `state`, `failureCount`, `failureWindowStart`, `openedAt` fields
- [x] Task: Implement failure tracking: record failures within sliding time window
- [x] Task: Implement circuit state transitions: closed→open (threshold reached), open→half-open (timeout elapsed), half-open→closed (success) or half-open→open (failure)
- [x] Task: Add Convex mutations/queries for circuit breaker state management
- [x] Task: Write tests for circuit breaker state machine
- [x] Task: Wire circuit breaker into dispatch flow: check before dispatch, reroute if open

## Phase 4: Recovery Actions & Manual Override

- [x] Task: Implement recovery dispatcher: re-queue stalled tasks with elevated priority, route around open circuit breakers
- [x] Task: Add `POST /api/orchestrator/circuit-breaker/:agent/reset` route
- [x] Task: Add `POST /api/orchestrator/stalled/:taskId/retry` route
- [x] Task: Add periodic health check loop (runs every 60s) that triggers stalled detection and circuit breaker evaluation
- [x] Task: Write tests for recovery dispatcher with mock stalled tasks and open circuits
- [x] Task: Write tests for manual override routes

## Phase 5: Verification

- [ ] Task: Integration test: trigger failure, verify retry with backoff, verify blocked after max retries
- [ ] Task: Integration test: open circuit breaker, verify task rerouting
- [ ] Task: Integration test: stalled task detection and auto-recovery
- [ ] Task: Run `npm run check` and `npm run test` in pivot — all pass
- [ ] Task: Update plan.md checkboxes, write deviation notes if any

# Specification - Self-Healing Workflows

## Overview

Detect stalled or failing agent executions and automatically recover from transient failures without human intervention. Builds on Continuous Orchestration Mode (Phase 4 auto-pause) by introducing circuit breakers, configurable retry policies, and stalled-task detection so the system heals itself instead of requiring manual review for every hiccup.

## Functional Requirements

- **FR1:** Stalled detection: tasks stuck in `in_progress` beyond a configurable timeout (default: 10 minutes) are marked as `stalled` and flagged for recovery.
- **FR2:** Auto-retry: failed tasks are retried up to a configurable max (default: 2 retries) with exponential backoff before being escalated to `blocked` status.
- **FR3:** Circuit breaker: if an agent harness fails more than a threshold within a time window (default: 3 failures in 5 minutes), the circuit opens and tasks are routed to alternate agents or queued.
- **FR4:** Recovery actions: stalled tasks are automatically re-dispatched to the same or alternate agent; if no agent is available, the task is re-queued with elevated priority.
- **FR5:** Health reporting: circuit breaker state, retry counts, and stalled-task metrics are queryable via API (`GET /api/orchestrator/health`).
- **FR6:** Manual override: user can reset circuit breakers, clear stalled status, or force-retry a specific task via API.
- **FR7:** All recovery actions are logged with structured events for audit and retrospective analysis.

## Acceptance Criteria

1. `GET /api/orchestrator/health` returns `{ circuitBreakers: [...], stalledTasks: number, retryCounts: {...}, lastRecovery: timestamp }`.
2. Tasks in `in_progress` for >10min are detected and marked `stalled` by a periodic health check.
3. Failed tasks are retried up to 2 times with exponential backoff (1s, 2s, 4s) before becoming `blocked`.
4. Circuit breaker opens after 3 failures in 5min for a given agent; tasks are rerouted or queued.
5. Circuit breaker can be reset via `POST /api/orchestrator/circuit-breaker/:agent/reset`.
6. Stalled tasks can be force-retried via `POST /api/orchestrator/stalled/:taskId/retry`.
7. All recovery events are stored in a `recovery_log` Convex table with structured fields.
8. ≥80% test coverage on new code; existing tests continue to pass.

## Out of Scope

- AI-driven root cause analysis for failures (Phase 8 AI Retrospective Engine).
- Cross-instance circuit breaker state sharing (Phase 7 Multi-tenancy).
- Predictive failure detection based on historical patterns (Phase 8 Adaptive Dispatching).

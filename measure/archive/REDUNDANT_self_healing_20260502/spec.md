# Self-Healing System

## Overview

Automatic detection and recovery from common failure modes: stalled agents, failed tasks, and persistent issues. Integrates with existing circuit breaker infrastructure to add proactive self-healing capabilities.

## Functional Requirements

1. **Stalled Agent Detection**
   - Detect tasks running longer than configurable timeout with no output updates
   - Convex-side checks: query tasks with status=in_progress, last update > timeout
   - Configurable per-project timeout (default 10min, min 1min, max 60min)
   - Stalled tasks transitioned to failed status with "stalled" reason

2. **Auto-Retry with Exponential Backoff**
   - Failed tasks eligible for retry up to configurable max retries (default 3)
   - Backoff schedule: 30s, 2min, 8min, 30min (exponential with cap)
   - Retry only transient failures (stalled, timeout, connection error); skip validation errors
   - Retry count and history tracked on task record

3. **Circuit Breaker Auto-Reset**
   - Extend existing circuit breaker: auto-reset after cooldown period (default 5min)
   - Half-open state: allow one test dispatch before fully reopening
   - Log all state transitions to circuitBreakers table
   - Configurable cooldown per agent/harness

4. **Automatic Issue Creation**
   - Create issue record for tasks that exhaust retries
   - Issue includes: task context, failure history, last error, agent info
   - Link issue to parent task and track
   - Notification hook for issue creation (future integration point)

5. **Health Check Auto-Restart**
   - Periodic health check of orchestrator process
   - If orchestrator unresponsive for >2× interval, attempt restart
   - Restart counter with circuit breaker (max 3 restarts in 10min)

## Data Sources

- `tasks` — status, retryCount, lastError, stalledTimeout
- `circuitBreakers` — state, cooldown, lastTransition
- `recoveryLog` (new) — recovery actions, timestamps, outcomes
- `issues` — auto-created issues for persistent failures
- `executionLogs` — health check events

## Acceptance Criteria

- [ ] Stalled tasks detected within 1 interval cycle of timeout expiry
- [ ] Failed tasks auto-retried with correct backoff timing
- [ ] Circuit breaker auto-resets after cooldown; half-open state tested
- [ ] Issues auto-created for tasks exhausting all retries
- [ ] Recovery actions logged to recoveryLog table
- [ ] Health check detects unresponsive orchestrator and restarts
- [ ] All retry/health behavior configurable per project

## Out of Scope

- Self-healing for Convex infrastructure failures
- Automatic code fixes or patch generation
- Cross-project failure correlation
- Predictive failure prevention

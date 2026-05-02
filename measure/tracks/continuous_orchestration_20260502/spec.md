# Continuous Orchestration

## Overview

Autonomous orchestrator loop that runs on a configurable interval, maintains a ready queue of eligible tasks, detects idle periods, and handles graceful shutdown. Eliminates the need for manual dispatch triggers.

## Functional Requirements

1. **Interval Scheduler**
   - Configurable dispatch interval (default 60s, min 10s, max 600s)
   - Start/stop/pause controls exposed via orchestrator API and UI
   - Interval persisted in orchestrator config, survives restart
   - Timer resets on each cycle completion (not fixed-rate)

2. **Queue Management**
   - Ready queue: pre-filter tasks eligible for dispatch before scoring
   - Eligibility check: status=pending, no active blockers, agent available
   - Queue refreshed each cycle; stale entries evicted
   - Queue depth exposed as metric for observability

3. **Idle Detection**
   - Detect when no eligible tasks exist across all projects
   - Enter idle state: reduce polling frequency (5× interval) or pause
   - Resume immediately on new task creation or status change
   - Log idle/resume transitions to executionLogs

4. **Graceful Shutdown**
   - Handle SIGTERM/SIGINT: finish current cycle, then stop
   - In-flight tasks marked for handoff (not abandoned)
   - Configurable drain timeout (max wait for in-flight completion)
   - Shutdown event logged

## Data Sources

- `tasks` — status, blockers, eligibility
- `orchestratorConfig` (new) — interval, state, idle thresholds
- `executionLogs` — cycle events, idle transitions, shutdown events
- `agents` — availability for eligibility checks

## Acceptance Criteria

- [ ] Orchestrator cycles at configured interval without manual intervention
- [ ] Queue pre-filters to only eligible tasks before scoring
- [ ] Idle state triggers when no eligible tasks; resumes on new task availability
- [ ] SIGTERM causes graceful shutdown within drain timeout
- [ ] Start/stop/pause controls work from API and UI
- [ ] Interval persists across process restarts
- [ ] All state transitions logged to executionLogs

## Out of Scope

- Distributed orchestration (multi-instance coordination)
- Priority queue with weighted fair scheduling
- Dynamic interval adjustment based on load
- Webhook-triggered dispatch (future track)

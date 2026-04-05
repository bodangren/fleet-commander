# Specification - Continuous Orchestration Mode

## Overview

Enable the Bun orchestrator to run autonomously on a configurable interval, automatically discovering ready tasks, dispatching them to agents, and managing execution without manual intervention. Includes idle detection to avoid unnecessary cycles when no work is available, and a queue management system to handle task ordering and concurrency.

## Functional Requirements

- **FR1:** Orchestrator runs on a configurable interval (default: 60 seconds) when "continuous mode" is enabled.
- **FR2:** Idle detection: skip execution cycles when no tasks are in `todo` or `in_progress` state.
- **FR3:** Queue management: tasks are dispatched in priority order (critical > high > medium > low), with FIFO tie-breaking.
- **FR4:** Concurrency limit: configurable max concurrent agent executions (default: 1 to start, safe for local-first).
- **FR5:** Auto-pause: orchestrator pauses when an agent execution fails consecutively 3 times, requiring manual review.
- **FR6:** Status reporting: continuous mode state (running/paused/idle) is queryable via API and visible in dashboard.
- **FR7:** Manual override: user can pause/resume continuous mode at any time via API or UI toggle.

## Acceptance Criteria

1. Continuous mode can be enabled/disabled via a Convex mutation (`setContinuousMode`).
2. Interval is configurable via Convex settings (stored in `settings` table, key `orchestratorIntervalMs`, default 60000).
3. Orchestrator loop checks for idle state (no ready tasks) and logs "idle — skipping cycle" without dispatching.
4. Tasks are dispatched in priority order; verified by test with multiple ready tasks of different priorities.
5. Concurrency limit is respected: if max agents are running, new tasks wait in queue.
6. After 3 consecutive failures, continuous mode auto-pauses and creates a system alert issue.
7. `GET /api/orchestrator/status` returns `{ mode: "continuous" | "manual", state: "running" | "paused" | "idle", activeExecutions: number, queuedTasks: number }`.
8. `POST /api/orchestrator/pause` and `POST /api/orchestrator/resume` toggle continuous mode state.
9. All new code has ≥80% test coverage; existing tests continue to pass.

## Out of Scope

- Multi-agent parallel execution beyond concurrency limit of 1 (Phase 7 Workload Balancer).
- Remote/distributed queue (Phase 10 Enterprise).
- AI-driven adaptive interval adjustment (Phase 8 Adaptive Dispatching).
- UI toggle component for continuous mode (frontend integration in later phase).

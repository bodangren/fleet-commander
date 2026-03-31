# Specification - Task Estimation & Complexity Scoring

## Overview

Tasks in the current system have no estimation metadata — the `Task` struct in `internal/models/project.go` contains Title, Status, Description, AgentTag, and SubTasks but no estimate field. This track adds estimation support (story points or t-shirt sizes), AI-suggested estimates based on spec analysis, accuracy tracking comparing predicted vs actual effort, and integration with the dispatcher scoring to prefer tasks that fit available time. An estimation dashboard surfaces accuracy trends.

## Functional Requirements

- **FR1**: Add estimation field to the task model — support both story points (1/2/3/5/8/13) and t-shirt sizes (XS/S/M/L/XL) with numeric equivalents.
- **FR2**: AI-suggested estimates — analyze task description, subtask count, and historical completion data to suggest an estimate via LLM.
- **FR3**: Estimate accuracy tracking — record predicted estimate and actual completion time, compute accuracy ratio per task and aggregated.
- **FR4**: Feed estimates into dispatcher scoring — tasks with estimates matching available agent time window receive a score boost in `Rank`.
- **FR5**: Estimation dashboard — display accuracy trends (predicted vs actual over time), per-agent accuracy, and estimate distribution.

## Acceptance Criteria

1. `Task` struct includes `Estimate` field (nullable — tasks without estimates are valid).
2. `PUT /api/projects/:id/tasks/:tid/estimate` sets the estimate; response includes the estimate value.
3. `POST /api/projects/:id/tasks/:tid/estimate/suggest` returns an AI-suggested estimate with reasoning.
4. On task completion, actual duration is recorded and accuracy ratio (actual/predicted) is stored.
5. Dispatcher `Rank` boosts tasks whose estimate fits within a configurable time window.
6. Estimation dashboard shows: accuracy trend line, average accuracy ratio, estimate distribution histogram.
7. Existing tests pass without modification (estimate field is additive/optional).

## Out of Scope

- Team capacity planning or resource allocation.
- Estimation calibration workshops or gamification.
- Importing estimates from external tools (Jira, Linear).
- Per-assignee estimate adjustments.

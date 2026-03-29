# Specification - LLM Dispatcher Integration

## Overview

Wire the fully-implemented `internal/dispatcher/` package into the main HTTP server and orchestrator loop. The dispatcher provides LLM-scored task ranking with priority fallback, but currently has no routes registered in `main.go` and the orchestrator still uses the simple `GetBestTask` function. This track connects the pieces so tasks are dispatched by intelligent scoring and the dashboard can query candidates.

## Functional Requirements

- **FR1**: Register dispatcher HTTP routes in `main.go` — `GET /api/projects/{id}/next-task` and `GET /api/projects/{id}/candidates` — delegating to the existing `HandleGetNextTask` and `HandleGetCandidates` handlers.
- **FR2**: Replace the `GetBestTask` call in `internal/orchestrator/evaluator.go` with the dispatcher's `Rank` pipeline so that `Run()` selects tasks via LLM scoring (or priority fallback) instead of the naive selector.
- **FR3**: Add configuration (env var or config file) to select the scorer mode: `llm` (default) or `priority` fallback, passed through to the dispatcher at initialization.
- **FR4**: Expose the scoring rationale (rank score, reason, scorer used) on each candidate task so the frontend dashboard can display why a task was chosen or skipped.

## Acceptance Criteria

1. `GET /api/projects/{id}/next-task` returns the highest-ranked pending task with a 200 response and includes `score`, `reason`, and `scorer` fields.
2. `GET /api/projects/{id}/candidates` returns all candidate tasks sorted by descending rank score.
3. `main.go` registers both routes with the correct project ID path parameter and middleware.
4. `orchestrator.Run()` calls the dispatcher rank pipeline and logs the selected task's rationale.
5. Setting `DISPATCHER_SCORER=priority` disables LLM scorer and uses `PriorityScorer` only.
6. Existing `internal/dispatcher/` tests continue to pass with no modifications.
7. An integration test covers the route registration and end-to-end candidate retrieval.

## Out of Scope

- Changes to the LLMScorer, Rank, or caching logic (already complete).
- Frontend rendering of scoring rationale (deferred to a separate UI track).
- Authentication or authorization on the new endpoints.

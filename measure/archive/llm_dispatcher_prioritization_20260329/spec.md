# Specification - LLM Dispatcher (Prioritization Engine)

## Overview

The LLM Dispatcher is the "brain" of the orchestration system. It evaluates all pending tasks and open issues, ranks them using LLM-based scoring, and selects the single best task for execution. This enforces the core constraint: only one task executes per orchestrator run.

## Functional Requirements

### FR1: Task Aggregation
- Retrieve all pending tasks from the task store (plan.md files with `[ ]` markers)
- Retrieve all open issues from the issue broker (markdown files in measure/issues/)
- Merge into a unified candidate pool for scoring

### FR2: LLM-Based Scoring
- Use a lightweight LLM to score each candidate task
- Input to LLM: task description, priority hints, related issues, agent personas available
- Output: numerical score (1-10) and brief rationale
- Support configurable scoring prompt template

### FR3: Ranking Algorithm
- Combine LLM scores with structural signals:
  - Task age: older tasks get +1 boost per day (max +3)
  - Dependency readiness: tasks with satisfied dependencies rank higher
  - Persona match: tasks matching capable agents get +1
- Output: ranked list of candidates with scores

### FR4: Single Task Selection
- Select top-ranked task as the single "next task"
- Return task details: ID, title, assigned persona, estimated cost
- Handle edge case: no valid candidates (return empty with reason)

### FR5: REST API Endpoint
- `GET /api/dispatcher/next` - Returns the next recommended task
- `GET /api/dispatcher/candidates` - Returns ranked candidate list
- Dashboard can poll this to populate "Next Task" display

## Non-Functional Requirements

### NFR1: Performance
- Dispatcher must respond within 2 seconds for typical workspace (50 tasks, 10 issues)
- Use hybrid cache: compute scores on-demand, cache for 30 seconds

### NFR2: Observability
- Log all scoring decisions with input summary and LLM response
- Track dispatch history for later analysis

### NFR3: Fallback
- If LLM unavailable, fall back to simple priority-based ranking (no score boost)

## Acceptance Criteria

1. `GET /api/dispatcher/next` returns a task object with id, title, and assigned persona
2. `GET /api/dispatcher/candidates` returns ranked list of at least 3 candidates
3. Dispatcher considers both pending tasks and open issues
4. Scoring uses LLM when available, falls back to simple ranking otherwise
5. Response time < 2s for workspaces with up to 50 tasks
6. All scoring decisions are logged

## Out of Scope

- Scheduling daemon integration (runs periodically)
- Budget enforcement logic (tracked separately)
- Dashboard UI integration (tracked separately)
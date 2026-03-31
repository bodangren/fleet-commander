# Specification - Execution Logging

## Overview

Execution Logging provides full traceability of all orchestrator decisions, agent executions, inputs, and outputs. Logs are stored persistently and displayed in the dashboard for analysis.

## Functional Requirements

### FR1: Log Recording
- Record every dispatch decision with input summary
- Record LLM prompt and response for scoring
- Record agent execution: task, persona, harness, command, output
- Record completion status with duration

### FR2: Log Storage
- Store in conductor/logs/{project_id}/YYYY-MM-DD.jsonl
- Each line is a JSON record with timestamp, type, data
- Retain logs for 30 days (configurable)

### FR3: Log API
- List execution logs by project and date
- Filter by agent, task status, date range
- Get aggregated statistics: success rate, avg duration

### FR4: Log Dashboard
- Timeline view of executions
- Expandable details per execution
- Export to CSV

## Acceptance Criteria

1. All dispatch decisions logged with scores
2. Agent executions logged with full command/response
3. GET /api/projects/{id}/logs returns paginated results
4. Dashboard shows timeline and stats
5. Logs persist for configured retention period

## Out of Scope

- Log analysis/insights (AI-generated summaries) - tracked separately
- Log alerting (on patterns) - tracked separately
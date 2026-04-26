# Specification - Execution Logging Endpoints & Hooks

## Overview

Complete the execution logging system by hooking into orchestrator/dispatcher, adding API endpoints, and creating frontend views.

## Functional Requirements

### FR1: Hook Into Orchestrator
- Record dispatch decisions in Dispatcher with scores
- Record scoring input/output in Scorer
- Record execution start/complete in Runner

### FR2: API Endpoints
- GET /api/projects/{id}/logs - list recent log entries
- GET /api/projects/{id}/logs/stats - aggregated stats (success rate, avg duration)
- GET /api/projects/{id}/logs/export - CSV export

### FR3: Frontend Views
- LogTimelineView: timeline of executions
- LogStatsView: success rate, avg duration, per-agent breakdown

## Acceptance Criteria

1. All dispatch/scoring/execution events recorded to JSONL files
2. API returns paginated logs with stats
3. Frontend shows timeline and stats

## Out of Scope

- Log analysis/AI summaries (tracked separately)
- Log alerting (tracked separately)
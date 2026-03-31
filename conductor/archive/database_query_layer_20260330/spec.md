# Specification - Database Query Layer for Dashboard

## Overview

Build a set of optimized SQLite-backed API endpoints that power the Fleet Commander dashboard with real-time execution statistics, agent utilization metrics, issue resolution analytics, and task completion velocity. Replace the current on-the-fly JSONL file scanning with indexed SQLite queries for sub-second response times.

## Functional Requirements

- **FR1:** Cross-project execution stats API (`GET /api/stats/overview`) returning total tasks, active agents, completion rate, and open issues across all projects.
- **FR2:** Agent utilization metrics showing percentage of time each agent spent executing tasks versus idle, broken down per project and globally.
- **FR3:** Issue resolution time analytics reporting average, median, and P95 time from issue creation to resolution.
- **FR4:** Task completion velocity computed as tasks completed per day and per week, with a configurable rolling window.
- **FR5:** All queries backed by proper SQLite indexes on frequently filtered columns (agent name, status, timestamps, project ID).
- **FR6:** Dashboard overview page displays overview stats, utilization chart, velocity trend, and resolution time summary in a single view.

## Acceptance Criteria

1. `GET /api/stats/overview` returns a JSON object with `total_projects`, `total_tasks`, `completed_tasks`, `active_agents`, and `open_issues` fields in under 100ms on a database with 10k log entries.
2. `GET /api/stats/agents` returns per-agent utilization percentage, total executions, and idle time for a given date range.
3. `GET /api/stats/issues` returns average resolution time in hours, count of resolved issues, and count of currently open issues.
4. `GET /api/stats/velocity` returns daily and weekly task completion counts for the last 30 days.
5. SQLite EXPLAIN QUERY PLAN confirms all stat queries use index scans, not full table scans.
6. Dashboard overview page renders all four metric sections with live data from the API.

## Out of Scope

- Real-time WebSocket streaming of stats (future track).
- Custom user-defined dashboard widgets or configurable layouts.
- Historical trend charting beyond 90-day window.
- Export of stats to CSV/PDF.

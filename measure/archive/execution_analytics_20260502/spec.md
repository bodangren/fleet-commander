# Execution Analytics Dashboard

## Overview

Rich analytics dashboard providing visibility into fleet execution patterns, agent utilization, and system bottlenecks. Transforms raw executionLog, workRun, and task data into actionable charts and metrics.

## Functional Requirements

1. **Task Completion Trends**
   - Line chart showing tasks completed per day/week over configurable time range
   - Breakdown by project, track, and agent
   - Overlay of planned vs. completed (velocity)

2. **Agent Utilization Heatmap**
   - Heatmap grid: agents × time periods
   - Color intensity = number of active/completed tasks
   - Identifies overutilized and idle agents

3. **Bottleneck Identification**
   - Bar chart ranking tracks/projects by average task duration and failure rate
   - Highlight stalled tracks (no progress in N days)
   - Identify tasks stuck in retry loops

4. **Queue Depth Over Time**
   - Area chart of pending/queued tasks at each time point
   - Correlate with agent availability and dispatch rate

5. **Time Range Controls**
   - Preset ranges: 7d, 30d, 90d
   - Custom date picker
   - Real-time refresh toggle (poll every 30s)

## Data Sources

- `executionLogs` — execution events, timestamps, durations
- `workRuns` — agent work outcomes, timing
- `tasks` — status, assignments, completion timestamps
- `agents` — current state, circuit breaker status

## Acceptance Criteria

- [ ] Charts render within 2s for 90-day range with >10k records
- [ ] All four chart types (line, heatmap, bar, area) functional
- [ ] Time range selector updates all charts simultaneously
- [ ] Data refreshes without full page reload
- [ ] Dashboard accessible from main nav sidebar
- [ ] Responsive layout (works on 1280px+ screens)

## Out of Scope

- Real-time streaming dashboards (WebSocket live updates)
- Export to PDF/CSV (future track)
- Custom user-defined chart builder
- Predictive analytics / forecasting

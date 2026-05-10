# Cost Tracking

## Overview

Track LLM API costs across the fleet at granular levels (agent, project, sprint). Store cost data alongside execution records, provide budget enforcement with threshold alerts, and surface cost-per-task metrics for operational visibility.

## Functional Requirements

1. **Cost Data Model**
   - New `costRecords` table: `{ agentId, projectId, sprintId, taskId, model, inputTokens, outputTokens, costUSD, recordedAt }`
   - Add cost fields to `runContracts`: `estimatedCost`, `actualCost`, `tokenBreakdown`
   - Capture token counts from harness execution responses

2. **Budget Management**
   - New `budgets` table: `{ projectId?, agentId?, limitUSD, period (daily/weekly/monthly), spentUSD, alertThreshold (0-1) }`
   - Budget check before dispatching tasks (soft warn, hard block modes)
   - Automatic budget reset on period boundary

3. **Budget Alerts**
   - Alert when spend exceeds threshold (e.g., 80% of budget)
   - Alert when projected spend will exceed budget before period end
   - Alerts feed into notification system

4. **Cost Dashboard**
   - Per-agent cost breakdown (pie chart)
   - Per-project cost breakdown (stacked bar)
   - Per-sprint cost trend (line chart)
   - Cost-per-task metric (total cost / completed tasks)
   - Budget utilization gauge

## Data Sources

- `runContracts` — execution records with token usage
- `executionLogs` — event timestamps for duration correlation
- New `costRecords` table
- New `budgets` table

## Acceptance Criteria

- [ ] Cost recorded for every harness execution with token usage
- [ ] Budget alerts fire within 1 minute of threshold breach
- [ ] Dashboard shows accurate cost breakdown by agent/project/sprint
- [ ] Cost-per-task metric calculated correctly
- [ ] Budget soft-warn logs a warning; hard-block prevents dispatch
- [ ] Historical cost data retained for 90 days minimum

## Out of Scope

- Multi-currency support (USD only)
- Invoice generation or billing integration
- Cost optimization recommendations (future track)
- Third-party cost API integration (manual rate configuration)

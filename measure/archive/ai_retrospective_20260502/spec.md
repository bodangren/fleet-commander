# AI Retrospective

## Overview

Automated end-of-sprint analysis powered by LLM. Aggregates sprint data (completed tasks, blockers, failures, agent performance, issue patterns) and generates a structured markdown report with actionable insights.

## Functional Requirements

1. **Sprint Data Aggregation**
   - Collect from sprint: tasks completed, blocked, failed, carried over
   - Agent workload distribution (tasks per agent, time per task)
   - Issue patterns (common error types, recurring blockers)
   - Velocity metrics (planned vs. completed, sprint-over-sprint trend)

2. **LLM Analysis & Report Generation**
   - Feed aggregated data into LLM with structured prompt
   - Generate markdown report containing:
     - **Sprint summary** (high-level metrics)
     - **Patterns detected** (recurring issues, bottlenecks)
     - **Top blockers** (what stalled progress)
     - **Improvement suggestions** (actionable recommendations)
     - **Agent workload balance** (utilization fairness, rebalancing tips)
   - Report saved to Convex (new `retrospectives` table)

3. **Scheduling & Output**
   - Trigger on sprint completion (manual or auto)
   - Schedule as weekly cron job (configurable day/time)
   - Report accessible from dashboard (retrospective viewer)
   - Optional: post report to webhook / notification channel

## Data Sources

- `sprints` — sprint metadata, date ranges
- `tasks` — completion status, assignments, timestamps
- `workRuns` — agent execution details
- `issues` — bug/blocker data
- `agents` — agent performance stats
- `executionLogs` — error patterns

## Acceptance Criteria

- [ ] Retrospective generates within 60s of trigger
- [ ] Report includes all five required sections
- [ ] Suggestions are specific and actionable (not generic filler)
- [ ] Reports saved and retrievable from dashboard
- [ ] Weekly schedule fires at configured time
- [ ] Report quality validated on 3 consecutive sprints

## Out of Scope

- Real-time continuous retrospectives (only end-of-sprint)
- Interactive Q&A with the AI about sprint data
- Automatic action execution based on suggestions
- Multi-team / cross-project retrospective aggregation

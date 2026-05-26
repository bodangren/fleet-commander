# Spec: Sprint Retrospective Dashboard

## Problem
When sprints complete, users have no structured view of what happened. Cost data is scattered, rejection reasons are not aggregated, and trends are invisible.

## Solution
A dedicated retrospective page for each completed sprint showing: budget burndown chart, task completion rate, agent performance breakdown, rejection reasons, cost/point trend, and automated insights.

## Acceptance Criteria
- [ ] New "Retrospective" tab on the sprint detail page (visible only for completed sprints)
- [ ] Budget burndown: actual vs estimated spend over time
- [ ] Task breakdown: completed, rejected, blocked counts per agent
- [ ] Rejection reasons: frequency histogram from reviewer feedback
- [ ] Cost/point trend: compare to previous sprints for the same project
- [ ] Auto-generated insight bullets (e.g., "Agent X had 3× rejection rate on TypeScript tasks")
- [ ] Export retrospective as Markdown for external documentation

## Out of Scope
- Predictive recommendations for next sprint
- Team sentiment analysis
- Integration with external retro tools

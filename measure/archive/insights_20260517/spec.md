# Specification: Insights

## Overview

Build the analytics, performance, and cost insight views with sprint velocity, agent reliability, and cost/point trends.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Analytics, Performance, Costs views (sidebar → Insights)
- **Product Definition**: `measure/product.md` — Dashboard Views, Cost Model
- **Design System**: `DESIGN.md` — Linear design tokens for charts and tables

## Views

### Analytics View

- Sprint velocity trend (points delivered + cost/point over time)
- Budget utilization (estimated vs actual per sprint)
- Sprint history table with cost accuracy metrics

### Performance View

- Agent reliability leaderboard (success rate, rejection rate, cost/point, trend)
- Cost by pipeline stage (architect, executor, reviewer, merger, retries)
- Rejection reasons breakdown

### Costs View

- Cost per point trend with target line
- Agent cost efficiency table (points, total cost, cost/point, reliability, value score)
- ROI summary (cost/point, points/dollar, estimated project cost)
- Cost optimization opportunities

## Requirements

### R1: Analytics

- Query sprint history for velocity data
- Calculate cost/point per sprint
- Show budget accuracy (estimated vs actual)
- Display sprint history table

### R2: Performance

- Calculate agent reliability metrics
- Track rejection reasons
- Show cost breakdown by pipeline stage
- Display agent leaderboard

### R3: Costs

- Track cost per point over time
- Calculate ROI metrics
- Show agent cost comparison
- Identify optimization opportunities

## Acceptance Criteria

- [ ] Analytics shows sprint velocity trends
- [ ] Performance shows agent reliability
- [ ] Costs shows cost/point trends
- [ ] All charts render correctly
- [ ] Tables sort and filter
- [ ] Data updates with new sprints

# Specification: History

## Overview

Build the sprint, agent, and task history views with performance trends and model change tracking.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Sprints, Agents, Tasks views (sidebar → History)
- **Product Definition**: `measure/product.md` — Dashboard Views
- **Design System**: `DESIGN.md` — Linear design tokens for history UI

## Views

### Sprints View

- Sprint history table with metrics
- Velocity trend chart
- Click into sprint for retrospective

### Agents View

- Agent performance history table
- Model change history
- Cost trend chart per agent

### Tasks View

- Searchable task list with filters
- Full task details (sprint, points, agents, cost, status)
- Timeline link for each task

## Requirements

### R1: Sprint History

- Query all past sprints
- Calculate velocity trends
- Show cost accuracy per sprint
- Enable sprint drill-down

### R2: Agent History

- Track agent performance over time
- Record model changes
- Calculate cost trends
- Show reliability trends

### R3: Task History

- Query all tasks with filters
- Show full lifecycle details
- Link to task timeline
- Enable search and filtering

## Acceptance Criteria

- [ ] Sprint history shows all past sprints
- [ ] Agent history shows performance trends
- [ ] Task history is searchable and filterable
- [ ] All tables sort correctly
- [ ] Charts render historical data
- [ ] Click-through works to details

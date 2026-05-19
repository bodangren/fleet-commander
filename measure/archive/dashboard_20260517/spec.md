# Specification: Dashboard

## Overview

Build the morning standup dashboard showing current sprint status, key metrics, agent activity, and attention items.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Dashboard view (sidebar → Overview → Dashboard)
- **Product Definition**: `measure/product.md` — Dashboard Views, Cost Model
- **Design System**: `DESIGN.md` — Linear design tokens for dashboard UI

## UI Layout (from mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ Sprint 14 · Active · $32.40 / $50.00                       │
│ Fleet Commander MVP · 18 story points                       │
├─────────────────────────────────────────────────────────────┤
│ Points: 12/18 │ Cost/Point: $1.80 │ Tasks: 12/18 │ Budget: $17.60│
├─────────────────────────────────────────────────────────────┤
│ Key Metrics                    │ Agent Status               │
│ Delivery Rate: 0.56 pts/$      │ @alice · Active · Auth middleware│
│ Success Rate: 92%              │ @bob · Active · Employee roster│
│ Pipeline Time: 8m 32s          │ @carol · Active · CI pipeline│
│ Rejection Rate: 8%             │ @dave · Blocked · Waiting for @bob│
├─────────────────────────────────────────────────────────────┤
│ Attention Needed                   │ Recent Activity        │
│ ⚠ 2 tasks blocked                  │ ✓ @bob merged CI pipeline│
│ ⚠ Budget at 65%                    │ → @carol reviewing auth│
│ ◎ A/B test running                 │ ⊘ @bob blocked on DB   │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

### R1: Current Sprint Status

- Sprint name and status badge
- Budget: actual / estimated
- Progress bar showing budget spent
- Key stats: points delivered, cost/point, tasks complete, budget remaining

### R2: Key Metrics

- Delivery rate (points per dollar)
- Success rate (first-pass completion)
- Average pipeline time
- Rejection rate

### R3: Agent Status

- List of agents with current status
- Show what each agent is working on
- Status badges: Active, Idle, Blocked
- Quick link to full agent view

### R4: Attention Needed

- Blockers (tasks waiting)
- Budget warnings (over 80% spent)
- Active A/B tests
- Recent alerts

### R5: Recent Activity

- Latest events with agent, task, cost, timestamp
- Color-coded by event type
- Scrollable activity feed

## Acceptance Criteria

- [x] Current sprint status shows budget and progress
- [x] Key metrics display correctly
- [x] Agent status shows current activity
- [x] Attention items highlight what needs action
- [x] Recent activity shows latest events
- [~] All data updates in realtime (REST API via refresh; no Convex realtime subscriptions — deviation from spec)

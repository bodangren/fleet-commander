# Specification: Sprint Planning

## Overview

Build the budget-based sprint planning interface where the PM agent recommends tasks, estimates costs, and the human sets the budget and triggers the sprint.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Sprint Planning view (sidebar → Work → Sprint Planning)
- **Product Definition**: `measure/product.md` — Sprint Planning section, Cost Model, Budget concept
- **Design System**: `DESIGN.md` — Linear design tokens for planning UI

## UI Layout (from mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ Sprint Planning                                              │
│ PM Agent recommends tasks · You set the budget · Then trigger│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐            │
│ │ Project             │ │ Budget              │            │
│ │ [Fleet Commander ▾] │ │ $ [50.00]           │            │
│ │                     │ │                     │            │
│ │ Backlog: 24 tasks   │ │ Avg Cost/Point: $2.53│           │
│ │ Total: 68 pts       │ │ Max Points: 19      │            │
│ └─────────────────────┘ └─────────────────────┘            │
├─────────────────────────────────────────────────────────────┤
│ ┌ PM Agent Recommendation ─────────────────────────────────┐│
│ │ Recommended: 18 pts, 5 tasks, $45.60 (9% buffer)        ││
│ │ @alice for architecture (5pts @ $4.20/pt)                ││
│ │ @bob for backend (8pts @ $2.10/pt)                       ││
│ └──────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Task Selection                                               │
│ ☑ Implement auth middleware    5 pts  @alice  $4.20  $21.00 │
│ ☑ Build employee roster page   3 pts  @bob    $2.10  $6.30  │
│ ☑ Setup CI pipeline            5 pts  @bob    $2.10  $10.50 │
│ ☑ Add error handling           3 pts  @carol  $1.80  $5.40  │
│ ☑ Write API documentation      2 pts  @frank  $1.20  $2.40  │
├─────────────────────────────────────────────────────────────┤
│ Agent Cost Breakdown                                         │
│ @alice: 5 pts · $4.20/pt · $21.00                           │
│ @bob:   8 pts · $2.10/pt · $16.80                           │
│ @carol: 3 pts · $1.80/pt · $5.40                            │
│ @frank: 2 pts · $1.20/pt · $2.40                            │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

### R1: PM Agent Recommendation

The PM agent analyzes:
- Backlog tasks with story points
- Agent availability and cost profiles
- Historical cost data
- Sprint priority

And recommends:
- Which tasks to include
- Which agent to assign
- Estimated cost per task
- Total estimated cost
- Budget recommendation

### R2: Task Selection Interface

Human can:
- Select/deselect tasks from the recommendation
- See story points, assigned agent, cost/point, estimated cost
- See priority badge
- Adjust selections

### R3: Budget Input

Human can:
- Set sprint budget in dollars
- See avg cost/point for context
- See max points affordable at current rates
- System calculates recommended budget from task selection

### R4: Agent Cost Breakdown

Shows per-agent load for this sprint:
- Agent name and role
- Total points assigned
- Cost/point
- Total estimated cost

### R5: Sprint Creation

On "Start Sprint":
- Create sprint record with budget
- Move selected tasks to Ready
- Set sprint status to Active
- Record estimated costs for comparison

## Acceptance Criteria

- [ ] PM agent recommends tasks based on priority and cost
- [ ] Task selection table shows points, agent, cost/point, estimated cost
- [ ] Budget input with recommended amount
- [ ] Agent cost breakdown shows per-agent load
- [ ] Sprint created with budget on "Start Sprint"
- [ ] Tasks moved to Ready on sprint creation
- [ ] Estimated costs recorded for comparison

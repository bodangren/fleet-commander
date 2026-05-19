# Specification: Kanban Board

## Overview

Build the main Kanban board with cost-based columns, budget tracking, story points per card, and drag-and-drop functionality.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Project Board view (sidebar → Work → Project Board)
- **Product Definition**: `measure/product.md` — Kanban Columns, Cost Model, Sprint concept
- **Design System**: `DESIGN.md` — Linear design tokens for board UI

## UI Layout (from mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ Project: [Fleet Commander ▾]  Sprint: [Sprint 14]           │
├─────────────────────────────────────────────────────────────┤
│ Sprint 14 · Active · $32.40 / $50.00 · 18 pts              │
│ ████████████████████████░░░░░░░░░ 65% spent                 │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ Backlog  │ │ Ready    │ │In Progress│ │For Review│       │
│ │ 3 tasks  │ │ 2 tasks  │ │ 3 tasks  │ │ 1 task   │       │
│ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤       │
│ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │       │
│ │ │Task 1│ │ │ │Task 3│ │ │ │Task 5│ │ │ │Task 8│ │       │
│ │ │2 pts │ │ │ │5 pts │ │ │ │EXECUT│ │ │ │REVIEW│ │       │
│ │ │$3.60 │ │ │ │$21.00│ │ │ │$6.30 │ │ │ │$8.40 │ │       │
│ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │       │
│ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ └──────────┘       │
│ │ │Task 2│ │ │ │Task 4│ │ │ │Task 6│ │                     │
│ │ │2 pts │ │ │ │3 pts │ │ │ │BLOCKE│ │                     │
│ │ │$2.40 │ │ │ │$6.30 │ │ │ │$10.50│ │                     │
│ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │                     │
│ └──────────┘ └──────────┘ └──────────┘                     │
│ ┌──────────┐                                               │
│ │ Merged   │                                               │
│ │ 4 tasks  │                                               │
│ ├──────────┤                                               │
│ │ ┌──────┐ │                                               │
│ │ │Task 9│ │                                               │
│ │ │3 pts │ │                                               │
│ │ │$5.40 │ │                                               │
│ │ └──────┘ │                                               │
│ └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## Columns

| Column | Meaning | Card Style |
|--------|---------|------------|
| **Backlog** | Not in current sprint | Default |
| **Ready** | In sprint, waiting for scheduler | Default |
| **In Progress** | Agent actively working | Left border: blue (active) or yellow (blocked) |
| **For Review** | Work complete, awaiting review | Left border: green |
| **Merged** | Approved and merged | Opacity: 0.6 |

## Card Design

Each card shows:
- **Title**: Task name
- **Story Points**: "2 pts · est. $3.60"
- **Pipeline Stage Badge**: DISPATCH / ARCHITECT / EXECUTE / REVIEW
- **Agent**: Assigned agent name
- **Duration**: Time in current stage (for In Progress)
- **Priority Badge**: low / med / high
- **Blocked Tag**: When task is blocked (yellow border + BLOCKED badge)

## Requirements

### R1: Board Layout

- 5 columns in a grid layout
- Each column has header with title and task count
- Columns scroll independently if many tasks
- Responsive: stacks on mobile

### R2: Task Cards

- Display story points and estimated cost
- Show pipeline stage badge for In Progress tasks
- Show assigned agent
- Show duration for active tasks
- Show priority badge
- Show blocked tag when applicable

### R3: Sprint Info Bar

- Sprint name and status
- Budget: actual / estimated
- Progress bar showing budget spent
- Cost/point comparison (actual vs estimated)

### R4: Drag and Drop

- Drag tasks between columns
- Update task status on drop
- Validate column transitions (can't drag from Backlog to Merged directly)
- Optimistic UI updates

### R5: Project & Sprint Selectors

- Project dropdown to switch projects
- Sprint chips to switch between sprints
- "Set Active" button for planned sprints
- "Close Sprint" button for active sprints

## Acceptance Criteria

- [x] 5 columns render correctly
- [x] Task cards show all required info (duration for active tasks not shown; see TD-125)
- [x] Sprint info bar shows budget and progress (cost/point comparison not shown; see TD-125)
- [x] Drag and drop works between columns
- [x] Project and sprint selectors work
- [x] Blocked tasks show yellow border and tag
- [x] Merged tasks show reduced opacity
- [x] Responsive layout works

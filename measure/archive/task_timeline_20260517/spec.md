# Specification: Task Timeline

## Overview

Build the 5-stage pipeline visualization for individual tasks, showing the agent chain and execution logs.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Task Timeline view (sidebar → Work → Task Timeline)
- **Product Definition**: `measure/product.md` — Pipeline concept, Agent Roles
- **Design System**: `DESIGN.md` — Linear design tokens for timeline UI

## UI Layout (from mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ Task Timeline                                                │
│ Build employee roster page                                   │
├─────────────────────────────────────────────────────────────┤
│ Assignee: @bob (Backend Lead) · Priority: High · Sprint 14  │
├─────────────────────────────────────────────────────────────┤
│ [Dispatch]→[Architect]→[Executor]→[Reviewer]→[Merger]      │
│  System    @alice     @bob       @carol     @alice          │
│  0:12 ✓    1:34 ✓     Running    Pending    Pending         │
├─────────────────────────────────────────────────────────────┤
│ Agent Chain                                                  │
│ [Sys]→[AL Architect ✓]→[BO Executor Running]→[CA Review]→[AL Merge]│
├─────────────────────────────────────────────────────────────┤
│ Execution Log                                                │
│ [14:32:01] Task dispatched by System                        │
│ [14:32:03] @alice (Architect) reading task spec...          │
│ [14:33:45] @bob (Executor) picking up task...               │
│ [14:37:05] Committing changes...                            │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

### R1: Pipeline Stages Visualization

- 5 stages in a horizontal timeline
- Each stage shows: name, assigned agent, duration, status
- Active stage highlighted with primary color
- Completed stages show checkmark
- Pending stages show gray

### R2: Agent Chain

- Visual chain showing agent flow
- Each agent shown as a card with name, role, status
- Arrows connecting agents
- Active agent highlighted
- Completed agents show duration

### R3: Execution Log

- Timestamped log entries
- Color-coded by agent
- Shows what happened at each stage
- Scrollable log area

### R4: Task Info Bar

- Task name and description
- Assigned agent with role
- Priority and sprint
- Current status badge

## Acceptance Criteria

- [x] 5 pipeline stages render correctly
- [x] Agent chain shows flow between agents
- [x] Execution log displays timestamped entries
- [x] Task info bar shows all required info
- [x] Active stage is highlighted
- [x] Completed stages show duration
- [x] Pending stages are grayed out

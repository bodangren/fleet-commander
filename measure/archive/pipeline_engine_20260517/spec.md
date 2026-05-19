# Specification: Pipeline Engine

## Overview

Build the 5-stage pipeline that executes tasks through the agent chain. This is the core execution engine that moves tasks from Ready to Merged.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Task Timeline view, Pipeline stage indicators, Agent chain visualization
- **Product Definition**: `measure/product.md` — Pipeline concept, Agent Roles, How It Works
- **Design System**: `DESIGN.md` — Linear design tokens for pipeline UI

## Pipeline Stages

| Stage | Agent Role | What happens | Input | Output |
|-------|------------|--------------|-------|--------|
| **Dispatch** | System | Scheduler picks task, assigns to available agent | Ready task | In Progress task |
| **Architect** | Architect agent | Reads spec, plans implementation approach | Task + context | Implementation plan |
| **Executor** | Executor agent | Writes code, runs tests, commits | Implementation plan | Code changes + tests |
| **Reviewer** | Reviewer agent | Reads diff, checks tests, validates quality | Code changes | Approval/rejection |
| **Merger** | Merger agent (senior dev) | Merges PR, updates task status | Approved code | Merged task |

## Requirements

### R1: Pipeline Orchestrator

The orchestrator that drives tasks through stages:

- Picks up Ready tasks when agents are available
- Assigns appropriate agent based on role and skills
- Manages stage transitions
- Tracks cost per stage
- Handles failures and retries

### R2: Stage Executors

Each stage has its own executor:

**Dispatch Executor**
- Finds Ready tasks with no blockers
- Matches task skills to available agent skills
- Assigns task to best-fit agent
- Moves task to In Progress
- Creates PipelineRun record

**Architect Executor**
- Reads task spec and context
- Plans implementation approach
- Creates implementation plan document
- Logs architecture decisions
- Records cost based on agent cost/point × story points

**Executor Agent**
- Reads implementation plan
- Writes code files
- Runs tests
- Commits changes to branch
- Records cost based on agent cost/point × story points

**Reviewer Agent**
- Reads code diff
- Checks test results
- Validates against task spec
- Approves or rejects with feedback
- Records cost based on agent cost/point × story points

**Merger Agent**
- Merges approved PR
- Updates task status to Merged
- Records final cost
- Triggers sprint cost update

### R3: Cost Tracking

Cost accumulation through pipeline:

- Each stage records its cost in PipelineRun
- Cost = agent cost/point × story points × stage multiplier
- Stage multipliers: Architect (0.3x), Executor (1.0x), Reviewer (0.3x), Merger (0.1x)
- Total task cost = sum of all stage costs
- Sprint actual cost += task cost on merge

### R4: Failure Handling

When a stage fails:

- **Architect fails**: Task returns to Ready, different architect assigned
- **Executor fails**: Task returns to Ready, retry count incremented
- **Reviewer rejects**: Task returns to Ready with rejection feedback
- **Merger fails**: Task stays in For Review, retry merger

Retry limits:
- Max 3 retries per task
- After 3 retries, task marked as Blocked with failure reason

## Acceptance Criteria

- [ ] Pipeline orchestrator picks up Ready tasks
- [ ] Each stage executor works correctly
- [ ] Agent assignment matches skills to task requirements
- [ ] Cost tracking accumulates through stages
- [ ] Failure handling works with retry logic
- [ ] PipelineRun records created for each stage
- [ ] Task status updates correctly through pipeline
- [ ] Sprint cost updates on task merge

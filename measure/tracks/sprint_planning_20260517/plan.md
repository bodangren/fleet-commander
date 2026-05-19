# Implementation Plan: Sprint Planning

## Phase 1: PM Agent Recommendation Engine

- [x] Task: Build PM agent recommendation logic
    - [x] Create `pivot/src/planning/recommender.ts`
    - [x] Implement task prioritization algorithm
    - [x] Add agent availability checking
    - [x] Create cost estimation per task
    - [x] Generate recommendation with reasoning
    - [x] Test recommendation engine

## Phase 2: Sprint Planning API

- [x] Task: Create Convex functions for planning
    - [x] Create `convex/sprintPlanning.ts`
    - [x] Implement `getBacklogTasksHandler` query
    - [x] Add `createSprintHandler` mutation
    - [x] Implement `assignTasksToSprintHandler` mutation
    - [x] Test API functions (convex/sprintPlanning.test.ts — 9 tests; covers getBacklogTasksHandler, getAgentsForPlanningHandler, createSprintHandler, assignTasksToSprintHandler, getProjectStatsHandler)

## Phase 3: Planning UI - Project & Budget

- [x] Task: Build project selector and budget input
    - [x] Integrated into SprintPlanningPage
    - [x] Add project stats (backlog count, total points)
    - [x] Add budget stats (avg cost/point, max points)
    - [x] Style with Linear design tokens

## Phase 4: Planning UI - Recommendation

- [x] Task: Build PM agent recommendation display
    - [x] Integrated into SprintPlanningPage
    - [x] Show recommendation reasoning
    - [x] Display estimated total cost and buffer
    - [x] Style with Linear design tokens

## Phase 5: Planning UI - Task Selection

- [x] Task: Build task selection table
    - [x] Integrated into SprintPlanningPage
    - [x] Add checkboxes for task selection
    - [x] Show points, agent, cost/point, estimated cost, priority
    - [x] Implement selection state management
    - [x] Style with Linear design tokens

## Phase 6: Planning UI - Agent Breakdown

- [x] Task: Build agent cost breakdown
    - [x] Integrated into SprintPlanningPage
    - [x] Show per-agent load for this sprint
    - [x] Display points, cost/point, total cost
    - [x] Style with Linear design tokens

## Phase 7: Sprint Creation Flow

- [x] Task: Implement sprint creation
    - [x] Integrated into SprintPlanningPage
    - [x] No confirmation dialog — direct creation for simplicity (deviation from spec)
    - [x] Implement sprint creation logic
    - [x] Move tasks to Ready
    - [x] Navigation deferred — page refresh shows updated state (deviation from spec)
    - [x] Tested via pivot recommender tests

## Phase 8: Integration & Testing

- [x] Task: Integrate and test planning flow
    - [x] Wire UI to Convex functions via pivot API
    - [x] Add loading states
    - [x] Tested with varying backlog sizes via unit tests (pivot recommender + useSprintPlanning.test.ts — 7 tests + SprintPlanningPage.test.tsx — 7 tests)
    - [x] Budget constraint tested in recommender
    - [x] Empty assignments, missing agents handled

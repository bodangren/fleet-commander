# Implementation Plan: Sprint Planning

## Phase 1: PM Agent Recommendation Engine

- [ ] Task: Build PM agent recommendation logic
    - [ ] Create `pivot/src/planning/recommender.ts`
    - [ ] Implement task prioritization algorithm
    - [ ] Add agent availability checking
    - [ ] Create cost estimation per task
    - [ ] Generate recommendation with reasoning
    - [ ] Test recommendation engine

## Phase 2: Sprint Planning API

- [ ] Task: Create Convex functions for planning
    - [ ] Create `convex/sprintPlanning.ts`
    - [ ] Implement `getRecommendation` query
    - [ ] Add `createSprint` mutation
    - [ ] Implement `assignTasksToSprint` mutation
    - [ ] Test API functions

## Phase 3: Planning UI - Project & Budget

- [ ] Task: Build project selector and budget input
    - [ ] Create `frontend/src/components/planning/ProjectSelector.tsx`
    - [ ] Build `frontend/src/components/planning/BudgetInput.tsx`
    - [ ] Add project stats (backlog count, total points)
    - [ ] Add budget stats (avg cost/point, max points)
    - [ ] Style with Linear design tokens

## Phase 4: Planning UI - Recommendation

- [ ] Task: Build PM agent recommendation display
    - [ ] Create `frontend/src/components/planning/AgentRecommendation.tsx`
    - [ ] Show recommendation reasoning
    - [ ] Display estimated total cost and buffer
    - [ ] Style with Linear design tokens

## Phase 5: Planning UI - Task Selection

- [ ] Task: Build task selection table
    - [ ] Create `frontend/src/components/planning/TaskSelectionTable.tsx`
    - [ ] Add checkboxes for task selection
    - [ ] Show points, agent, cost/point, estimated cost, priority
    - [ ] Implement selection state management
    - [ ] Style with Linear design tokens

## Phase 6: Planning UI - Agent Breakdown

- [ ] Task: Build agent cost breakdown
    - [ ] Create `frontend/src/components/planning/AgentCostBreakdown.tsx`
    - [ ] Show per-agent load for this sprint
    - [ ] Display points, cost/point, total cost
    - [ ] Style with Linear design tokens

## Phase 7: Sprint Creation Flow

- [ ] Task: Implement sprint creation
    - [ ] Create `frontend/src/components/planning/StartSprintButton.tsx`
    - [ ] Add confirmation dialog
    - [ ] Implement sprint creation logic
    - [ ] Move tasks to Ready
    - [ ] Navigate to Project Board
    - [ ] Test full flow

## Phase 8: Integration & Testing

- [ ] Task: Integrate and test planning flow
    - [ ] Wire UI to Convex functions
    - [ ] Add loading states
    - [ ] Test with different project sizes
    - [ ] Test budget validation
    - [ ] Test sprint creation edge cases

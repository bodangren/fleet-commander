# Implementation Plan: History

## Phase 1: Sprints View

- [x] Task: Build sprint history view
    - [x] Create `frontend/src/pages/SprintsHistoryPage.tsx`
    - [x] Add sprint history table
    - [x] Add velocity trend chart
    - [x] Add sprint detail drill-down
    - [x] Style with Linear design tokens (commit SHA: 3faf871)

## Phase 2: Agents View

- [~] Task: Build agent history view
    - [~] Create `frontend/src/pages/AgentsHistoryPage.tsx`
    - [~] Add agent performance table
    - [~] Add model change history
    - [~] Add cost trend chart
    - [ ] Style with Linear design tokens

## Phase 3: Tasks View

- [ ] Task: Build task history view
    - [ ] Create `frontend/src/pages/TasksHistoryPage.tsx`
    - [ ] Add searchable task list
    - [ ] Add filters (project, agent, status)
    - [ ] Add task detail drill-down
    - [ ] Style with Linear design tokens

## Phase 4: History Queries

- [ ] Task: Create Convex queries for history
    - [ ] Add `convex/history/sprints.ts`
    - [ ] Add `convex/history/agents.ts`
    - [ ] Add `convex/history/tasks.ts`
    - [ ] Optimize for large datasets

## Phase 5: Search & Filtering

- [ ] Task: Implement search and filters
    - [ ] Create search component
    - [ ] Add filter dropdowns
    - [ ] Implement query building
    - [ ] Add URL-based state

## Phase 6: Detail Views

- [ ] Task: Build detail views
    - [ ] Create sprint retrospective view
    - [ ] Create agent detail view
    - [ ] Create task timeline link
    - [ ] Style with Linear design tokens

## Phase 7: Data Integration

- [ ] Task: Wire history to Convex
    - [ ] Add `useQuery` hooks
    - [ ] Implement pagination
    - [ ] Handle loading states
    - [ ] Add error handling

## Phase 8: Testing

- [ ] Task: Write tests
    - [ ] Unit tests for history components
    - [ ] Integration tests for queries
    - [ ] Test with large datasets
    - [ ] Test search and filtering

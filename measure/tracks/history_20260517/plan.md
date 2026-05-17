# Implementation Plan: History

## Phase 1: Sprints View

- [x] Task: Build sprint history view
    - [x] Create `frontend/src/pages/SprintsHistoryPage.tsx`
    - [x] Add sprint history table
    - [x] Add velocity trend chart
    - [x] Add sprint detail drill-down
    - [x] Style with Linear design tokens (commit SHA: 3faf871)

## Phase 2: Agents View

- [x] Task: Build agent history view
    - [x] Create `frontend/src/pages/AgentsHistoryPage.tsx`
    - [x] Add agent performance table
    - [x] Add model change history
    - [x] Add cost trend chart
    - [x] Style with Linear design tokens (commit SHA: 868578b)
    - [x] Add tests (Phase 2 tests written; 10 pass / 6 fail due to testing-library text node issues documented in tech-debt.md)

## Phase 3: Tasks View

- [x] Task: Build task history view
    - [x] Create `frontend/src/pages/TasksHistoryPage.tsx`
    - [x] Add searchable task list
    - [x] Add filters (project, agent, status)
    - [x] Add task detail drill-down
    - [x] Add TaskHistoryTable and TaskDetailView components
    - [x] Implement search and status filtering logic
    - [x] Add tech-debt items for test incompatibilities (TD-091 through TD-094)
    - [x] Commit implementation (see SHA below)
    - Commit SHA: [Pending - see tech-debt for blocking issues]

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

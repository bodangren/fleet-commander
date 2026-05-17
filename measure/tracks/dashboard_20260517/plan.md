# Implementation Plan: Dashboard

## Phase 1: Sprint Status Section

- [x] Task: Build current sprint display
    - [x] Create `frontend/src/components/dashboard/SprintStatus.tsx`
    - [x] Show sprint name and status
    - [x] Display budget: actual / estimated
    - [x] Add progress bar
    - [x] Show key stats grid
    - Commit: 98c0a82

## Phase 2: Key Metrics

- [ ] Task: Build key metrics display
    - [ ] Create `frontend/src/components/dashboard/KeyMetrics.tsx`
    - [ ] Calculate delivery rate
    - [ ] Calculate success rate
    - [ ] Show pipeline time
    - [ ] Show rejection rate

## Phase 3: Agent Status

- [ ] Task: Build agent status panel
    - [ ] Create `frontend/src/components/dashboard/AgentStatus.tsx`
    - [ ] List agents with current status
    - [ ] Show what each agent is working on
    - [ ] Add status badges
    - [ ] Link to full agent view

## Phase 4: Attention Needed

- [ ] Task: Build attention items
    - [ ] Create `frontend/src/components/dashboard/AttentionNeeded.tsx`
    - [ ] Show blockers
    - [ ] Show budget warnings
    - [ ] Show active A/B tests
    - [ ] Style with alerts

## Phase 5: Recent Activity

- [ ] Task: Build activity feed
    - [ ] Create `frontend/src/components/dashboard/RecentActivity.tsx`
    - [ ] Show latest events
    - [ ] Color-code by type
    - [ ] Make scrollable

## Phase 6: Data Integration

- [ ] Task: Wire dashboard to Convex
    - [ ] Add `useQuery` for sprint data
    - [ ] Add `useQuery` for agent status
    - [ ] Add `useQuery` for recent activity
    - [ ] Implement realtime updates

## Phase 7: Layout & Styling

- [ ] Task: Assemble dashboard layout
    - [ ] Create `frontend/src/pages/DashboardPage.tsx`
    - [ ] Arrange sections in grid
    - [ ] Apply Linear design tokens
    - [ ] Test responsive layout

## Phase 8: Testing

- [ ] Task: Write tests
    - [ ] Unit tests for each component
    - [ ] Integration tests for data flow
    - [ ] Test with empty states

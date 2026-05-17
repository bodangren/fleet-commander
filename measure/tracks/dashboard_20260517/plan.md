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

- [x] Task: Build key metrics display
    - [x] Create `frontend/src/components/dashboard/KeyMetrics.tsx`
    - [x] Calculate delivery rate
    - [x] Calculate success rate
    - [x] Show pipeline time
    - [x] Show rejection rate
    - Commit: 73e11c5

## Phase 3: Agent Status

- [x] Task: Build agent status panel
    - [x] Create `frontend/src/components/dashboard/AgentStatus.tsx`
    - [x] List agents with current status
    - [x] Show what each agent is working on
    - [x] Add status badges
    - [x] Link to full agent view
    - Commit: 25251f7

## Phase 4: Attention Needed

- [x] Task: Build attention items
    - [x] Create `frontend/src/components/dashboard/AttentionNeeded.tsx`
    - [x] Show blockers
    - [x] Show budget warnings
    - [x] Show active A/B tests
    - [x] Style with alerts
    - Commit: c6c32d0

## Phase 5: Recent Activity

- [x] Task: Build activity feed
    - [x] Create `frontend/src/components/dashboard/RecentActivity.tsx`
    - [x] Show latest events
    - [x] Color-code by type
    - [x] Make scrollable
    - Commit: 32ae9a6

## Phase 6: Data Integration

- [x] Task: Wire dashboard to Convex
    - [x] Add `useQuery` for sprint data
    - [x] Add `useQuery` for agent status
    - [x] Add `useQuery` for recent activity
    - [x] Implement realtime updates
    - Commit: dc26435

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

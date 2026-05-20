# Implementation Plan: Dashboard

## Phase 1: Sprint Status Section

- [x] Task: Build current sprint display
    - [x] Create `frontend/src/components/dashboard/SprintStatus.tsx`
    - [x] Show sprint name and status
    - [x] Display budget: actual / estimated
    - [x] Add progress bar
    - [x] Show key stats grid
    - Commit: 98c0a82
    - Deviation: SprintStatus.tsx exists but is NOT used by DashboardPage.tsx — page renders sprint section inline

## Phase 2: Key Metrics

- [x] Task: Build key metrics display
    - [x] Create `frontend/src/components/dashboard/KeyMetrics.tsx`
    - [x] Calculate delivery rate
    - [x] Calculate success rate
    - [x] Show pipeline time
    - [x] Show rejection rate
    - Commit: 73e11c5
    - Deviation: KeyMetrics.tsx exists but is NOT used by DashboardPage.tsx — page renders metrics inline

## Phase 3: Agent Status

- [x] Task: Build agent status panel
    - [x] Create `frontend/src/components/dashboard/AgentStatus.tsx`
    - [x] List agents with current status
    - [x] Show what each agent is working on
    - [x] Add status badges
    - [x] Link to full agent view
    - Commit: 25251f7
    - Deviation: AgentStatus.tsx exists but is NOT used by DashboardPage.tsx — page renders agent section inline

## Phase 4: Attention Needed

- [x] Task: Build attention items
    - [x] Create `frontend/src/components/dashboard/AttentionNeeded.tsx`
    - [x] Show blockers
    - [x] Show budget warnings
    - [x] Show active A/B tests
    - [x] Style with alerts
    - Commit: c6c32d0
    - Deviation: AttentionNeeded.tsx exists but is NOT used by DashboardPage.tsx — page renders attention section inline

## Phase 5: Recent Activity

- [x] Task: Build activity feed
    - [x] Create `frontend/src/components/dashboard/RecentActivity.tsx`
    - [x] Show latest events
    - [x] Color-code by type
    - [x] Make scrollable
    - Commit: 32ae9a6
    - Deviation: RecentActivity.tsx exists but is NOT used by DashboardPage.tsx — page renders activity section inline

## Phase 6: Data Integration

- [x] Task: Wire dashboard to Convex
    - [x] Add `useQuery` for sprint data
    - [x] Add `useQuery` for agent status
    - [x] Add `useQuery` for recent activity
    - [x] Implement realtime updates
    - Commit: dc26435
    - Deviation: `useDashboardData` now uses `useConvexQuery` for realtime subscriptions (AC6 met). DashboardDataIntegration.tsx with individual hooks exists but is NOT wired into the app.

## Phase 7: Layout & Styling

- [x] Task: Assemble dashboard layout
    - [x] Create `frontend/src/pages/DashboardPage.tsx`
    - [x] Arrange sections in grid
    - [x] Apply Linear design tokens
    - [x] Test responsive layout
    - Commit: 886c752
    - Deviation: DashboardPage.tsx is a 656-line monolithic file that inlines all section rendering instead of composing the Phase 1-5 components

## Phase 8: Testing

- [x] Task: Write tests
    - [x] Unit tests for each component
    - [x] Integration tests for data flow
    - [x] Test with empty states
    - Commit: f61f57b
    - Deviation: DashboardPage.layout.test.tsx fails (5 tests) — mock doesn't export `useDashboardData`. 59 of 64 frontend tests pass. Convex + pivot tests pass (10 tests).

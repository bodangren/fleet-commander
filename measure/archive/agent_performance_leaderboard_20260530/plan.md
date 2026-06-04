# Plan: Agent Performance Leaderboard

## Phase 1: Pure Functions & Tests
- [x] Task: Write `calculateAgentScore` pure function: composite weighted metric from cost/point, rejection rate, throughput, merge rate
- [x] Task: Write `calculateAgentScore` tests: perfect score, zero throughput, high rejection, boundary weights
- [x] Task: Write `rankAgents` pure function: sort by composite score, compute trend arrows from historical window
- [x] Task: Write `rankAgents` tests: tie-breaking, trend detection, filter by role

## Phase 2: Backend Integration
- [x] Task: Add `getAgentLeaderboard` Convex query aggregating runs/tasks across all sprints
- [x] Task: Add `getAgentPerformanceHistory` query for drill-down charts (7-day / 30-day windows)
- [ ] Task: Write Convex integration tests with multi-sprint, multi-agent seed data
- [ ] Task: Optimize query with pre-computed per-agent aggregates if N+1 emerges

## Phase 3: UI Components
- [x] Task: Build `/agents/leaderboard` route and page layout
- [x] Task: Build `LeaderboardTable` component with rank, score, trend arrows, badges
- [x] Task: Build filter bar: role select, project select, time range tabs
- [x] Task: Build `AgentPerformanceChart` component for drill-down modal/page
- [x] Task: Add Leaderboard link to main navigation under Team → Agents

## Phase 4: Verification
- [x] Task: Seed 3 agents across 2 sprints and verify ranking order
- [x] Task: Verify trend arrows flip correctly when new data arrives
- [x] Task: Run full test suite
- [x] Task: Commit and push

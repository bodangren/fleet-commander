# Plan: Agent Performance Leaderboard

## Phase 1: Pure Functions & Tests
- [ ] Task: Write `calculateAgentScore` pure function: composite weighted metric from cost/point, rejection rate, throughput, merge rate
- [ ] Task: Write `calculateAgentScore` tests: perfect score, zero throughput, high rejection, boundary weights
- [ ] Task: Write `rankAgents` pure function: sort by composite score, compute trend arrows from historical window
- [ ] Task: Write `rankAgents` tests: tie-breaking, trend detection, filter by role

## Phase 2: Backend Integration
- [ ] Task: Add `getAgentLeaderboard` Convex query aggregating runs/tasks across all sprints
- [ ] Task: Add `getAgentPerformanceHistory` query for drill-down charts (7-day / 30-day windows)
- [ ] Task: Write Convex integration tests with multi-sprint, multi-agent seed data
- [ ] Task: Optimize query with pre-computed per-agent aggregates if N+1 emerges

## Phase 3: UI Components
- [ ] Task: Build `/agents/leaderboard` route and page layout
- [ ] Task: Build `LeaderboardTable` component with rank, score, trend arrows, badges
- [ ] Task: Build filter bar: role select, project select, time range tabs
- [ ] Task: Build `AgentPerformanceChart` component for drill-down modal/page
- [ ] Task: Add Leaderboard link to main navigation under Team → Agents

## Phase 4: Verification
- [ ] Task: Seed 3 agents across 2 sprints and verify ranking order
- [ ] Task: Verify trend arrows flip correctly when new data arrives
- [ ] Task: Run full test suite
- [ ] Task: Commit and push

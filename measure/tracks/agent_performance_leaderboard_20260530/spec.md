# Spec: Agent Performance Leaderboard

## Problem
Agent performance data is scattered across individual sprints and projects. Engineering Managers have no single view to compare agents across all work, making it hard to identify top performers, justify model upgrades, or spot regressions.

## Solution
A persistent leaderboard page ranking all agents by composite performance metrics across projects and sprints, with filtering, trend indicators, and per-agent drill-down.

## Acceptance Criteria
- [ ] New "Leaderboard" route at `/agents/leaderboard`
- [ ] Composite score per agent: weighted combination of cost/point (40%), rejection rate (30%), throughput tasks/day (20%), merge rate (10%)
- [ ] Ranked table with trend arrows (↑↓→) vs previous 7-day window
- [ ] Filters: by role (Architect/Executor/Reviewer/Merger), by project, by time range (7d/30d/all)
- [ ] Per-agent drill-down: click row → agent detail with historical charts
- [ ] Badge system: 🥇 Top Performer, 📈 Most Improved, 💰 Most Efficient
- [ ] Data sourced from existing `runs`, `tasks`, and `sprints` tables — no new tables required

## Out of Scope
- Agent compensation or reward mechanics
- Peer-to-peer agent ratings
- External benchmarking against other fleets

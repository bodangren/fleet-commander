# Performance Profiling

## Overview

Measure and expose orchestrator execution performance at a granular level. Track per-phase timing, detect slow agents against p95 baselines, and surface regressions compared to historical performance.

## Functional Requirements

1. **Per-Phase Duration Tracking**
   - Instrument orchestrator pipeline stages: load (task fetch), score (dispatch scoring), execute (harness run), persist (result write-back)
   - Store phase timings in workRuns: `{ loadMs, scoreMs, executeMs, persistMs, totalMs }`
   - Aggregation queries: average, p50, p95, p99 per phase

2. **Slow Agent Detection**
   - Calculate p95 execution latency per agent over rolling 7-day window
   - Flag agents exceeding p95 threshold (configurable multiplier, default 1.5x)
   - Generate alert when agent consistently exceeds threshold (3+ consecutive runs)
   - Dashboard widget: slow agent leaderboard

3. **Regression Tracking**
   - Store daily baseline metrics (average task duration per agent, per task kind)
   - Compare current performance to rolling 7-day baseline
   - Alert on >20% degradation
   - Trend chart: performance over time with baseline overlay

## Data Sources

- `workRuns` — execution duration data (existing + new phase fields)
- `executionLogs` — event timestamps for phase extraction
- `agents` — agent identity for per-agent metrics
- New `performanceBaselines` table (optional, could derive from workRuns)

## Acceptance Criteria

- [ ] Phase timing recorded for every orchestrator cycle
- [ ] p95 latency calculated correctly per agent
- [ ] Slow agent alert fires after 3 consecutive threshold breaches
- [ ] Regression alert fires when current avg exceeds baseline by >20%
- [ ] Dashboard shows phase breakdown, slow agents, and regression trends
- [ ] All metrics update within 5 minutes of execution completion

## Out of Scope

- Code-level profiling (flame graphs, CPU/memory profiling)
- Distributed tracing across multiple services
- Automated remediation (auto-disabling slow agents)
- A/B performance comparison between agent configurations

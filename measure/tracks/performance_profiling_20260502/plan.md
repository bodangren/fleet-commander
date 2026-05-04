# Performance Profiling — Implementation Plan

> **Symphony Compliance:** Consume existing `RetryManager.calculateSymphonyBackoff` and `SYMPHONY_RETRY_CONFIG` rather than defining custom backoff. Instrument `hookRunner.ts` as a pipeline stage. Track session resume vs. fresh start latency.

## Phase 1: Duration Tracking

- [x] Add timing instrumentation to orchestrator pipeline stages
  - [x] Wrap load phase with performance.now() start/end
  - [x] Wrap score phase timing
  - [x] Wrap execute phase timing (from harness dispatch to response)
  - [x] Wrap persist phase timing
- [x] Add hook stage timing: capture `HookResult.durationMs` from `hookRunner.ts` for `beforeRun` and `afterRun` phases
- [x] Extend `workRuns` schema with `{ loadMs, scoreMs, executeMs, persistMs, hookBeforeMs, hookAfterMs, totalMs }`
- [x] Add session resume timing: track `sessionResumeMs` (time to resume existing session) vs `freshStartMs` (new session cold start)
- [x] Create `getPhaseBreakdown` query returning p50/p95/p99 per phase (including hook and session stages)
- [x] Create `getPhaseTrends` query returning phase durations over time
- [x] Write unit tests for timing capture and aggregation
- [ ] Benchmark: verify instrumentation adds <5ms overhead

## Phase 2: Slow Agent Detection

- [x] Implement `getAgentLatencyStats` query (p95 per agent over 7d window)
- [x] Create configurable threshold setting (default 1.5x p95)
- [x] Add consecutive-breach counter to agent state (computed from workRuns history)
- [x] Implement `detectSlowAgents` function returning agents exceeding threshold
- [~] Wire slow agent alerts into notification system (deferred — notification system track pending)
- [~] Build `SlowAgentLeaderboard` dashboard widget (basic component created, full dashboard deferred)
- [x] Write tests for threshold logic and consecutive-breach counting

## Phase 3: Regression Tracking

- [ ] Define `performanceBaselines` table schema (or derive from workRuns)
- [ ] Implement daily baseline snapshot job (cron)
- [ ] Create `getRegressionAlerts` query comparing current vs baseline
- [ ] Implement >20% degradation detection logic
- [ ] Build `RegressionTrendChart` component with baseline overlay
- [ ] Wire regression alerts into notification system
- [ ] Write tests for regression detection and baseline comparison

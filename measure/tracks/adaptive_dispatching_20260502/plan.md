# Adaptive Dispatching — Implementation Plan

## Phase 1: Outcome Correlation Analysis

- [ ] Implement `computeCorrelation` utility: Pearson correlation for factor-outcome pairs
- [ ] Create `analyzeDispatchHistory` Convex query: join scoreAudit with workRuns outcomes
- [ ] Compute correlation per scoring factor over configurable window (default 30 days)
- [ ] Store results in dispatchPolicyStats: factor, correlation, sampleSize, computedAt
- [ ] Add Convex index on scoreAudit for efficient time-range joins
- [ ] Write unit tests for correlation computation with known datasets
- [ ] Benchmark: ensure analysis completes within 60s for 10k records

## Phase 2: Weight Adjustment Proposals

- [ ] Implement `generateWeightProposals` function: map correlations to weight deltas
- [ ] Proposal logic: positive correlation >0.3 → increase weight, negative <-0.3 → decrease
- [ ] Clamp proposed weights to valid range (0-100) with configurable min/max per factor
- [ ] Each proposal includes: factor, currentWeight, proposedWeight, confidence, reasoning
- [ ] Store proposals in dispatchPolicyStats with status="pending"
- [ ] Build frontend UI to review proposals: side-by-side comparison, approve/reject
- [ ] Implement `applyWeightProposal` mutation: update dispatch policy weights
- [ ] Write tests for proposal generation with edge cases (no data, all-same values)

## Phase 3: Anomaly Detection

- [ ] Implement week-over-week success rate comparison across agents
- [ ] Flag anomalies where success rate drops >20% from previous week
- [ ] Z-score based outlier detection on per-agent success rates
- [ ] Create alert records for detected anomalies with context
- [ ] Build weekly report aggregation: correlation summary, proposals, anomalies
- [ ] Schedule weekly analysis run (Convex cron or orchestrator trigger)
- [ ] Dashboard widget: latest report summary, pending proposals, recent anomalies
- [ ] Integration tests: inject anomalous data, verify detection and alerting

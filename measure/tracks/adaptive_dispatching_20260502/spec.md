# Adaptive Dispatching

## Overview

Machine-learning-lite system that learns from dispatch history to improve task-to-agent scoring. Analyzes outcome correlations, proposes weight adjustments, and detects anomalies in success rates. Builds on existing scoreAudit table.

## Functional Requirements

1. **Outcome Correlation Analysis**
   - Compute per-factor success correlation: for each scoring factor, correlate weight with task outcome (success/failure)
   - Factors: agent skill match, task priority, harness reliability, agent load
   - Statistical method: Pearson correlation or equivalent, computed over rolling window (last 30 days)
   - Store correlation results in dispatchPolicyStats table

2. **Weight Adjustment Proposals**
   - Generate recommended weight changes based on correlation analysis
   - Factors with high positive correlation to success → increase weight
   - Factors with low/negative correlation → decrease weight
   - Proposals logged but NOT auto-applied (human review required)
   - Proposal includes: current weight, proposed weight, confidence, reasoning

3. **Anomaly Detection**
   - Detect sudden drops in success rate (e.g., >20% decrease week-over-week)
   - Statistical outlier detection on agent success rates
   - Alert on anomalies: create alert record, log to alerts table
   - Anomaly context: which agents, which task types, time window

4. **Weekly Adjustment Report**
   - Scheduled weekly analysis run (configurable day/time)
   - Report includes: correlation summary, weight proposals, anomaly flags
   - Report stored and accessible from dashboard
   - Notification on report generation

## Data Sources

- `scoreAudit` — historical scoring decisions and weights used
- `workRuns` — task outcomes, agent assignments
- `tasks` — completion status, timing
- `dispatchPolicyStats` — correlation results, weight history
- `alerts` — anomaly notifications

## Acceptance Criteria

- [ ] Correlation analysis computes per-factor success correlation over 30-day window
- [ ] Weight proposals generated with confidence scores and reasoning
- [ ] Proposals logged but require manual approval to apply
- [ ] Anomaly detection flags >20% success rate drops within 24h
- [ ] Weekly report generated and accessible from dashboard
- [ ] Analysis completes within 60s for 10k+ scoreAudit records
- [ ] No scoring changes applied without explicit approval

## Out of Scope

- Real-time weight adjustment (auto-apply without review)
- Deep learning / neural network-based scoring
- Cross-project weight transfer
- Multi-objective optimization (Pareto scoring)

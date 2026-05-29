# Spec: Budget Burn Forecasting

## Problem
Sprints are budget-constrained, but users only discover budget overruns after they happen. There is no early warning system or predictive view of when a sprint will exhaust its budget based on current burn rate and remaining tasks.

## Solution
A real-time budget burn forecast that projects budget exhaustion time, surfaces at-risk tasks, and recommends reprioritization actions before the sprint runs out of money.

## Acceptance Criteria
- [ ] `getSprintBurnForecast` Convex query returning: projected exhaustion time, remaining budget, burn rate (USD/hour), confidence interval
- [ ] Forecast computed from actual spend velocity over the last N completed tasks (minimum 3 for statistical relevance)
- [ ] "At Risk" badge on sprint dashboard when projected spend > budget with >70% confidence
- [ ] Recommendation panel: suggest which Ready tasks to drop or reassign to cheaper agents to fit remaining budget
- [ ] Update forecast automatically as tasks complete (Convex subscription)
- [ ] Handle edge cases: no completed tasks yet (show estimate-only), zero burn rate (all tasks done), negative remaining budget (already over)

## Out of Scope
- Multi-sprint budget rollover
- Cross-project budget reallocation
- ML-based forecasting (use linear regression on historical burn)

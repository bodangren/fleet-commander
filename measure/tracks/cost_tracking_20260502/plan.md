# Cost Tracking — Implementation Plan

## Phase 1: Cost Data Model

- [ ] Define `costRecords` table schema in Convex
- [ ] Add `actualCost`, `estimatedCost`, `inputTokens`, `outputTokens` fields to `runContracts`
- [ ] Create `recordCost` mutation called after each harness execution
- [ ] Extract token counts from agent response metadata
- [ ] Compute cost from token counts using configurable model rate table
- [ ] Write unit tests for cost calculation logic
- [ ] Backfill costRecords from existing runContracts with token data

## Phase 2: Budget Management

- [ ] Define `budgets` table schema in Convex
- [ ] Create `setBudget` and `getBudget` mutations/queries
- [ ] Implement budget check in orchestrator dispatch (soft-warn mode)
- [ ] Implement hard-block mode that prevents task dispatch
- [ ] Add budget period reset logic (daily/weekly/monthly cron)
- [ ] Create `checkBudgetThreshold` function for alert triggering
- [ ] Wire budget alerts into notification system hooks
- [ ] Write tests for budget enforcement logic

## Phase 3: Cost Dashboard

- [ ] Build `CostByAgentChart` component (pie chart)
- [ ] Build `CostByProjectChart` component (stacked bar chart)
- [ ] Build `CostTrendChart` component (line chart over time)
- [ ] Build `CostPerTask` metric display component
- [ ] Build `BudgetGauge` component (utilization indicator)
- [ ] Create `CostDashboard` page composing all components
- [ ] Wire Convex queries for cost aggregation
- [ ] Add time range controls (reuse analytics TimeRangeSelector)

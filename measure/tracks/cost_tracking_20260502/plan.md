# Cost Tracking — Implementation Plan

> **Symphony Compliance:** Model session resumption cost savings vs. fresh session cost. Account for hook execution wall-clock in billing. Reference `SYMPHONY_RETRY_CONFIG` bounds for retry cost exposure.

## Phase 1: Cost Data Model ✅

- [x] Define `costRecords` table schema in Convex (`convex/schema.ts`)
- [x] Add `actualCost`, `estimatedCost`, `inputTokens`, `outputTokens` fields to `runContracts`
- [x] Add `sessionResumed` boolean and `sessionCostSaved` (tokens avoided by resuming) to `costRecords`
- [x] Create `recordCost` mutation called after each harness execution (`convex/costs.ts`)
- [x] Extract token counts from agent response metadata (`convex/lib/cost.ts:extractTokenUsage`)
- [x] Compute cost from token counts using configurable model rate table (`convex/lib/cost.ts:computeCost`)
- [x] Compute session savings: compare token count of resumed session vs. estimated fresh-start context tokens (`convex/lib/cost.ts:computeSessionSavings`)
- [x] Write unit tests for cost calculation logic (19 tests in `convex/lib/cost.test.ts`)
- [x] Backfill costRecords from existing runContracts with token data (`backfillCostRecords` mutation)

## Phase 2: Budget Management

- [ ] Define `budgets` table schema in Convex
- [ ] Create `setBudget` and `getBudget` mutations/queries
- [ ] Implement budget check in orchestrator dispatch (soft-warn mode)
- [ ] Implement hard-block mode that prevents task dispatch
- [ ] Add budget period reset logic (daily/weekly/monthly cron)
- [ ] Create `checkBudgetThreshold` function for alert triggering
- [ ] Compute max retry cost exposure using `SYMPHONY_RETRY_CONFIG`: `maxRetries * maxDelayMs * hourlyRate`
- [ ] Wire budget alerts into notification system hooks
- [ ] Write tests for budget enforcement logic

## Phase 3: Cost Dashboard

- [ ] Build `CostByAgentChart` component (pie chart)
- [ ] Build `CostByProjectChart` component (stacked bar chart)
- [ ] Build `CostTrendChart` component (line chart over time)
- [ ] Build `CostPerTask` metric display component
- [ ] Build `SessionSavingsWidget` — shows total tokens saved by session resumption
- [ ] Build `BudgetGauge` component (utilization indicator)
- [ ] Create `CostDashboard` page composing all components
- [ ] Wire Convex queries for cost aggregation
- [ ] Add time range controls (reuse analytics TimeRangeSelector)

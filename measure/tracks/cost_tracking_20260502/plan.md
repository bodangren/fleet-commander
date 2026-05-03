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

## Phase 2: Budget Management ✅

- [x] Define `budgets` table schema in Convex (already existed)
- [x] Create `setBudget` and `getBudget` mutations/queries (already existed)
- [x] Implement budget check in orchestrator dispatch (soft-warn mode)
- [x] Implement hard-block mode that prevents task dispatch
- [x] Add budget period reset logic (daily/weekly/monthly cron)
- [x] Create `checkBudgetThreshold` function for alert triggering
- [x] Compute max retry cost exposure using `SYMPHONY_RETRY_CONFIG`: `maxRetries * maxDelayMs * hourlyRate`
- [x] Wire budget alerts into `recordCost` mutation (auto-logs governance events)
- [x] Write tests for budget enforcement logic (24 tests in `convex/lib/budget.test.ts`)

## Phase 3: Cost Dashboard ✅

- [x] Build `CostByProjectChart` component (bar chart)
- [x] Build `CostByAgentChart` component (pie chart)
- [x] Build `CostTrendChart` component (line chart over time)
- [x] Build `BudgetGauge` component (cost-per-task display)
- [x] Build `SessionSavingsWidget` — shows total tokens saved by session resumption
- [x] Create `CostDashboard` page composing all components
- [x] Wire Convex queries via API routes (`pivot/src/routes/costs.ts`)
- [x] Add time range controls (reuse `AnalyticsFilterBar`)
- [x] Add route to App.tsx and sidebar navigation link

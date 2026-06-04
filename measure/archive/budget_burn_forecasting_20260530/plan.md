# Plan: Budget Burn Forecasting

## Phase 1: Pure Functions & Tests
- [x] Task: Write `computeBurnForecast` pure function with linear regression on task completion times and costs
- [x] Task: Write `computeBurnForecast` tests: normal case, insufficient data, zero burn rate, over-budget sprint
- [x] Task: Write `recommendTaskCuts` pure function: greedy knapsack to maximize story points within remaining budget
- [x] Task: Write `recommendTaskCuts` tests: fits within budget, over budget, tie-breaking by cost/point

## Phase 2: Backend Integration
- [x] Task: Add `getSprintBurnForecast` Convex query calling `computeBurnForecast` with live sprint data
- [x] Task: Add `getSprintTaskRecommendations` query calling `recommendTaskCuts`
- [x] Task: Write Convex integration tests with seeded sprint data
- [x] Task: Add `burnRate` and `projectedExhaustion` fields to sprint detail query (via dashboard)

## Phase 3: UI Components
- [x] Task: Build `BurnForecastCard` component: burn rate, time remaining, confidence bar
- [x] Task: Build `AtRiskBanner` component (red/yellow) on sprint dashboard
- [x] Task: Build `TaskRecommendationList` component: suggested drops with savings estimate
- [x] Task: Add forecast section to existing sprint detail page (DashboardPage)

## Phase 4: Verification
- [x] Task: Manual test: start sprint, complete tasks, verify forecast updates
- [x] Task: Test edge case: sprint with 0 completed tasks shows estimate-only state
- [x] Task: Run full test suite
- [x] Task: Commit and push

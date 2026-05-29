# Plan: Budget Burn Forecasting

## Phase 1: Pure Functions & Tests
- [ ] Task: Write `computeBurnForecast` pure function with linear regression on task completion times and costs
- [ ] Task: Write `computeBurnForecast` tests: normal case, insufficient data, zero burn rate, over-budget sprint
- [ ] Task: Write `recommendTaskCuts` pure function: greedy knapsack to maximize story points within remaining budget
- [ ] Task: Write `recommendTaskCuts` tests: fits within budget, over budget, tie-breaking by cost/point

## Phase 2: Backend Integration
- [ ] Task: Add `getSprintBurnForecast` Convex query calling `computeBurnForecast` with live sprint data
- [ ] Task: Add `getSprintTaskRecommendations` query calling `recommendTaskCuts`
- [ ] Task: Write Convex integration tests with seeded sprint data
- [ ] Task: Add `burnRate` and `projectedExhaustion` fields to sprint detail query

## Phase 3: UI Components
- [ ] Task: Build `BurnForecastCard` component: burn rate, time remaining, confidence bar
- [ ] Task: Build `AtRiskBanner` component (red/yellow) on sprint dashboard
- [ ] Task: Build `TaskRecommendationList` component: suggested drops with savings estimate
- [ ] Task: Add forecast section to existing sprint detail page

## Phase 4: Verification
- [ ] Task: Manual test: start sprint, complete tasks, verify forecast updates
- [ ] Task: Test edge case: sprint with 0 completed tasks shows estimate-only state
- [ ] Task: Run full test suite
- [ ] Task: Commit and push

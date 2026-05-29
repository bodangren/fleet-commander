# Plan: Sprint Retrospective Dashboard

## Phase 1: Data Aggregation
- [x] Task: Add `getSprintRetrospective` Convex query with budget burndown, task stats, rejection reasons
- [x] Task: Add `getSprintCostTrend` query comparing to previous sprints
- [x] Task: Write tests for aggregation logic

## Phase 2: UI Components
- [x] Task: Build `BudgetBurndownChart` component (custom HTML/CSS, avoid Recharts)
- [x] Task: Build `AgentPerformanceBreakdown` table
- [x] Task: Build `RejectionReasonHistogram` component
- [x] Task: Build `AutoInsights` bullet list generator

## Phase 3: Integration
- [x] Task: Add "Retrospective" tab to sprint detail page
- [x] Task: Add Markdown export button
- [x] Task: Ensure tab only shows for completed sprints

## Phase 4: Verification
- [x] Task: Test with a completed sprint from seed data
- [x] Task: Run full test suite
- [x] Task: Commit and push

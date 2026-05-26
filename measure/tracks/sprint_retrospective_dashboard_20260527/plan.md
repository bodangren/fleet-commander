# Plan: Sprint Retrospective Dashboard

## Phase 1: Data Aggregation
- [ ] Task: Add `getSprintRetrospective` Convex query with budget burndown, task stats, rejection reasons
- [ ] Task: Add `getSprintCostTrend` query comparing to previous sprints
- [ ] Task: Write tests for aggregation logic

## Phase 2: UI Components
- [ ] Task: Build `BudgetBurndownChart` component (custom HTML/CSS, avoid Recharts)
- [ ] Task: Build `AgentPerformanceBreakdown` table
- [ ] Task: Build `RejectionReasonHistogram` component
- [ ] Task: Build `AutoInsights` bullet list generator

## Phase 3: Integration
- [ ] Task: Add "Retrospective" tab to sprint detail page
- [ ] Task: Add Markdown export button
- [ ] Task: Ensure tab only shows for completed sprints

## Phase 4: Verification
- [ ] Task: Test with a completed sprint from seed data
- [ ] Task: Run full test suite
- [ ] Task: Commit and push

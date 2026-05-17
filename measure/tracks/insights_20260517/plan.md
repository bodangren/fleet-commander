# Implementation Plan: Insights

## Phase 1: Analytics View

- [x] Task: Build analytics view
    - [x] Create `frontend/src/pages/AnalyticsPage.tsx`
    - [x] Add sprint velocity chart
    - [x] Add budget utilization chart
    - [x] Add sprint history table
    - [x] Style with Linear design tokens
    - Committed: 72a3d06

## Phase 2: Performance View

- [x] Task: Build performance view
    - [x] Create `frontend/src/pages/PerformancePage.tsx`
    - [x] Add agent reliability leaderboard
    - [x] Add pipeline cost breakdown
    - [x] Add rejection reasons analysis
    - [x] Style with Linear design tokens
    - Committed: cf310ee

## Phase 3: Costs View

- [x] Task: Build costs view
    - [x] Create `frontend/src/pages/CostsPage.tsx`
    - [x] Add cost/point trend chart
    - [x] Add agent cost efficiency table
    - [x] Add ROI summary
    - [x] Add optimization opportunities
    - [x] Style with Linear design tokens
    - Committed: f351109

## Phase 4: Charts Library

- [x] Task: Create reusable chart components
    - [x] Create `frontend/src/components/charts/LineChart.tsx`
    - [x] Create `frontend/src/components/charts/BarChart.tsx`
    - [x] Create `frontend/src/components/charts/DonutChart.tsx`
    - [x] Add chart tooltips and legends
    - [x] Style with Linear design tokens
    - Committed: 01198bf (Tech debt: TD-113 - jsdom+recharts ResponsiveContainer renders 0×0 SVG in tests)

## Phase 5: Data Queries

- [x] Task: Create Convex queries for insights
    - [x] Add `convex/analytics.ts` with velocity queries
    - [x] Add `convex/performance.ts` with reliability queries
    - [x] Add `convex/costs.ts` with cost queries
    - [x] Optimize queries for performance
    - Committed: 482f225

## Phase 6: Tabs & Navigation

- [x] Task: Add tab navigation
    - [x] Create tab component
    - [x] Implement tab switching
    - [x] Add URL-based routing
    - [x] Style tabs with Linear design tokens
    - Committed: e1e385f

## Phase 7: Data Integration

- [x] Task: Wire views to Convex
    - [x] Add `useQuery` hooks
    - [x] Implement loading states
    - [x] Handle empty states
    - [x] Add error handling
    - Committed: 7913625 (Green phase: mock ctx bare collect fix, useCostData wiring, useSprintHistory fix; TD-118: error boundary tests fail due to React error propagation architecture)

## Phase 8: Testing

- [ ] Task: Write tests
    - [ ] Unit tests for chart components
    - [ ] Integration tests for data queries
    - [ ] Test with different data states

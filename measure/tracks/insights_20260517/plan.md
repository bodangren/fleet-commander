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

- [ ] Task: Create Convex queries for insights
    - [ ] Add `convex/analytics.ts` with velocity queries
    - [ ] Add `convex/performance.ts` with reliability queries
    - [ ] Add `convex/costs.ts` with cost queries
    - [ ] Optimize queries for performance

## Phase 6: Tabs & Navigation

- [ ] Task: Add tab navigation
    - [ ] Create tab component
    - [ ] Implement tab switching
    - [ ] Add URL-based routing
    - [ ] Style tabs with Linear design tokens

## Phase 7: Data Integration

- [ ] Task: Wire views to Convex
    - [ ] Add `useQuery` hooks
    - [ ] Implement loading states
    - [ ] Handle empty states
    - [ ] Add error handling

## Phase 8: Testing

- [ ] Task: Write tests
    - [ ] Unit tests for chart components
    - [ ] Integration tests for data queries
    - [ ] Test with different data states

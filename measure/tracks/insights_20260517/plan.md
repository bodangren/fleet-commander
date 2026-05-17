# Implementation Plan: Insights

## Phase 1: Analytics View

- [x] Task: Build analytics view
    - [x] Create `frontend/src/pages/AnalyticsPage.tsx`
    - [x] Add sprint velocity chart
    - [x] Add budget utilization chart
    - [x] Add sprint history table
    - [x] Style with Linear design tokens

## Phase 2: Performance View

- [ ] Task: Build performance view
    - [ ] Create `frontend/src/pages/PerformancePage.tsx`
    - [ ] Add agent reliability leaderboard
    - [ ] Add pipeline cost breakdown
    - [ ] Add rejection reasons analysis
    - [ ] Style with Linear design tokens

## Phase 3: Costs View

- [ ] Task: Build costs view
    - [ ] Create `frontend/src/pages/CostsPage.tsx`
    - [ ] Add cost/point trend chart
    - [ ] Add agent cost efficiency table
    - [ ] Add ROI summary
    - [ ] Add optimization opportunities
    - [ ] Style with Linear design tokens

## Phase 4: Charts Library

- [ ] Task: Create reusable chart components
    - [ ] Create `frontend/src/components/charts/LineChart.tsx`
    - [ ] Create `frontend/src/components/charts/BarChart.tsx`
    - [ ] Create `frontend/src/components/charts/DonutChart.tsx`
    - [ ] Add chart tooltips and legends
    - [ ] Style with Linear design tokens

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

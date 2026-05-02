# Execution Analytics — Implementation Plan

## Phase 1: Backend Analytics Queries ✅

- [x] Define Convex query functions for completion rate aggregation
  - [x] `getCompletionTrends` — group tasks by date, count completed/failed
  - [x] `getAgentUtilization` — active tasks per agent per time bucket
  - [x] `getBottlenecks` — rank tracks/projects by stall duration and failure rate
  - [x] `getQueueDepth` — snapshot of pending task count over time
- [x] Add database indexes for efficient time-range queries on executionLogs and workRuns
- [x] Write unit tests for each query function
- [ ] Benchmark query performance against synthetic 90-day dataset (deferred)

## Phase 2: Frontend Charts

- [ ] Install and configure charting library (Recharts or equivalent)
- [ ] Build `CompletionTrendChart` component (line chart)
- [ ] Build `AgentHeatmap` component (heatmap grid)
- [ ] Build `BottleneckChart` component (horizontal bar chart)
- [ ] Build `QueueDepthChart` component (stacked area chart)
- [ ] Create `AnalyticsDashboard` page layout composing all charts
- [ ] Wire Convex queries to chart data props
- [ ] Add loading skeletons and empty states

## Phase 3: Time Range Controls & Filters

- [ ] Build `TimeRangeSelector` component (7d / 30d / 90d presets + custom picker)
- [ ] Implement shared time-range context across all chart components
- [ ] Add project/track filter dropdown
- [ ] Add agent filter dropdown
- [ ] Implement real-time refresh toggle (poll interval)
- [ ] End-to-end tests for filter interactions
- [ ] Performance test: verify <2s render for 90-day range

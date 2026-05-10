# Execution Analytics — Implementation Plan

> **Symphony Compliance:** Instrument hook execution (`hookRunner.ts`), session resumption, and `#priority`/`#blocked_by` tags as first-class analytics dimensions.

## Post-Review Note (2026-05-03)

Follow-up review found Phase 3 overstates filter completion: agent and priority controls are visible, but backend analytics routes only forward `days` and `projectSlug`; priority filtering is currently a no-op and agent filtering is partial. The correction is tracked in `review_remediation_20260503`.

## Phase 1: Backend Analytics Queries ✅

- [x] Define Convex query functions for completion rate aggregation
  - [x] `getCompletionTrends` — group tasks by date, count completed/failed
  - [x] `getAgentUtilization` — active tasks per agent per time bucket
  - [x] `getBottlenecks` — rank tracks/projects by stall duration and failure rate
  - [x] `getQueueDepth` — snapshot of pending task count over time
- [x] Add database indexes for efficient time-range queries on executionLogs and workRuns
- [x] Write unit tests for each query function
- [ ] Benchmark query performance against synthetic 90-day dataset (deferred)

## Phase 2: Frontend Charts ✅

- [x] Install and configure charting library (Recharts already installed)
- [x] Build `CompletionTrendChart` component (line chart)
- [x] Build `AgentHeatmap` component (heatmap grid)
- [x] Build `BottleneckChart` component (horizontal bar chart)
- [x] Build `QueueDepthChart` component (stacked area chart)
- [x] Create `AnalyticsDashboard` page layout composing all charts
- [x] Wire Convex queries to chart data props via pivot server API routes
- [x] Add loading skeletons and empty states
- [x] Add route to App.tsx and navigation link to sidebar

## Phase 3: Time Range Controls & Filters ✅

- [x] Build `TimeRangeSelector` component (7d / 30d / 90d presets + custom picker)
- [x] Implement shared time-range context (`AnalyticsFiltersProvider`) across all chart components
- [x] Add project filter dropdown (`AnalyticsFilterBar`)
- [x] Add agent filter dropdown
- [x] Add `#priority` tag filter (critical/high/low) to filter bar
- [x] Implement real-time refresh toggle (poll interval configurable via context)
- [x] Wire all chart components to consume filters from context (no more prop drilling)
- [ ] End-to-end tests for filter interactions
- [ ] Performance test: verify <2s render for 90-day range

## Phase 4: Symphony Instrumentation ✅

- [x] Add `getHookMetrics` Convex query: hook execution count and failure rate per phase, sourced from `orchestratorErrors`
- [x] Add `getSessionMetrics` Convex query: resumption rate, active sessions, new vs resumed sessions by date, sourced from `tasks.sessionId`
- [x] Add API routes: `GET /api/analytics/hook-metrics`, `GET /api/analytics/session-metrics`
- [x] Build `HookPerformanceChart` component (bar chart: executions vs failures over time)
- [x] Build `SessionResumptionChart` component (line chart: new vs resumed sessions, summary stats)
- [x] Compose new charts into `AnalyticsDashboard` page
- [x] Write unit tests for `getHookMetrics` and `getSessionMetrics` queries (13 tests in `pivot/src/analytics.test.ts`)
- [ ] Add hook failure markers to completion trend chart (deferred — needs hook data to flow first)

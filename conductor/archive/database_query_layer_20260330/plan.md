# Implementation Plan - Database Query Layer for Dashboard

## Phase 1: SQLite Indexes and Optimized Queries

- [x] Task: Define composite indexes on `execution_logs` table
  - `(project_id, agent_name, status)` for utilization queries
  - `(project_id, started_at)` for date-range filtering
  - `(status, completed_at)` for velocity queries
  - Write test: EXPLAIN QUERY PLAN confirms index usage on representative queries
- [x] Task: Define indexes on `issues` and `tasks` tables
  - Issues: `(project_id, status, created_at)` for resolution time queries
  - Tasks: `(project_id, status, completed_at)` for completion velocity
  - Write test: EXPLAIN QUERY PLAN confirms index usage
- [x] Task: Implement `GetOverviewStats()` in `ExecutionLogStore`
  - Single query with COUNT/SUM aggregations across projects
  - Returns struct: total projects, tasks, completed tasks, active agents, open issues
  - Write test: seeded database returns correct aggregated counts

## Phase 2: Cross-Project Stats API Endpoint

- [x] Task: Add `GET /api/stats/overview` handler in new `stats.go`
  - Call `GetOverviewStats()` and return JSON response
  - Write test: endpoint returns 200 with expected shape and correct values
- [x] Task: Add `GET /api/stats/agents` handler
  - Query agent utilization: `SUM(execution_seconds)` grouped by agent name
  - Accept optional `?from=` and `?to=` query params for date range
  - Write test: returns per-agent utilization percentage for seeded data
- [x] Task: Add `GET /api/stats/issues` handler
  - Compute average resolution time: `AVG(resolved_at - created_at)` for resolved issues
  - Include count of open vs resolved
  - Write test: seeded issues return correct average resolution hours
- [x] Task: Add `GET /api/stats/velocity` handler
  - Group completed tasks by date, compute daily and weekly rollups
  - Accept `?days=` query param (default 30)
  - Write test: seeded completions produce correct daily/weekly counts
- [x] Task: Register all four stat routes in `main.go`
  - Write test: all routes respond (integration test or manual curl)

## Phase 3: Dashboard Overview Widgets

- [x] Task: Create `OverviewStats` React component with card-based layout
  - Fetches from `/api/stats/overview` on mount
  - Displays total projects, tasks, completion rate, active agents, open issues
  - Write test: component renders stats cards with correct values from mock API
- [x] Task: Create `AgentUtilization` component with bar chart or table
  - Fetches from `/api/stats/agents`
  - Shows agent name, utilization %, total executions
  - Write test: component renders agent rows sorted by utilization
- [x] Task: Create `VelocityChart` component with line/area chart
  - Fetches from `/api/stats/velocity`
  - Plots daily task completions over configured window
  - Write test: component renders chart data points from mock API
- [x] Task: Create `IssueResolution` component
  - Fetches from `/api/stats/issues`
  - Displays average resolution time, open/resolved counts
  - Write test: component renders resolution metrics
- [x] Task: Assemble dashboard overview page combining all widgets
  - New route or tab in existing frontend
  - Write test: page renders all four widget sections

## Phase 4: Verification

- [x] Task: Run `npm run lint` and `npm run test` across Go and React code
- [ ] Task: Load test: seed 50k execution logs, verify all stats endpoints respond under 200ms
- [x] Task: Update `conductor/tracks/database_query_layer_20260330/plan.md` to mark phases complete

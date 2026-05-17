# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity |
|----|-------------|----------|
| TD-078 | Foundation schema duplicate tables (projects, sprints, tasks, agents) | Critical |
| TD-079 | 15+ files reference old field names conflicting with new schema | Critical |
| TD-091 | TaskHistoryTable tests use getByText for non-unique values | Critical |
| TD-092 | TaskDetailView tests split `$` and cost into adjacent text nodes | Critical |
| TD-093 | TaskHistoryTable sort produces wrong first row | High |
| TD-094 | TasksHistoryPage drill-down TaskDetailView not rendering | High |
| TD-095 | Phase 4 mock `db.query()` doesn't support bare `collect()` | Critical |
| TD-096 | Phase 5 search/filter component tests missing | Low |
| TD-099 | useSprintHistory error boundary tests fail: errors not propagated | High |
| TD-100 | Test strategy contradicts actual architecture (Convex hooks vs pivot API) | Medium |
| TD-102 | TaskHistoryTable sort test expects unique text but components render duplicate values | Critical |
| TD-103 | AgentModelHistory shows model names in both Previous/New columns causing duplicate text | Critical |
| TD-104 | CostTrendChart large dataset tests check exact cost values that appear multiple times | Critical |
| TD-106 | SprintHistoryTable/TaskHistoryTable large dataset tests check values that appear in multiple rows | Critical |
| TD-108 | Test strategy says extend `convex-provider.tsx` but TDD red-phase forbids modifying existing source code | Medium |
| TD-109 | AnalyticsPage tests use ambiguous regex matching multiple elements | Critical |
| TD-110 | PerformancePage tests use ambiguous getByText regex matching subtitle and card headers | Critical |
| TD-111 | CostsPage optimization titles containing "model" collide with table header regex | Critical |
| TD-113 | Charts Library tests fail with recharts; ResponsiveContainer produces 0×0 SVG in jsdom | Critical |
| TD-115 | Mock `db.query()` missing bare `.collect()` — now fixed (bare collect added) | Medium |
| TD-116 | `useConvexQuery` not exported from `useConvexData.ts` causing TS error | High |
| TD-117 | `setupConvexMocks()` lacks `useConvexQuery` export and error-state support | Medium |
| TD-118 | Error boundary tests fail across Phase 7 hooks (useSprintHistory, useCostData): React error propagation architecture doesn't surface thrown errors to `result.error` in vitest | High |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-062 | `calculateBudgetPercent` returns stub 0 | dashboard_20260517 |
| TD-065 | Dashboard zero-state uses inline markup | dashboard_20260517 |
| TD-086 | CostTrendChart tests expect 'Cost Trend' inside component | history_20260517 |
| TD-088 | AgentPerformanceTable sort test finds Bob before Alice | history_20260517 |
| TD-089 | AgentModelHistory test finds model name twice when once expected | history_20260517 |
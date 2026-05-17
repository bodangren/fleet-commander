# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity |
|----|-------------|----------|
| TD-078 | Foundation schema duplicate tables (projects, sprints, tasks, agents) | Critical |
| TD-079 | 15+ files reference old field names conflicting with new schema | Critical |
| TD-101 | SprintDetailView renders "X / Y" across multiple adjacent elements causing test failures | Critical |
| TD-102 | TaskHistoryTable sort test expects unique text but components render duplicate values | Critical |
| TD-103 | AgentModelHistory shows model names in both Previous/New columns causing duplicate text | Critical |
| TD-104 | CostTrendChart large dataset tests check exact cost values that appear multiple times | Critical |
| TD-105 | Large dataset tests for sprints/agents/tasks find duplicate text across table and detail views | Critical |
| TD-106 | SprintHistoryTable/TaskHistoryTable large dataset tests check values that appear in multiple rows | Critical |
| TD-107 | TasksHistoryPage drill-down test uses ambiguous regex `/cost/i` that matches table header | Critical |
| TD-091 | TaskHistoryTable tests use getByText for non-unique values | Critical |
| TD-092 | TaskDetailView tests split `$` and cost into adjacent text nodes | Critical |
| TD-095 | Phase 4 mock `db.query()` doesn't support bare `collect()` | Critical |
| TD-093 | TaskHistoryTable sort produces wrong first row | High |
| TD-094 | TasksHistoryPage drill-down TaskDetailView not rendering | High |
| TD-099 | useSprintHistory error boundary tests fail: errors not propagated | High |
| TD-096 | Phase 5 search/filter component tests missing | Low |
| TD-100 | Test strategy contradicts actual architecture (Convex hooks vs pivot API) | Medium |
| TD-108 | Test strategy says extend `convex-provider.tsx` but TDD red-phase forbids modifying existing source code; new mocks use local `vi.mock()` instead | Medium |
| TD-109 | AnalyticsPage tests use ambiguous regex that matches multiple elements; duplicate text between stat card labels, subtitles, and chart headers causes getByText failures | Critical |
| TD-110 | PerformancePage tests use ambiguous getByText regex (/Agent Reliability/i, /Pipeline Cost/i) matching both subtitle and card headers | Critical |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-062 | `calculateBudgetPercent` returns stub 0 | dashboard_20260517 |
| TD-063 | AgentStatus rendered without MemoryRouter | FIXED |
| TD-064 | Phase 8 "Write tests" contradicts TDD strategy | Resolved |
| TD-065 | Dashboard zero-state uses inline markup | dashboard_20260517 |
| TD-066 | DashboardDataIntegration lacks loading skeletons | Resolved |
| TD-101 | SprintDetailView renders "X / Y" across multiple adjacent elements | FIXED |
| TD-086 | CostTrendChart tests expect 'Cost Trend' inside component | history_20260517 |
| TD-088 | AgentPerformanceTable sort test finds Bob before Alice | history_20260517 |
| TD-089 | AgentModelHistory test finds model name twice when once expected | history_20260517 |

> TD-010–TD-023, TD-025–TD-028, TD-031, TD-039–TD-061 resolved 2026-04-15 to 2026-05-04.

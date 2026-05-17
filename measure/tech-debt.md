# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity |
|----|-------------|----------|
| TD-078 | Foundation schema duplicate tables (projects, sprints, tasks, agents) | Critical |
| TD-079 | 15+ files reference old field names conflicting with new schema | Critical |
| TD-087 | History tables render `$` and cost as adjacent text nodes | Critical |
| TD-091 | TaskHistoryTable tests use getByText for non-unique values | Critical |
| TD-092 | TaskDetailView tests split `$` and cost into adjacent text nodes | Critical |
| TD-095 | Phase 4 mock `db.query()` doesn't support bare `collect()` | Critical |
| TD-088 | AgentPerformanceTable sort test finds Bob before Alice | High |
| TD-089 | AgentModelHistory test finds model name twice when once expected | High |
| TD-093 | TaskHistoryTable sort produces wrong first row | High |
| TD-094 | TasksHistoryPage drill-down TaskDetailView not rendering | High |
| TD-099 | useSprintHistory error boundary tests fail: errors not propagated | High |
| TD-086 | CostTrendChart tests expect 'Cost Trend' inside component | Critical |
| TD-096 | Phase 5 search/filter component tests missing | Low |
| TD-100 | Test strategy says add `/api/history/*` to `mockApp.ts`, but history pages use Convex hooks directly, not pivot API — E2E mock approach contradicts actual architecture | Medium |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-062 | `calculateBudgetPercent` returns stub 0 | dashboard_20260517 |
| TD-063 | AgentStatus rendered without MemoryRouter | FIXED |
| TD-064 | Phase 8 "Write tests" contradicts TDD strategy | Resolved |
| TD-065 | Dashboard zero-state uses inline markup | dashboard_20260517 |
| TD-066 | DashboardDataIntegration lacks loading skeletons | Resolved |

> TD-010–TD-023, TD-025–TD-028, TD-031, TD-039–TD-061 resolved 2026-04-15 to 2026-05-04.
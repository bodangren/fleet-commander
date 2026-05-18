# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID     | Description                                                                                                                                      | Severity |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |


| TD-091 | TaskHistoryTable tests use `getByText` for non-unique values (status, storyPoints, agent names)                                                  | Critical |
| TD-092 | TaskDetailView tests split `$` and cost into adjacent text nodes; `getByText('12.50')` fails                                                     | Critical |
| TD-093 | TaskHistoryTable sort test: default sort is already asc, click toggles to desc, but test expects asc first row                                   | High     |
| TD-094 | TasksHistoryPage drill-down TaskDetailView not rendering — page rewritten as static, drill-down feature removed                                  | High     |
| TD-100 | Test strategy contradicts actual architecture (insights_20260517 assumes Convex queries; data flows through pivot API)                           | Medium   |
| TD-108 | Test strategy instructs extending `convex-provider.tsx`, but TDD red-phase forbids modifying existing source code                                | Medium   |
| TD-113 | Recharts-based chart tests fail in jsdom; `ResponsiveContainer` produces 0×0 SVG — excludes CostTrendChart (custom HTML/CSS, tests pass)          | Critical |
| TD-118 | Error boundary tests fail across hooks: React error propagation doesn't surface thrown errors to `result.error` in vitest; orphan InsightsErrorBoundary.test.tsx exists (component missing) | High     |

## Resolved

| ID     | Description                                                                            | Resolved In            |
| ------ | -------------------------------------------------------------------------------------- | ---------------------- |
| TD-062 | `calculateBudgetPercent` returns stub 0                                                | dashboard_20260517     |
| TD-065 | Dashboard zero-state uses inline markup                                                | dashboard_20260517     |
| TD-086 | CostTrendChart tests expect 'Cost Trend' inside component                              | history_20260517       |
| TD-088 | AgentPerformanceTable sort test finds Bob before Alice                                 | history_20260517       |
| TD-089 | AgentModelHistory test finds model name twice when once expected                       | history_20260517       |
| TD-095 | Phase 4 mock `db.query()` missing bare `.collect()`                                    | insights_20260517      |
| TD-096 | Phase 5 search/filter component tests missing                                          | tech_debt_audit_20260519 |
| TD-099 | useSprintHistory error boundary tests fail: errors not propagated                      | tech_debt_audit_20260519 |
| TD-102 | TaskHistoryTable sort test expects unique text but components render duplicate values  | tech_debt_audit_20260519 |
| TD-103 | AgentModelHistory shows model names in both Previous/New columns causing duplicate text | tech_debt_audit_20260519 |
| TD-104 | CostTrendChart large dataset tests check exact cost values that appear multiple times  | tech_debt_audit_20260519 |
| TD-106 | SprintHistoryTable/TaskHistoryTable large dataset tests check values in multiple rows  | tech_debt_audit_20260519 |
| TD-109 | AnalyticsPage tests use ambiguous regex matching multiple elements                     | insights_20260517      |
| TD-110 | PerformancePage tests use ambiguous getByText regex matching subtitle and card headers | insights_20260517      |
| TD-111 | CostsPage optimization titles containing "model" collide with table header regex       | insights_20260517      |
| TD-113 | Charts Library tests fail with recharts; ResponsiveContainer produces 0×0 SVG in jsdom | — (consolidated into TD-113) |
| TD-115 | Mock `db.query()` missing bare `.collect()`                                            | insights_20260517      |
| TD-116 | `useConvexQuery` not exported from `useConvexData.ts` causing TS error                 | insights_20260517      |
| TD-117 | `setupConvexMocks()` lacks `useConvexQuery` export and error-state support             | insights_20260517      |
| TD-118 | Error boundary tests fail across Phase 7 hooks                                         | — (consolidated into TD-118) |
| TD-119 | Chart component tests fail in jsdom due to recharts ResponsiveContainer 0×0 SVG        | tech_debt_audit_20260519 |
| TD-120 | ChartEdgeCases tests fail: same root cause as TD-119                                   | tech_debt_audit_20260519 |
| TD-121 | Insights page tests fail: ambiguous getByText regex matching multiple elements         | insights_20260517      |
| TD-078 | Foundation schema duplicate tables (projects, sprints, tasks, agents)                                                  | schema_unification_20260519 |
| TD-079 | 20+ files reference old field names conflicting with new schema                                                        | schema_unification_20260519 |

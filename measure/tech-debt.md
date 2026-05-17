# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-078 | New foundation tables conflict with existing schema definitions | Duplicate property errors in schema.ts (projects, sprints, tasks, agents defined twice). Foundation_layer_20260517 added new definitions without removing old ones. Requires schema migration + updating 15+ files to new field names. | Critical: breaks typecheck; deferred post-track |
| TD-079 | Foundation schema changes break 15+ existing Convex/TS files | Files reference old field names (projectSlug, startDate, taskKeys, etc.) that conflict with new foundation schema. Cascading from TD-078. | Critical: requires coordinated migration; deferred post-track |
| TD-080 | Foundation agent tests use mock that lacks `query().order().collect()` chain | Tests import handlers directly with `createMockCtx()`, but mock's `db.query()` doesn't chain properly. All 6 Phase 2 tests fail at runtime. Cannot modify tests per instructions. | Deferred: fixture needs restructure |
| TD-081 | Phase 3 test strategy contradicts foundation schema | Strategy says sprint FSM is `planning→active→completed` but schema uses `planned→active→closed`. Tests must target actual schema fields. | Deferred: needs test strategy update |
| TD-077 | Phase 1 schema.foundation.test.ts expects `for_review`/`med` but validators use `review`/`medium` | Cannot modify tests per instructions. | Deferred: pre-existing test mismatch |
| TD-067 | Convex `fleet.ts` query handlers not exportable for unit tests | Handlers wrapped inline; requires refactoring to export. | Deferred: pre-existing |
| TD-035 | No performance benchmark for analytics queries | In-memory benchmarks pass <2s. Convex index deferred. | Deferred: benchmarks pass |
| TD-082 | Phase 4 test strategy ambiguity: sprint-active validation location | Minor: implement in both handlers for safety | Deferred |
| TD-083 | Phase 5 test strategy ambiguity: "stage transition tracking" underspecified | Minor: current coverage satisfies criteria | Deferred |
| TD-084 | SprintHistoryTable tests use getByText for non-unique values | Velocity 1.71 appears in 2 sprints, cost 487.33 appears once but matches budget label format. Tests should use getAllByText or more specific selectors. Cannot modify tests per instructions. | Deferred |
| TD-085 | SprintsHistoryPage drill-down test uses getByText('Sprint 2') which finds multiple elements | Velocity chart labels and table cells both contain 'Sprint N'. Test fails with getMultipleElementsFoundError. Cannot modify tests per instructions. | Deferred |
| TD-086 | CostTrendChart tests expect 'Cost Trend' label inside chart component | Tests use getByText('Cost Trend') but component no longer contains this label (Card header provides it). Test cannot be modified per instructions. | Critical |
| TD-087 | AgentPerformanceTable/CostTrendChart tests split '$' and amount into separate text nodes | getByText('1250.50') fails because DOM renders `<td>$</td><td>1250.50</td>` as adjacent text nodes. Testing-library's getByText requires contiguous text. Cannot modify tests. | Critical |
| TD-088 | AgentPerformanceTable sort test: data order inconsistent after header click | Sorting by displayName (Alice vs Bob) should put Alice first, but test finds Bob first. Possible issue with test setup or sort state initialization. | High |
| TD-089 | AgentModelHistory test uses getByText for model name appearing in both previous and new columns | Test expects `claude-sonnet` once but it appears twice (Alice: previous, Bob: new). Cannot modify tests. | High |
| TD-090 | Test strategy P1–P3 omits search/filter tests but plan Phase 3 requires searchable task list + filters | P3 tests cover search/filter UI presence and client-side filtering; P5 will cover URL state and query building. | Low |
| TD-091 | TaskHistoryTable tests use getByText for non-unique values | 'done' appears in 2 tasks, '3' appears in 2 tasks, 'alice' appears in 2 tasks. Tests use singular getByText which fails. Cannot modify tests per instructions. | Critical |
| TD-092 | TaskHistoryTable/TaskDetailView tests split '$' and cost amount into separate text nodes | getByText('12.50') fails because DOM renders `<td>$</td><td>12.50</td>` as adjacent text nodes. Testing-library requires contiguous text. Cannot modify tests per instructions. | Critical |
| TD-093 | TaskHistoryTable sort test: first row after sort is 'Optimize queries' not 'Add dashboard chart' | Test expects Add dashboard chart after sort by title ascending, but gets Optimize queries. Sort may not be resetting direction properly. Cannot modify test. | High |
| TD-094 | TasksHistoryPage drill-down test fails: TaskDetailView not rendered after row click | Test waits for cost label and '12.50' but TaskDetailView doesn't appear. onSelectTask callback may not be wiring to state update. Cannot modify test. | Critical |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-062 | `calculateBudgetPercent` in `dashboard.ts` returns stub 0 | dashboard_20260517 |
| TD-063 | `DashboardDataIntegration.test.tsx` renders `AgentStatus` without `MemoryRouter` | FIXED |
| TD-064 | Plan Phase 8 "Write tests" contradicts TDD / test strategy | Resolved |
| TD-065 | Dashboard zero-state uses inline markup instead of `EmptyState` component | dashboard_20260517 |
| TD-066 | `DashboardDataIntegration` lacks per-section loading skeletons | Resolved |
| TD-024 | `convex/_generated/api.d.ts` requires manual updates offline | Created `convex/scripts/regenerate-api-dts.sh` |
| TD-029 | `getBootstrapSummary` full table scans | Denormalized counters recommended |
| TD-033 | 15 pivot tests fail in full suite individually | Refactored `runAllProjects.test.ts` |
| TD-034 | Analytics dashboard missing e2e tests | Created `e2e/analytics.spec.ts` |
| TD-037 | `issueState` fetched but never rendered | Wired in ProjectViewPage |
| TD-053 | Frontend Convex test fixture missing | Created `frontend/src/__fixtures__/convex-provider.tsx` |
| TD-054 | `isValidStatusTransition` conflict: kanban.test.ts vs useKanbanDrag.test.ts | Fixed test |
| TD-055 | `KanbanColumn` drop test fails in jsdom | Fixed with DOM fallback |
| TD-056 | Pivot Convex mock client missing | Added MockConvexClient |
| TD-058 | Phase 5 test strategy contradiction | Smoke tests written |
| TD-059 | E2E tests failing due to Convex hooks | Fixed E2E selectors |
| TD-061 | MockConvexData sprint shape mismatch | Added fields |

> TD-010–TD-023, TD-025–TD-028, TD-031, TD-039–TD-052 resolved 2026-04-15 to 2026-05-04.

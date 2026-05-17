# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-068 | Employee performance test strategy contradicts existing codebase patterns | Strategy mandates `createMockConvexClient` with string paths, but all existing pivot integration tests mock `ConvexHttpClient.query/mutation` directly (see `recompute.test.ts`); also, strategy says frontend uses `fetch` to pivot API while plan says `useQuery(getEmployeePerformance)` — architectural ambiguity | TD-068 created during Phase 1 Red phase |
| TD-070 | Phase 2 test strategy uses `severity: 'high'` which does not exist in alert schema | Existing `alertSeverity` union is `critical | warning | info`; test strategy example `evaluateRegression` returns `'high'`. Adapted tests to use `'warning'`/`'critical'` instead. | Noted during Phase 2 Red phase |
| TD-071 | Phase 2 `detectRegressions.test.ts` and `evaluateRegression.test.ts` have irreconcilable severity thresholds | `evaluateRegression` test expects critical for >30% degradation; `detectRegressions` test expects warning for 50% degradation (150ms vs 100ms baseline). Adjusting to satisfy one breaks the other. Cannot modify tests per instructions. | Critical |
| TD-069 | Phase 1 test files have TypeScript errors due to mock.calls type narrowing | `computeBaselines.test.ts` lines 91-94 and `getEmployeePerformance.test.ts` lines 81-88 access `calls[0]` on `mock.calls` which is typed as `never[]` in Bun's mock type; tests pass at runtime but typecheck fails | Critical |
| TD-067 | Convex `fleet.ts` query handlers not exportable for unit tests | Handlers are wrapped inline in `query({...})` with no separate export; unit testing requires duplicating large mock contexts or refactoring to export handlers; see `scheduler.test.ts` pattern |
| TD-032 | `rollup.ts` stub metrics schema requires real workRuns duration linkage | Deferred: fields used in 35+ locations system-wide |
| TD-035 | No performance benchmark for analytics queries | Deferred: needs synthetic 90-day dataset and benchmark infrastructure |
| TD-072 | Phase 3 test strategy references non-existent "employee detail" page | Strategy says E2E should navigate to employee detail and click Performance tab, but codebase has no `/employees/:id` route or employee detail view. Performance tab should be added to ProjectViewPage instead. | Noted during Phase 3 Red phase |
| TD-073 | Phase 4 test strategy contradicts schema reality | Strategy mandates composite index `(employeeId, projectSlug, taskKind)` on `performanceBaselines`, but schema uses `agent` (not `employeeId`) and has `by_project_and_agent` (`projectSlug`, `agent`) only. Also, `runs` table lacks any time-window index for employee queries. Benchmark tests written against missing modules per TDD Red phase. | Noted during Phase 4 Red phase |
| TD-036 | Hook failure markers not shown on completion trend chart | Blocked: needs hook data flowing through pipeline first |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-062 | `calculateBudgetPercent` in `dashboard.ts` returns stub 0 | dashboard_20260517: Function works correctly; SprintStatus now imports it instead of duplicating logic |
| TD-063 | `DashboardDataIntegration.test.tsx` renders `AgentStatus` without `MemoryRouter` | FIXED: Wrapped agent-rendering tests with MemoryRouter |
| TD-064 | Plan Phase 8 "Write tests" contradicts TDD / test strategy | Resolved: Tests written per TDD during implementation; plan artifact |
| TD-065 | Dashboard zero-state uses inline markup instead of `EmptyState` component | dashboard_20260517: AgentStatus, AttentionNeeded, RecentActivity now use EmptyState |
| TD-066 | `DashboardDataIntegration` lacks per-section loading skeletons | Resolved: SectionSkeleton already implemented for each missing section |
| TD-024 | `convex/_generated/api.d.ts` requires manual updates offline | Created `convex/scripts/regenerate-api-dts.sh` |
| TD-029 | `getBootstrapSummary` full table scans | Convex lacks .count(); denormalized counters recommended |
| TD-033 | 15 pivot tests fail in full suite individually | Refactored `runAllProjects.test.ts` with dependency injection |
| TD-034 | Analytics dashboard missing e2e tests | Created `e2e/analytics.spec.ts` |
| TD-037 | `issueState` fetched but never rendered | Wired in ProjectViewPage with dismissable detail card |
| TD-038 | `ProjectViewPage.test.tsx` can hang in full Vitest run | Added explicit timeouts |
| TD-053 | Frontend Convex test fixture missing | Created `frontend/src/__fixtures__/convex-provider.tsx` |
| TD-054 | `isValidStatusTransition` conflict: kanban.test.ts vs useKanbanDrag.test.ts | Fixed test to expect `true` for blocked→ready |
| TD-055 | `KanbanColumn` drop test fails in jsdom | Fixed with `data-task-id` DOM fallback |
| TD-056 | Pivot Convex mock client missing | Added MockConvexClient with stubs |
| TD-057 | Fixture Task type incompatible with orchestrator | Aligned with orchestrator/types.ts |
| TD-058 | Phase 5 test strategy contradiction | Smoke and responsive tests written |
| TD-059 | E2E tests failing due to Convex hooks | Fixed E2E test selectors; components handle undefined data |
| TD-060 | `blocked→ready` transition contradiction | Same as TD-054 |
| TD-061 | MockConvexData sprint shape mismatch | Added `dashboardSprint/Agents/Activity/Alerts/Metrics` fields; mocked useDashboardData hooks |

> TD-010–TD-023, TD-025–TD-028, TD-031, TD-039–TD-052 resolved 2026-04-15 to 2026-05-04. See git history.

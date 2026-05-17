# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-062 | `calculateBudgetPercent` in `dashboard.ts` returns stub 0 | Phase 1 complete but helper never implemented; wire into SprintStatus or remove dead code |
| TD-063 | `DashboardDataIntegration.test.tsx` renders `AgentStatus` without `MemoryRouter` | `AgentStatus` uses `Link` from `react-router-dom` which requires router context; cannot modify test; Phase 7 layout tests work around with MemoryRouter wrapper; Critical design gap |
| TD-064 | Plan Phase 8 "Write tests" contradicts TDD / test strategy | Test strategy mandates per-phase TDD (tests before impl), but plan relegates all testing to Phase 8 after layout; integration tests for Phase 7 written now in Red phase |
| TD-065 | Dashboard zero-state uses inline markup instead of `EmptyState` component | Test strategy prescribes `EmptyState.tsx` reuse, but AgentStatus/AttentionNeeded/RecentActivity each roll their own empty state markup; inconsistent with design system |
| TD-032 | `rollup.ts` stub metrics schema requires real workRuns duration linkage | Deferred: fields used in 35+ locations system-wide |
| TD-035 | No performance benchmark for analytics queries | Deferred: needs synthetic 90-day dataset and benchmark infrastructure |
| TD-036 | Hook failure markers not shown on completion trend chart | Blocked: needs hook data flowing through pipeline first |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
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
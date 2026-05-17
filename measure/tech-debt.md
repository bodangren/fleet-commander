# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-080 | Foundation agent tests use mock that lacks `query().order().collect()` chain | `agents.test.ts` imports handlers and calls them directly with `createMockCtx()`, but the mock's `db.query()` returns `{order:{collect}}` not a chainable `{order:{collect:async}}`. All 6 tests fail at runtime. Cannot modify tests. Fixture needs restructure or handlers need to be exported in a testable form. | Critical: all Phase 2 tests fail |
| TD-067 | Convex `fleet.ts` query handlers not exportable for unit tests | Handlers are wrapped inline in `query({...})` with no separate export; unit testing requires duplicating large mock contexts or refactoring to export handlers; see `scheduler.test.ts` pattern | Deferred: pre-existing, not track-specific |
| TD-032 | `rollup.ts` stub metrics schema requires real workRuns duration linkage | Deferred: fields used in 35+ locations system-wide | Deferred: pre-existing, not track-specific |
| TD-035 | No performance benchmark for analytics queries | Phase 4 implemented synthetic dataset generator and benchmark runner; in-memory benchmarks pass <2s requirement. Actual Convex query performance still needs time-window index on workRuns. | Deferred: benchmarks pass, Convex index deferred |
| TD-036 | Hook failure markers not shown on completion trend chart | Blocked: needs hook data flowing through pipeline first | Deferred: pre-existing, not track-specific |
| TD-069 | Phase 1 test files have TypeScript errors due to mock.calls type narrowing | Tests pass at runtime but typecheck fails | Deferred: tests pass at runtime, typecheck-only |
| TD-076 | Existing `convex/schema.test.ts` contradicts foundation layer spec | Test asserts `tables.agents` is `Undefined`, but schema defines `agents`. Existing test is stale and fails independently. | Deferred: pre-existing test failure |
| TD-077 | Phase 1 schema.foundation.test.ts expects `for_review`/`med` but existing validators use `review`/`medium` | Cannot modify tests per instructions. | Critical: blocks Phase 1 completion |
| TD-078 | New foundation tables conflict with existing schema definitions | Duplicate property errors in schema.ts. Need to determine if new tables should replace or augment existing ones. | Critical: breaks typecheck |
| TD-079 | Foundation schema changes break 15+ existing Convex/TS files | Files reference old field names (projectSlug, startDate, etc.) that no longer exist. | Critical: cascade of breakages |

## Resolved

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-062 | `calculateBudgetPercent` in `dashboard.ts` returns stub 0 | dashboard_20260517 |
| TD-063 | `DashboardDataIntegration.test.tsx` renders `AgentStatus` without `MemoryRouter` | FIXED |
| TD-064 | Plan Phase 8 "Write tests" contradicts TDD / test strategy | Resolved |
| TD-065 | Dashboard zero-state uses inline markup instead of `EmptyState` component | dashboard_20260517 |
| TD-066 | `DashboardDataIntegration` lacks per-section loading skeletons | Resolved |
| TD-024 | `convex/_generated/api.d.ts` requires manual updates offline | Created `convex/scripts/regenerate-api-dts.sh` |
| TD-029 | `getBootstrapSummary` full table scans | Convex lacks .count(); denormalized counters recommended |
| TD-033 | 15 pivot tests fail in full suite individually | Refactored `runAllProjects.test.ts` with dependency injection |
| TD-034 | Analytics dashboard missing e2e tests | Created `e2e/analytics.spec.ts` |
| TD-037 | `issueState` fetched but never rendered | Wired in ProjectViewPage |
| TD-038 | `ProjectViewPage.test.tsx` can hang in full Vitest run | Added explicit timeouts |
| TD-053 | Frontend Convex test fixture missing | Created `frontend/src/__fixtures__/convex-provider.tsx` |
| TD-054 | `isValidStatusTransition` conflict: kanban.test.ts vs useKanbanDrag.test.ts | Fixed test to expect `true` for blocked→ready |
| TD-055 | `KanbanColumn` drop test fails in jsdom | Fixed with `data-task-id` DOM fallback |
| TD-056 | Pivot Convex mock client missing | Added MockConvexClient with stubs |
| TD-057 | Fixture Task type incompatible with orchestrator | Aligned with orchestrator/types.ts |
| TD-058 | Phase 5 test strategy contradiction | Smoke and responsive tests written |
| TD-059 | E2E tests failing due to Convex hooks | Fixed E2E test selectors |
| TD-060 | `blocked→ready` transition contradiction | Same as TD-054 |
| TD-061 | MockConvexData sprint shape mismatch | Added fields; mocked useDashboardData hooks |

> TD-010–TD-023, TD-025–TD-028, TD-031, TD-039–TD-052 resolved 2026-04-15 to 2026-05-04. See git history.
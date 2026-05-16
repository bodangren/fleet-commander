# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-032 | `rollup.ts` stub metrics removed from output but schema still requires them | Deferred: needs real workRuns duration linkage; fields used in 35+ locations system-wide |
| TD-035 | No performance benchmark for analytics queries — unknown whether 90-day range renders <2s | Deferred: needs synthetic 90-day dataset and dedicated benchmark infrastructure |
| TD-036 | Hook failure markers not shown on completion trend chart | Blocked: needs hook data flowing through pipeline first |

## Resolved (2026-05-16, tech_debt_remediation)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-024 | `convex/_generated/api.d.ts` requires manual updates offline | Created `convex/scripts/regenerate-api-dts.sh` for offline regeneration |
| TD-029 | `getBootstrapSummary` full table scans | Documented limitation; Convex lacks .count(); denormalized counters recommended for scale |
| TD-034 | Analytics dashboard missing e2e tests | Created `e2e/analytics.spec.ts`; added analytics endpoint mocks; fixed chart null safety |
| TD-037 | `issueState` fetched but never rendered | Wired up issueState rendering in ProjectViewPage with dismissable detail card |
| TD-038 | `ProjectViewPage.test.tsx` can hang in full Vitest run | Added explicit timeouts; fixed mockJsonResponse to return Promise.resolve |
| TD-053 | Frontend Convex test fixture missing | Created `frontend/src/__fixtures__/convex-provider.tsx` with MockConvexData and setupConvexMocks |
| TD-056 | Pivot Convex mock client missing | Added MockConvexClient with query/mutation/onQuery/onMutation stubs and 8 passing tests |
| TD-057 | Fixture Task type incompatible with orchestrator | Aligned fixture Task type with orchestrator/types.ts; removed @ts-expect-error directives |
| TD-059 | E2E tests failing due to Convex hooks | Playwright config sets VITE_CONVEX_URL= empty; fixed E2E test selectors; components handle undefined data |

## Resolved (pre-2026-04-23)

TD-010–TD-023, TD-025–TD-028, TD-031 resolved 2026-04-15 to 2026-04-25. See git history.

## Resolved (2026-05-16, virtual_software_house_mvp)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-054 | `isValidStatusTransition` conflict: kanban.test.ts vs useKanbanDrag.test.ts | Fixed test to expect `true` for blocked→ready (correct behavior) |
| TD-055 | `KanbanColumn` drop test fails in jsdom | Fixed with `data-task-id` DOM fallback (commit da38bc1) |
| TD-058 | Phase 5 test strategy contradiction | Resolved — smoke and responsive tests written (commit f4a5b08) |
| TD-060 | `blocked→ready` transition contradiction | Same as TD-054; test corrected |

## Resolved (2026-05-05)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-033 | 15 pivot tests fail in full suite but pass individually — `mock.module()` state leaks across files | Refactored `runAllProjects.test.ts` to dependency injection via optional `deps` param; removed all `mock.module()` calls from pivot tests (2026-05-05) |

## Resolved (2026-05-04)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-027, TD-039–TD-052 | Various minor fixes | See git history 2026-05-04 |
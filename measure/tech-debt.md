# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Notes |
|----|-------------|-------|
| TD-024 | `convex/_generated/api.d.ts` requires manual updates when `npx convex dev` is unavailable offline | Add import + module entry for each new Convex module; `dataModel.d.ts` and `api.js` are schema-driven and auto-update |
| TD-029 | `fleetCatalog.ts:getBootstrapSummary` calls `.collect()` on 9 tables for `.length` — full table scans | Replace with denormalized counters or `query.collect().length` → index-based counting |
| TD-032 | `rollup.ts` stub metrics removed from output but schema still requires them | Needs real workRuns duration linkage or schema migration (no focused track created) |
| TD-034 | Analytics dashboard missing e2e tests for filter interactions (time range, project, agent, priority filters) | Phase 3 pending task from execution_analytics track |
| TD-035 | No performance benchmark for analytics queries — unknown whether 90-day range renders <2s | Deferred from execution_analytics Phase 1; needs synthetic 90-day dataset |
| TD-036 | Hook failure markers not shown on completion trend chart | Deferred from execution_analytics Phase 4; needs hook data flowing through pipeline first |
| TD-037 | `issueState` from `useIssuePreview` fetched but never rendered in ProjectViewPage — blocked-task issue detail is dead code | `issueState` + `clearIssueState` are returned by hook but not destructured in ProjectViewPage.tsx:42; issue detail panel was never wired up |
| TD-038 | `frontend/src/pages/ProjectViewPage.test.tsx` can fail/hang in the full frontend Vitest run | Observed during review_remediation_20260503 verification: test reported `renders project detail, board lanes, and the run action` failed at ~17s, then the suite did not exit until terminated |
| TD-053 | `frontend/src/__fixtures__/convex-provider.tsx` missing — test strategy references `MockConvexProvider` + `renderWithProviders` but file never created | Phase 2 kanban integration tests currently use `fetch` mocking instead; need fixture for proper Convex subscription testing |
| TD-054 | `isValidStatusTransition` conflict: kanban.test.ts:64 allows `blocked→ready` but useKanbanDrag.test.ts:80 expects `false` | `useKanbanDrag` test contradicts `kanban` test; one of the two tests has wrong expectations for Phase 2 kanban board |
| TD-055 | `KanbanColumn` drop test fails in jsdom: `fireEvent.drop` with mock `dataTransfer` doesn't propagate to handler | jsdom requires `dragStart` to populate `dataTransfer` before `drop` can read it; test never fires `dragStart` so `_draggedTaskId` stays null and `dataTransfer.getData()` returns empty; requires either `@testing-library/user-event` or test restructure |
| TD-056 | `pivot/src/__fixtures__/convex-mock.ts` has factories but no mock Convex client — test strategy describes `query/mutation/withIndex/collect` stubs that don't exist | Phase 3 convex handler tests (`convex/employees.test.ts`) built inline mock ctx instead; shared fixture needed for consistent integration testing across future convex modules |
| TD-057 | `scheduler.ts` uses `orchestrator/types.ts` Task but tests use `convex-mock.ts` Task — incompatible shapes (mock Task lacks `projectSlug`, `trackId`, `taskKey`, `dependencies`) causing TypeScript errors while tests pass at runtime | Tests pass at runtime but typecheck fails; fixture Task type and orchestrator Task type need alignment — requires fixture refactor or test refactoring (cannot modify tests per instructions) |

## Resolved (pre-2026-04-23)

TD-010–TD-023, TD-025–TD-028, TD-031 resolved 2026-04-15 to 2026-04-25. See git history.

## Resolved (2026-05-05)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-033 | 15 pivot tests fail in full suite but pass individually — `mock.module()` state leaks across files | Refactored `runAllProjects.test.ts` to dependency injection via optional `deps` param; removed all `mock.module()` calls from pivot tests (2026-05-05) |

## Resolved (2026-05-04)

| ID | Description | Resolved In |
|----|-------------|--------------|
| TD-027, TD-039–TD-052 | Various minor fixes | See git history 2026-05-04 |
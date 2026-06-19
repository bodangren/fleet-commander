# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity | Owner |
| --- | --- | --- | --- |
| TD-200 | `convex/scoreAudit.ts:createScoreAudit` returns without inserting a row. | Critical | Unassigned |
| TD-201 | Missing `convex/auth.config.ts`; `resolveActor` falls back to anonymous bootstrap. | Critical | Unassigned |
| TD-204 | `pivot/src/convexClient.ts` and `typedConvexClient.ts` remain parallel implementations. | Critical | Unassigned |
| TD-217 | `frontend/src/lib/useConvexData.ts` remains a god-file with copied hook boilerplate. | Critical | Unassigned |
| TD-218 | `frontend/src/lib/useConvexRealtime.ts` remains a god-file of one-line wrappers and casts. | Critical | Unassigned |
| TD-221 | Legacy kanban remains a parallel implementation with production-adjacent callers. | High | Unassigned |
| TD-240 | `doctor.sh orphans` depends on graph edges that miss JSX, Convex decorators, and route registration patterns. | Medium | `build_graph_context_reconciliation_20260618` |
| TD-242 | Tailwind CSS 4 migration is blocked by config and `@apply` migration work. | High | Package maintenance follow-up |
| TD-243 | Vite 8 migration is blocked on plugin ecosystem support. | Medium | Package maintenance follow-up |
| TD-244 | ESLint 10 migration requires plugin compatibility validation. | Medium | Package maintenance follow-up |
| TD-245 | TypeScript 6 migration requires coordinated pivot/frontend/Convex validation. | Medium | Package maintenance follow-up |
| TD-247 | `convex/scheduler.ts` operates legacy `employees`/`runs` in parallel to canonical `agents`/`pipelineRuns`. | Low | Unassigned |
| TD-249 | `frontend/src/__fixtures__/convex-provider.tsx` uses runtime `vi.mock()` calls that Vitest warns will become invalid. | Low | Unassigned |
| TD-250-adapter | E2E adapter-mock-drift failures (28 of 53) — mock data adapter does not match test expectations. | High | `e2e_test_baseline_hardening_20260619` Phase 2 |
| TD-256-selector | E2E selector-drift failures (17 of 53) — test locators/URLs do not match current UI. | High | `e2e_test_baseline_hardening_20260619` Phase 3 |
| TD-257-race | E2E race-condition failures (7 of 53) — timeouts or page load timing issues. | High | `e2e_test_baseline_hardening_20260619` Phase 3 |
| TD-259-regression | E2E genuine-regression (1 of 53: `quality-workflow.spec.ts` `app.goto is not a function`). | High | Independent investigation |
| TD-252 | Production AutoRunner/server/CLI omit real `QualityWorkflowRunner` hooks, so non-none quality profiles fail closed. | Critical | `quality_workflow_hot_path_wiring_20260618` |
| TD-255 | `graph.db` contains stale deleted/archived paths and full scan against the canonical DB failed with duplicate node IDs. | High | `build_graph_context_reconciliation_20260618` |

## Resolved

| ID | Description | Resolution |
| --- | --- | --- |
| TD-253 | Operations/Reconcile frontend fetches reconciliation endpoints that are not registered in pivot. | `operations_api_contract_closure_20260618` Phase 2: reconciliation routes registered via `pivot/src/routes/reconciliation.ts`. |
| TD-254 | Pipelines page calls `GET /api/pipelines`, but pivot lacks the route and `convex/pipelines.ts` public functions are placeholders. | `operations_api_contract_closure_20260618` Phase 3: `convex/pipelines.ts` deleted, GET /api/pipelines wired through `api.pipelineRuns.*`. |

## Recently Resolved Or Obsolete

- Q-FIND-001..007 were resolved by `route_fixes_regression_20260613` and removed from active debt.
- TD-206 is resolved by `orchestrator_decomposition_20260605`.
| TD-241 | React Router 7 migration completed; residual endpoint rewrites may need follow-up. | Low | Package maintenance follow-up |
- Older resolved items live in `measure/archive/tech-debt-resolved.md`.

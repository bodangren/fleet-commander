# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity | Owner |
| --- | --- | --- | --- |
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

## Resolved

| ID | Description | Resolution |
| --- | --- | --- |
| TD-204 | `pivot/src/convexClient.ts` and `typedConvexClient.ts` remained parallel implementations. | `unify_convex_clients_20260622`: the deprecated `typedConvexClient.ts` was already absent at HEAD and all 30+ callers in `pivot/src/` already import from `../convexClient`. The track recorded and proved the unification: `pivot/src/convexClient.unify.test.ts` (09cbc98) asserts single-module existence, zero deprecated imports, the unified API surface, `api` re-export identity with `convex/_generated/api`, and signature arity preservation. `bun --cwd pivot test` 1835 pass / 4 skip / 0 fail; `bun --cwd pivot typecheck` clean; graph.db updated (5bb35bd). |
| TD-206 | orchestrator.ts was a god-file exceeding 500 lines | Decomposed into modular stages by `orchestrator_decomposition_20260605`. |
| TD-201 | Missing `convex/auth.config.ts`; `resolveActor` falls back to anonymous bootstrap. | `auth_config_identity_20260622`: `convex/auth.config.ts` now throws at module load under `NODE_ENV=production` when `CONVEX_AUTH_PROVIDER_DOMAIN` or `CONVEX_AUTH_APPLICATION_ID` are unset (ecd2466); `resolveActor` requires the explicit `FLEET_ALLOW_ANON_BOOTSTRAP=1` opt-in flag for non-production anonymous bootstrap, and rejects all unauthenticated production callers with `Authentication required` (ecd2466). Phase 3 integration test `convex/issues.auth.test.ts` exercises a real handler via `createMockCtx` (cc93900). |
| TD-200 | `convex/scoreAudit.ts:createScoreAudit` returned without inserting a row. | `score_audit_persistence_fix_20260622`: handler now validates required string fields and calls `ctx.db.insert('scoreAudit', entry)` before returning the persisted entry (78ab1b6). Test coverage in `convex/scoreAudit.test.ts` covers the happy-path insert, AC3 validation rejection for each empty required string, and the AC4 round-trip from `createScoreAuditHandler` into `listScoreAuditByTaskHandler` (ef6c055 + 7c5a092). Graph updated incrementally (57054b5). |
| TD-253 | Operations/Reconcile frontend fetches reconciliation endpoints that are not registered in pivot. | `operations_api_contract_closure_20260618` Phase 2: reconciliation routes registered via `pivot/src/routes/reconciliation.ts`. |
| TD-254 | Pipelines page calls `GET /api/pipelines`, but pivot lacks the route and `convex/pipelines.ts` public functions are placeholders. | `operations_api_contract_closure_20260618` Phase 3: `convex/pipelines.ts` deleted, GET /api/pipelines wired through `api.pipelineRuns.*`. |
| TD-255 | `graph.db` contained stale deleted/archived paths and unsafe direct-scan guidance. | `build_graph_context_reconciliation_20260618` rebuilt via temp-then-swap and documented safe rebuild guidance. |
| TD-241 | React Router 7 migration completed; residual endpoint rewrites may need follow-up. | React Router 7 data-router migration completed; remaining endpoint rewrites are tracked separately. |

## Recently Resolved Or Obsolete

- Q-FIND-001..007 were resolved by `route_fixes_regression_20260613` and removed from active debt.
- TD-206 is resolved by `orchestrator_decomposition_20260605`.
- Older resolved items live in `measure/archive/tech-debt-resolved.md`.

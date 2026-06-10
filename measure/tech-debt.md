# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning. See `archive/tech-debt-resolved.md` for historical resolved items.

## Open Tech Debt

| ID | Description | Severity |
| --- | --- | --- |
| TD-200 | `convex/scoreAudit.ts:createScoreAudit` returns without `ctx.db.insert`; caller gets 200 with no row written | Critical |
| TD-201 | Missing `convex/auth.config.ts`; `resolveActor` falls back to anonymous bootstrap in all environments | Critical |
| TD-203 | `computeMarkdownHash` uses 32-bit djb2 instead of a stable SHA-256 prefix | Critical |
| TD-204 | `pivot/src/convexClient.ts` and `typedConvexClient.ts` are parallel implementations | Critical |
| TD-205 | `pivot/src/planning/recommender.ts` imports across pipeline boundary | Critical |
| TD-209 | Recovery/continuous-mode orchestrator exports are tested but dead in production | Critical |
| TD-211 | `computeDispatchPolicyStats` currently derives `p50Cost` from confidence-like data | Critical |
| TD-212 | `weeklyReport.ts` has top-level execution on import | Critical |
| TD-213 | `WorktreeManager` and `DispatchPacer` are exported but never instantiated | Critical |
| TD-214 | `applyBudgetPenalty` is dead in production and has incomplete policy semantics | Critical |
| TD-215 | Markdown editor and viewer duplicate inline parsing/rendering code | Critical |
| TD-216 | `SettingsPage.tsx` is a god-file with notification preference source-of-truth race | Critical |
| TD-217 | `useConvexData.ts` is a god-file with copied JSDoc across many hooks | Critical |
| TD-218 | `useConvexRealtime.ts` is a god-file of one-line wrappers and casts | Critical |
| TD-219 | `pivot/src/routes/git.ts` project lookup may route to a missing or wrong query | High |
| TD-220 | Pivot route test coverage is thin or absent for most routes | High |
| TD-221 | Legacy kanban remains a parallel implementation with one production caller | High |
| TD-222 | `useSprintHistoryQuery` returns identical start and end dates | High |
| TD-224 | `convex/employees.ts` uses string IDs and `_id` filters instead of `v.id` + `ctx.db.get` | High |
| TD-229 | `projectTemplates` schema in `convex/schema/core.ts` instead of modular `templates.ts`. Acceptable divergence; refactor when next template table is added. | Low |
| TD-236 | `measure/doctor.sh::check_as_any` never reads `as-any-allowlist.txt` (only cites it in help text), so the gate is red on 191 casts with no working exemption path; the allowlist's own format is also inconsistent (`path:substring:reason` vs `pathWithMarker:reason`). Fix: pin the format, then wire the matcher. | Medium |
| TD-237 | Latent type bugs on HEAD, independent of current tracks: `convex/lib/insights.ts:77` reads non-existent `sprint.pointsEstimated`; `convex/projects.ts:150` mutation export has a handler-signature mismatch. | Medium |
| TD-238 | `SaveAsTemplateModal.tsx` is built but imported by no page (orphaned); the "Save as Template" action is not wired into `ProjectViewPage` or any settings surface. `ProjectViewPage.saveAsTemplate.test.tsx` (2 tests) is red and spec AC "Custom template creation: Save as Template from any existing project" is unmet. project_template_marketplace was marked [x] and briefly archived on plan checkboxes alone; reverted to [~]. | High |
| TD-239 | Frontend suite has 4 red tests in `useDashboardData.test.ts` (1) and `DashboardPage.layout.test.tsx` (3) — BurnForecastCard render / projectId mismatch from budget_burn_forecasting. Long self-described as "pre-existing" in plans but never tracked or fixed. | Medium |
| TD-230 | Project Template Marketplace Phase 3 shipped without the two light Playwright E2E specs promised in test-strategy §1. Deferred to future sprint — not blocking archival. | Medium |
| TD-231 | Templated Red-phase prompt conflicts with project_template_marketplace_20260530 test-strategy §1. Process note; no code change required. | Low |
| TD-240 | `doctor.sh orphans` reports 660 exports. ~620 are false positives: React components/hooks used via JSX rendering edges (build-graph tracks `imports`/`calls` but not JSX element usage), Convex handlers registered via `query()`/`mutation()` decorators, and pivot route handlers registered via `router.get()`. True orphans are TD-209, TD-213, TD-238. Fix: add path-based exclusions (`frontend/src/components/`, `frontend/src/pages/`, `frontend/src/hooks/`, `frontend/src/layout/`, `convex/*/` handlers, `pivot/src/routes/`) or improve build-graph to track JSX rendering edges. Until fixed, the orphans gate is unusable at scale. | Medium |
| TD-241 | React Router 7 migration: convert BrowserRouter + Route declarations to data-router API, remove future flags, re-validate 28 Playwright e2e specs. Blocked on migration capacity. | High |
| TD-242 | Tailwind CSS 4 migration: replace PostCSS engine with Rust-based engine, migrate config format, convert ~40 component files from `@apply`. Blocked on migration capacity. | High |
| TD-243 | Vite 8 migration: blocked on `vite-plugin-pwa` Vite 8 peer support and `@vitejs/plugin-react` >=6.0. Re-evaluate when plugin ecosystem catches up. | Medium |
| TD-244 | ESLint 10 migration: validate full plugin set against ESLint 10 API. Remediates brace-expansion moderate. Blocked on `eslint-plugin-react` ESLint 10 compatibility. | Medium |
| TD-245 | TypeScript 6 migration: typecheck triplet + Convex codegen validation. Blocked on migration capacity. | Medium |
| TD-246 | 6 pivot route files (`abTests`, `agentTemplates`, `kanban`, `providers`, `sprintPlanning`, `taskTimeline`) still cast route params to `any` for Convex ID coercion after Phase 2 typed-API migration. 30 `as any` violations; fixing requires string-to-Id conversion in route param handling. | Medium |
| TD-247 | `convex/scheduler.ts` operates `employees`/`runs` tables in parallel to `agents`/`pipelineRuns` — legacy junk-drawer with no live callers in pivot. Quarantined with @deprecated boundary (2026-06-09). Safe to delete once `employees`/`runs` data migration is complete. | Low |
| TD-248 | `build-graph` does not resolve frontend `@/` Vite path aliases nor track JSX element edges or same-file route-handler wiring, producing false-positive orphan reports for 12 exports added by project_import_pipeline_20260609 Phase 2+3 (NewSprintModal, GenerateStoriesModal, useCreateSprint, useSaveAsTemplate, useStoryGeneration, makeTrackId, extractGoalFromSpec, mergeStoriesSection, createOpencodeStoryRunner, plus 4 storyGenerator helpers). Suppressed in `measure/orphans-allowlist.txt` under "TD-248 entries"; all verified used in production by grep + `tsc --noEmit`. Subsumed by TD-240 (build-graph fix) — remove this entry when TD-240's path-based exclusions / JSX edge tracking lands. | Low |

## Resolved (this review)

| ID | Resolution |
| --- | --- |
| TD-228 | Fixed: `ProviderHealthMonitor` now takes injectable `query`/`mutation` deps (default to real `convexClient` helpers); test no longer uses `mock.module('../convexClient')` or `mock.module('.../_generated/api')`. Those module mocks leaked globally and corrupted `api.*` reads in sibling stage tests. Aggregate pivot suite went from 1021 pass/18 fail → **1039 pass/0 fail**. |
| TD-233 | Fixed: narrowed active-state regex in `AppLayout.test.tsx` to exclude `hover:` pseudo-class (commit da54247). |
| TD-234 | `pivot/src/orchestrator/executor.ts::executeTaskWithFallback` has 3 contract gaps surfaced by Phase 3 Red-phase tests in `pivot/src/orchestrator/executor.fallback.test.ts`: (1) when all `maxFallbacks` retries fail, returns generic `"All fallback attempts exhausted"` instead of the last failure's `error`; (2) `maxFallbacks=0` still records a fallback event and returns "exhausted" — should be single-attempt with no event; (3) when `selectFallbackModel` returns null (all unhealthy), executor returns the failure without recording a final `fallbackEvent` with `fallbackTo=null` (per test-strategy §5 Phase 3). Implementation fix tracked as a follow-up task. |
| TD-235 | Fixed: Added separate `healthStatus` field to `providers` schema, migrated `updateProviderHealth` to write health values to `healthStatus` while preserving operational `status`, added `providerHealthStatus` validator, updated frontend `ProviderCard`/`ProvidersPage`/`useProviderHealth` to read `healthStatus`. Backfill mutation `backfillProviderHealthStatus` patches existing rows. Typecheck errors at `convex/providers.ts:199,213` resolved. Owned by provider_health_resilience. |
| TD-206 | Fixed: decomposed `runProject` god-function (1034→311 lines) via extract-stage-boundaries pattern in Phase 1–3 of `orchestrator_decomposition_20260605`. Removed from godfile-allowlist. |

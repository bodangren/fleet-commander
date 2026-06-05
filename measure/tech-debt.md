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
| TD-206 | `pivot/src/orchestrator/orchestrator.ts::runProject` is a 985-line god-function | Critical |
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
| TD-228 | `providerHealthMonitor.test.ts` uses `mock.module()` to mock Convex API, breaking test isolation for `recompute.test.ts` and other policy tests | High |
| TD-229 | `projectTemplates` schema in `convex/schema/core.ts` instead of modular `templates.ts`. Acceptable divergence; refactor when next template table is added. | Low |
| TD-230 | Project Template Marketplace Phase 3 shipped without the two light Playwright E2E specs promised in test-strategy §1. Deferred to future sprint — not blocking archival. | Medium |
| TD-231 | Templated Red-phase prompt conflicts with project_template_marketplace_20260530 test-strategy §1. Process note; no code change required. | Low |

## Resolved (this review)

| ID | Resolution |
| --- | --- |
| TD-233 | Fixed: narrowed active-state regex in `AppLayout.test.tsx` to exclude `hover:` pseudo-class (commit da54247). |
| TD-234 | `pivot/src/orchestrator/executor.ts::executeTaskWithFallback` has 3 contract gaps surfaced by Phase 3 Red-phase tests in `pivot/src/orchestrator/executor.fallback.test.ts`: (1) when all `maxFallbacks` retries fail, returns generic `"All fallback attempts exhausted"` instead of the last failure's `error`; (2) `maxFallbacks=0` still records a fallback event and returns "exhausted" — should be single-attempt with no event; (3) when `selectFallbackModel` returns null (all unhealthy), executor returns the failure without recording a final `fallbackEvent` with `fallbackTo=null` (per test-strategy §5 Phase 3). Implementation fix tracked as a follow-up task. |

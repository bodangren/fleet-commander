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
| TD-229 | Project Template Marketplace Phase 2: `projectTemplates` schema added to `convex/schema/core.ts` instead of a new `convex/schema/templates.ts` (test-strategy §4 "Schema file pattern"). Acceptable, but diverges from the documented modular pattern. | Low |
| TD-230 | Project Template Marketplace Phase 3 shipped without the two light Playwright E2E specs promised in test-strategy §1 (gallery smoke + create-from-template flow). Phase 3 plan tasks did not enumerate them, so they were silently skipped. Phase 4 is manual + regression, so this gap is not closed by the current verification phase. | Medium |
| TD-231 | Templated Red-phase prompt conflicts with project_template_marketplace_20260530 test-strategy §1 ("Phase 4 — No new automated tests; Manual + Regression"). No new failing tests were written; Phase 4 verification proceeded as a regression run only. Future Phase 4 prompts should branch on phase type or check the strategy first. | Low |
| TD-233 | `AppLayout.test.tsx` "does not mark active on different route" fails because regex `/bg-\[#0f1011\]/` matches `hover:bg-[#0f1011]` in non-active NavLink className. Test is over-broad: cannot distinguish active state from hover pseudo-class. Fix requires either narrowing the regex (test change) or restructuring hover styling (pattern change). | Medium |

# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning. See `archive/tech-debt-resolved.md` for historical resolved items.

## Open Tech Debt

| ID | Description | Severity |
| --- | --- | --- |
| TD-200 | `convex/scoreAudit.ts:createScoreAudit` returns without `ctx.db.insert`; caller gets 200 with no row written | Critical |
| TD-201 | Missing `convex/auth.config.ts`; `resolveActor` falls back to anonymous bootstrap in all environments | Critical |
| TD-202 | `pivot/src/reconciliation/sweep.ts` canonical state load/save are no-op stubs | Resolved |
| TD-203 | `computeMarkdownHash` uses 32-bit djb2 instead of a stable SHA-256 prefix | Critical |
| TD-204 | `pivot/src/convexClient.ts` and `typedConvexClient.ts` are parallel implementations | Critical |
| TD-205 | `pivot/src/planning/recommender.ts` imports across pipeline boundary | Critical |
| TD-206 | `pivot/src/orchestrator/orchestrator.ts::runProject` is a 985-line god-function | Critical |
| TD-207 | `runAutoRunner` has racy async interval closure | Resolved |
| TD-208 | `sendPromptToSession` has residual flag-based timeout race | Resolved |
| TD-209 | Recovery/continuous-mode orchestrator exports are tested but dead in production | Critical |
| TD-210 | `scheduler.ts` is a parallel task-execution pipeline to `runProject` | Resolved |
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

## Resolved by Review Remediation Track

| ID | Description | Resolution |
| --- | --- | --- |
| TD-148 | Portfolio health dead-code statuses | Fixed: uses `'closed'`/`'active'`/`'planned'`; green for closed within budget |
| TD-149 | Agent template delete `as any` | Fixed: added `templateId` field + `by_templateId` index |
| TD-150 | Retrospective query divergence | Fixed: `getSprintAggregateData` now calls tested `aggregateSprintData` |
| TD-151 | Similarity denominator bug | Fixed: uses truncated lengths in both Convex and pivot implementations |
| TD-152 | Scheduler template params | Fixed: `runSchedulerTick` calls `executeTaskWithEmployee` |
| TD-153 | Rejection reasons from dispatch | Fixed: queries task `rejectionReason` field |
| TD-157 | Three `formatDuration` implementations | Fixed: extracted to shared `frontend/src/lib/formatDuration.ts` |

## Resolved by Secondary Remediation Track

| ID | Description | Resolution |
| --- | --- | --- |
| TD-223 | Convex analytics handlers collect all tasks then filter in memory | Fixed: by_updated_at index + `.take(1000)` in analytics.ts; indexed queries in fleet.ts, dashboard.ts, performance.ts |
| TD-225 | Convex handler semantic gaps — 12 `.collect().filter()` patterns | Partially fixed: analytics, fleet, dashboard, performance bounded; portfolio, employees, retrospectives, history deferred to primary track |
| TD-226 | Frontend test fixture drift — MockSprint.budget mismatch | Fixed: MockSprint updated to flat DashboardSprint shape; convex-provider.tsx adapter simplified |
| TD-227 | `pipeline_unification_scheduler_20260605` Phase 5 asks to "write failing Red-phase tests," but the test strategy §1 says "No new automated tests — this phase validates the whole system" and §5 scopes Phase 5 to manual + smoke (AutoRunner overlap, circular-dep, Diagnose `getReconciliationStatus`) plus the existing `bun test` + typecheck. Resolution: honor the strategy; the only remaining `[ ]` task ("Commit and push") is not test-writing. Track metadata `status: "complete"`, 6-of-7 Phase 5 tasks already `[x]`. |

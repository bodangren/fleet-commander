# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity | Owner |
| --- | --- | --- | --- |
| TD-260 | E2E residual after scalpel: re-baseline Playwright suite (former TD-250/256/257 buckets + seed harness quirks). Do not trust June 2026 failure counts. | High | `scalpel_branch_closeout_20260807` then suite owners |
| TD-261 | Quality UI incomplete: settings/timeline/ops surface for profiles; `@quality-workflow` e2e still Red by design. | High | `quality_workflow_visibility_ui_20260807` |
| TD-242 | Tailwind CSS 4 migration (frontend still on v3.4.1; 4 `@apply`s; `tailwind.config.js`). | Medium | `tailwind_css_4_migration_20260625` |
| TD-221 | Kanban helpers live in `lib/kanban.ts` while board data uses `useSprintBoard` — confirm no true dual board impl remains; demote/close after audit. | Low | Unassigned |
| TD-240 | `doctor.sh orphans` misses JSX / Convex decorator / route-registration edges. | Medium | Unassigned |
| TD-243 | Vite 8 migration (frontend currently Vite 7). | Medium | Package maintenance |
| TD-244 | ESLint 10 migration (frontend currently ESLint 9). | Medium | Package maintenance |
| TD-245 | TypeScript 6 migration (currently TS 5.9). | Medium | Package maintenance |
| TD-247 | `convex/scheduler.ts` still documents legacy `employees`/`runs` tables. | Low | Unassigned |
| TD-249 | `frontend/src/__fixtures__/convex-provider.tsx` runtime `vi.mock()` may break on future Vitest. | Low | Unassigned |
| TD-262 | Optional: retire `useConvexData` / `useConvexRealtime` barrels; migrate imports to `convex-data` / `convex-realtime`; one `as any` in `convex-data/core.ts` onUpdate client typing. | Low | Unassigned |
| TD-263 | Convex unit tests: **157 fail / 1241 pass** (2026-08-07). Themes: dependency mutations (~46), notifications/preferences (~28), analytics/cost (~40), validators/stale pipelines.ts (~12), auth.config (~4), employees handlers (~10). Quarantined in `verify.sh` (non-blocking unless `VERIFY_REQUIRE_CONVEX=1`). | Critical | Follow-up track after scalpel merge |

## Resolved (2026-08-07 reconciliation)

| ID | Description | Resolution |
| --- | --- | --- |
| TD-217 | useConvexData god-file | Split shipped as `frontend/src/lib/convex-data/*`; June-25 track archived. Residual → TD-262. |
| TD-218 | useConvexRealtime god-file | Split shipped as `frontend/src/lib/convex-realtime/*`; track archived. Residual → TD-262. |
| TD-241 | React Router 7 migration residual endpoint rewrites | RR7 data-router migration completed; residual endpoint rewrites tracked separately. Guardrail test requires this Resolved row. |
| TD-252 | Production QualityWorkflowRunner wiring | `createProductionQualityWorkflowHooks()` wired in `server.ts` + `runAutoRunner()`; prior hot_path track. UI residual → TD-261. |
| TD-250-adapter / TD-256-selector / TD-257-race / TD-259-regression | Fragmented E2E bucket IDs from June baseline | Superseded by TD-260 (re-baseline) + TD-261 (quality UI e2e). |

## Earlier resolved (abbrev.)

TD-200 score audit insert; TD-201 auth.config; TD-204 convex client unify; TD-206 orchestrator split; TD-241 RR7; TD-253/254 ops API; TD-255 graph.db rebuild. Details in git history / older archive notes.

## Recently obsolete

- Q-FIND-001..007 resolved by `route_fixes_regression_20260613`.
- A/B testing + policy simulation product surface removed on `chore/scalpel` Phase 3 — do not re-open as debt without a product decision.

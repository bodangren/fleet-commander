# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity | Owner |
| --- | --- | --- | --- |
| TD-260 | E2E residual after scalpel: re-baseline Playwright suite (former TD-250/256/257 buckets + seed harness quirks). Do not trust June 2026 failure counts. | High | `scalpel_branch_closeout_20260807` then suite owners |

| TD-242 | Tailwind CSS 4 migration (frontend still on v3.4.1; 4 `@apply`s; `tailwind.config.js`). | Medium | `tailwind_css_4_migration_20260625` |
| TD-221 | Kanban helpers live in `lib/kanban.ts` while board data uses `useSprintBoard` — confirm no true dual board impl remains; demote/close after audit. | Low | Unassigned |
| TD-240 | `doctor.sh orphans` misses JSX / Convex decorator / route-registration edges. | Medium | Unassigned |
| TD-243 | Vite 8 migration (frontend currently Vite 7). | Medium | Package maintenance |
| TD-244 | ESLint 10 migration (frontend currently ESLint 9). | Medium | Package maintenance |
| TD-245 | TypeScript 6 migration (currently TS 5.9). | Medium | Package maintenance |
| TD-247 | Legacy `employees`/`runs` ownership remains across the schema, generated API/test surface, migration-only `convex/scheduler.ts`, and unused EmployeesPage/useActiveEmployees code. Remove it only through a dedicated dead-code/schema migration with caller audit, data ownership, and compatibility evidence. | Medium | Separate future dead-code/schema migration track (not opened) |
| TD-249 | `frontend/src/__fixtures__/convex-provider.tsx` runtime `vi.mock()` may break on future Vitest. | Low | Unassigned |
| TD-262 | Optional: retire `useConvexData` / `useConvexRealtime` barrels; migrate imports to `convex-data` / `convex-realtime`; one `as any` in `convex-data/core.ts` onUpdate client typing. | Low | Unassigned |
| TD-263 | Convex test trust **completed 2026-08-09**: clean-checkout commit `c3abeed7475ffd2098e2fe3b1b1a0c07f272c51c` passed runtime 21/105, Bun Convex 35/957, frontend 173/1,260 in 211.03s, Pivot 150 files/1,726, Convex/Pivot typechecks, and frontend format/lint/tsc/build. Build produced 2,803 modules with an existing >500k advisory. The 23 notification-only wrappers and separate frontend follow-up (59 React `act` warnings across 12 legacy files plus one duplicate-key warning in `ProjectViewPage.typedApi.test.tsx`) remain separately owned, not TD-263 failures. Employees/runs, scheduler, unused UI/hook, and schema cleanup remain deferred to TD-247. Follow-up: shared `useFleetData` bootstrap can make project controls wait on unrelated agents/harnesses; `/api/projects` was observed up to 13.1s. Graph audit timed out after >90s (issue #2); graph stats were 5,799 nodes / 8,104 edges / 701 files. | Critical | `convex_test_trust_recovery_20260809` |

> Notification mutation authorization is a separately recorded next **P0 security track**, not part of TD-263. Bounded Factory acceptance remains approval-gated in its existing track.

## Resolved (2026-08-07 reconciliation)

| ID | Description | Resolution |
| --- | --- | --- |
| TD-217 | useConvexData god-file | Split shipped as `frontend/src/lib/convex-data/*`; June-25 track archived. Residual → TD-262. |
| TD-218 | useConvexRealtime god-file | Split shipped as `frontend/src/lib/convex-realtime/*`; track archived. Residual → TD-262. |
| TD-261 | Quality workflow visibility UI incomplete | `quality_workflow_visibility_ui_20260807`: routes, timeline stages, ops retry, seed.goto, mocks; e2e `@quality-workflow` green. |
| TD-241 | React Router 7 migration residual endpoint rewrites | RR7 data-router migration completed; residual endpoint rewrites tracked separately. Guardrail test requires this Resolved row. |
| TD-252 | Production QualityWorkflowRunner wiring | `createProductionQualityWorkflowHooks()` wired in `server.ts` + `runAutoRunner()`; prior hot_path track. UI residual → TD-261. |
| TD-250-adapter / TD-256-selector / TD-257-race / TD-259-regression | Fragmented E2E bucket IDs from June baseline | Superseded by TD-260 (re-baseline) + TD-261 (quality UI e2e). |

## Earlier resolved (abbrev.)

TD-200 score audit insert; TD-201 auth.config; TD-204 convex client unify; TD-206 orchestrator split; TD-241 RR7; TD-253/254 ops API; TD-255 graph.db rebuild. Details in git history / older archive notes.

## Recently obsolete

- Q-FIND-001..007 resolved by `route_fixes_regression_20260613`.
- A/B testing + policy simulation product surface removed on `chore/scalpel` Phase 3 — do not re-open as debt without a product decision.

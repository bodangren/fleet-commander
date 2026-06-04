# Graph Node Audit — Master Report

**Repo:** fleet-commander
**Date:** 2026-06-02
**Scope:** 493 architecturally-significant nodes across 6 slices; 1,651 node reviews; 68+ originating tracks from `measure/archive/`
**Method:** See `measure/reviews/graph-node-audit/METHODOLOGY.md`

## 1. Executive Summary

**17 critical and 47 high findings** surfaced across pivot, frontend and convex. Three themes dominate the entire codebase: **(1) plans that were "delivered" but never integrated** — orphan exports and dead-code subsystems inflate pivot by ~2,000 LOC and account for 9 of 17 Criticals; **(2) two parallel implementations in every layer** — duplicate markdown parsers, duplicate kanban stacks, duplicate dashboard pages, duplicate Convex client wrappers, duplicate task-type systems, duplicate scheduling engines — drift has compounded across 6 weeks of overlapping tracks; **(3) red-phase TDD without green follow-up** — empty `*.test.ts` files and stub mutations returning `null` are the rule, not the exception (21 of 27 pivot routes have no tests; `scoreAudit.createScoreAudit` returns the input without inserting it; `convex/migrate.ts` and `seed.ts` are no-op stubs). The strongest signal of overall codebase health is that the **pure-function libraries at the convex/policy boundary are exemplary** (`convex/lib/{analytics,performance,budget,cost,insights}.ts` — no `ctx`, no globals, tested against synthetic inputs) and the **adapters at the convex/pivot boundary are clean** (`dataAdapter.ts`, `convexClient.ts`); the damage is concentrated in the *composition* layer above these solid foundations, where plans stopped short of wiring their deliverables into the hot path.

## 2. Aggregate Findings Table

| Slice | Files | Nodes | Critical | High | Medium | Low |
|-------|-------|-------|----------|------|--------|-----|
| 1 pivot/orchestrator | 56 | 142 | 4 | 9 | 14 | 4 |
| 2 pivot/policy+pipeline | 44 | 198 | 4 | 7 | 6 | 3 |
| 3 pivot/rest | 130 | 457 | 5 | 8 | 7 | 4 |
| 4 frontend/pages+components | 132 | 372 | 1 | 6 | 9 | 7 |
| 5 frontend/lib+hooks | 50 | 360 | 2 | 9 | 11 | 5 |
| 6 convex | 81 | 122 | 1 | 8 | 10 | 4 |
| **Total** | **493** | **1651** | **17** | **47** | **57** | **27** |

## 3. Cross-Slice Patterns (the leverage points)

1. **Orphan exports — "plan delivered, integration skipped"** · appears in slices 1, 2, 3, 5, 6 · root cause: tracks declared the integration phase and then marked it complete; the deliverables are unit-tested but never wired into the production hot path. Examples: `RecoveryDispatcher` + `HealthCheckLoop` + 5 continuous-mode classes (slice 1, ~1,000 LOC), `WorktreeManager` + `DispatchPacer` (slice 2), `applyBudgetPenalty` + `selectHarnessByEconomics` (slice 2), `convexProjectToSummary.tracks: []` placeholder (slice 5), `dispatchPolicyStats` + `scoreAudit` stub mutations (slice 6), `convex/migrate.ts` + `convex/seed.ts` no-ops (slice 6). **Proposed track: `chore(measure): orphan-exports audit & wire-or-delete`** — one bulk pass to either wire the deliverable into the orchestrator tick loop or delete it. Highest-leverage single cleanup in the audit.

2. **Two parallel implementations of the same concept** · appears in slices 1, 4, 5, 6 · root cause: when a track replaces a subsystem it leaves the old one in place; the next track then either builds on the new one (good) or re-uses the old (bad). Examples: `runProject` vs `runSchedulerTick` (slice 1), `MarkdownEditor.tsx` vs `MarkdownViewer.tsx` with byte-identical `parseInlineTokens` (slice 4, Critical), `components/legacy/KanbanBoard.tsx` vs `components/kanban/*` (slice 4), `AnalyticsPage` vs legacy `AnalyticsDashboard` (slice 4), `convexClient.ts` vs `typedConvexClient.ts` (slice 3, Critical), `convex/lib/types.ts` duplicates vs in-file `*Doc` interfaces in `lib/retrospective.ts` (slice 6), `MockSprint.budget` nested vs `DashboardSprint.budget` flat (slice 5). **Proposed track: `chore(measure): parallel-implementation resolution`** — for each duplicate pair, pick the canonical one, delete the other, fix the consumer.

3. **Boundary leaks across pivot ↔ frontend ↔ convex** · appears in slices 3, 5, 6 · root cause: each layer has a public type surface, but the implementations leak across. Examples: `planning/recommender.ts` imports from `../pipeline/agentTypes` (slice 3 imports from slice 2), `convex/lib/types.ts` is the canonical types file but `lib/retrospective.ts` has 5+ parallel `*Doc` interfaces (slice 6), `convexProjectToSummary` reshapes Convex records to legacy pivot types that no longer match (slice 5), `convex/employees.ts:5×` uses `v.string() + as any` for IDs that should be `v.id('employees')` (slice 6). **Proposed track: `chore(measure): boundary-contract cleanup`** — three small refactors that establish a single source of truth for each shared type.

4. **Hand-rolled validation in place of zod schemas** · appears in slices 1, 3, 5, 6 · root cause: routes and handlers cast `Record<string, unknown>` + field-by-field assertions instead of using generated Convex validators or zod. Examples: all 27 pivot route files do `(await request.json()) as Record<string, unknown>` (slice 3), `convex/recommenderClient.ts:24-82` returns `Record<string, unknown>` (slice 3), `convex/scoreAudit.ts` and `convex/dispatchPolicyStats.ts` return `args` without writing (slice 6), `convex/agents.ts:createScoreAudit` returns the constructed object without inserting (slice 6, Critical). **Proposed track: `chore(measure): route-body zod migration`** — add a `routeBody(schema)` helper to `pivot/src/routes/router.ts` and migrate the high-traffic endpoints.

5. **Test-coverage shape (red-phase TDD without green)** · appears in slices 3, 4, 5, 6 · root cause: tracks created the test file but the actual test cases were never written, OR the tests don't exercise the wired path. Examples: 21 of 27 `pivot/src/routes/*.ts` files have no sibling test (slice 3), `convexRetry.test.ts` is empty (slice 3), `computeBaselines.test.ts` has 1 node (slice 3), no `.test.ts` files alongside `useConvexData.ts` / `useConvexRealtime.ts` (slice 5), `convex/*.test.ts` relies on in-house `createMockCtx` mock (slice 6) — never exercises real Convex transaction/index semantics. **Proposed track: `chore(measure): test-coverage closure`** — for every empty test file or uncovered hot-path module, write the obvious cases first.

6. **God-files and mega-functions that absorb too much** · appears in slices 1, 2, 4, 5 · root cause: as new phases ship they accumulate inline rather than being split. Examples: `pivot/src/orchestrator/orchestrator.ts::runProject` is 985 lines with 5+ distinct exit paths and 3 places that persist `workRun` (slice 1, Critical), `useConvexData.ts` is 1,137 LOC / 55 nodes (slice 5, Critical), `useConvexRealtime.ts` is 399 LOC / 45 nodes (slice 5, Critical), `useAgentForm.ts::useAgentActions` is 178 LOC across 5 action handlers (slice 5, High), `OptimizePage.tsx` is 490 lines with 3 inner subcomponents and a `window.location.reload()` (slice 4, High), `SettingsPage.tsx` is 404 lines with 3 direct fetches and a 8-`useState` race condition (slice 4, Critical), `ProjectViewPage.tsx` is 345 lines and the *only* non-test caller of the legacy kanban (slice 4, High). **Proposed track: `chore(measure): god-file and god-function split`** — one refactor per god-file, kept in lockstep with the orphan-exports track.

7. **JSDoc copy-paste, missing JSDoc, or stale summaries** · appears in slices 1, 5, 6 · root cause: indexer template JSDoc or AI-generated boilerplate propagated to every hook. Examples: 30+ hooks in `useConvexData.ts` share the same `Subscribe to a Convex query imperatively` docstring that's only true for `useConvexQuery` (slice 5, High), `useConvexRealtime.ts:207` has a copy-paste typo `React hook hook metrics` (slice 5, Low), `convex/lib/retrospective.ts` has 6 interfaces with empty `summary: ""` in the graph (slice 6, Medium), 12+ frontend pages have placeholder JSDoc `/** Renders a page component */` (slice 4, Low). **Proposed track: `chore(measure): JSDoc and graph-summary pass`** — replace boilerplate with one-liner per hook, document orphan summaries.

8. **Stub mutations returning `null` / `args` without writing** · appears in slices 2, 6 · root cause: a Phase 1 placeholder was wired into the public API and never replaced. Examples: `convex/scoreAudit.ts:createScoreAudit` returns the constructed object without `ctx.db.insert` (slice 6, Critical), `convex/dispatchPolicyStats.ts:upsertDispatchPolicyStats` returns `args` (slice 6), `convex/migrate.ts:migrateSimplifiedSchema` returns `null` (slice 6, High), `convex/seed.ts:seedDemoData` returns `null` (slice 6), `pivot/src/reconciliation/sweep.ts:loadCanonicalState`/`saveCanonicalState` are no-op stubs (slice 3, Critical). **Proposed track: `chore(measure): stub-mutation audit** — sweep the public API for `return null` / `return args` patterns and either implement or remove the export.

9. **String-as-enum and silent `as any` casts across the Convex boundary** · appears in slices 1, 3, 5, 6 · root cause: Convex's generated `Id<>` and `Doc<>` types are not used at the boundary; instead strings + casts. Examples: `convex/employees.ts:5×` does `args.id as any` to satisfy `_id` (slice 6, High), `convex/taskTimeline.ts:128,136,138,141,142` uses `as unknown as WithCreationTime<typeof agent>` (slice 6, High), `pivot/src/orchestrator/orchestrator.ts:updateTaskStatus` does a hidden string-literal cast (slice 1, High), `pivot/src/candidates.ts:44,60` uses `as any` for Convex query results (slice 1, Medium), `convex/projects.ts` is missing the `auth.config.ts` file (slice 6, Critical). **Proposed track: `chore(measure): type-safe Convex ID migration`** — change arg validators to `v.id(table)` and remove every `as any` cast.

10. **Three sources of "is X available" / duplicated env-var readers** · appears in slices 3, 5, 6 · root cause: every module that needs a config flag re-reads the env at module load. Examples: `isConvexAvailable` (convex.ts:7-9), `hasConvexUrl` (ConvexProvider.tsx:29-31), and inline `convexUrl` truthy check in `useConvexQuery` (slice 5, High). Same shape for `convexClient.ts` vs `typedConvexClient.ts` (slice 3, Critical) and `dataAdapter.ts: getSliceConfig` (slice 5, OK as the canonical entry). **Proposed track: `chore(measure): single-source-of-truth env helpers`** — `getConvexUrl()` and `isConvexAvailable()` as the only two exports.

## 4. Package Health Scorecard

| Package | Files | Critical+High | Verdict | One-Line Why |
|---------|-------|---------------|---------|--------------|
| pivot   | 230   | 37            | red     | Two competing schedulers, ~2,000 LOC of un-integrated plans, a reconciliation engine that always reports "added" divergences, a 985-line `runProject` god-function. |
| frontend| 182   | 18            | yellow  | Two parallel kanban stacks, two parallel markdown parsers, two parallel dashboard pages, but the new page-and-hook patterns (SimulatePage wrapper, KanbanBoardPage, dashboard/AgentStatus) are healthy. |
| convex  | 81    | 9             | yellow  | Pure-function libs are exemplary; query/mutation handlers are the weak layer (N+1, .collect().then filter, missing `auth.config.ts`, no-op `createScoreAudit`). |

## 5. Track Quality Rollup

Top 10 tracks that produced the highest density of Critical+High findings. **Track-mapping is heuristic** (date-window + subject-match + path-keyword) — see §10 caveats.

| Rank | Track | Crit+High | Dominant pattern |
|------|-------|-----------|------------------|
| 1 | `frontend_convex_migration_20260402` | **8** (3C + 5H) | God-file explosion (`useConvexData.ts` 1137 LOC, `useConvexRealtime.ts` 399 LOC), copy-pasted JSDoc on 30+ hooks, `convexProjectToSummary.tracks: []` placeholder, 3 sources of "is Convex available", `useSprintHistoryQuery startDate === endDate` bug. |
| 2 | `continuous_orchestration_20260405` (+ self_healing_20260502 REDUNDANT) | 5 (4C + 1H) | 7 dead-code files (`RecoveryDispatcher`, `HealthCheckLoop`, `CircuitBreaker`, `ContinuousModeManager`, `TaskQueue`, `ConcurrencyLimiter`, `AutoPauseHandler`), `runAutoRunner` racy closure, `weeklyReport.ts` top-level `await main()`, WAL replay silent error swallow. |
| 3 | `agent_harness_management_ui_20260327` | 4 (1C + 3H) | `ProjectViewPage` uses the legacy kanban stack while the rest of the app uses the new one; `MarkdownEditor.tsx` (419 LOC) was later duplicated by `MarkdownViewer.tsx`; inline color hex codes bypassing design tokens. |
| 4 | `environment_management_20260330` | 4 (1C + 3H) | `convex/scoreAudit.ts:createScoreAudit` returns args without `ctx.db.insert` (Critical); `convex/fleetCatalog.ts:getBootstrapSummary` 8× `.collect()` (TD-029); `routes/git.ts:15` references `getProjectByNameHandler` that doesn't exist; `updateTaskStatus` hidden string-literal cast. |
| 5 | `dashboard_20260517` | 3 (0C + 3H) | Three pairs of duplicate top-level pages (AnalyticsPage vs AnalyticsDashboard, CostsPage vs CostDashboard, PerformancePage vs PerformanceDashboard); `MockSprint.budget` nested vs `DashboardSprint.budget` flat; 4 red-phase test commits with 1-2 nodes of green coverage. |
| 6 | `pipeline_engine_20260517` | 2 (0C + 2H) | `PipelineOrchestrator` lumps all-stage retry budget; `pipeline/agentTypes.ts:Task` collides with `orchestrator/types.ts:Task`; `STAGE_ORDER` import unused; `processTask` has dead sprint-cost block. |
| 7 | `virtual_software_house_mvp_20260516` | 2 (1C + 1H) | `scheduler.ts` reintroduces the CLI path that `agent_scheduling_execution_20260313` deprecated (Critical); `convex/employees.ts:5×` filter-by-`_id` (High); `lib/employees.ts` orphan. |
| 8 | `resource_allocation_policy_20260415` | 2 (2C + 0H) | `WorktreeManager` and `DispatchPacer` exported, tested, never instantiated in production. |
| 9 | `state_reconciliation_engine_20260415` | 2 (2C + 0H) | `reconciliation/sweep.ts:loadCanonicalState`/`saveCanonicalState` are no-op stubs (every track flagged `added`); `computeMarkdownHash` uses 32-bit djb2 (birthday-collision territory). |
| 10 | `economic_control_plane_20260415` | 2 (1C + 1H) | `applyBudgetPenalty` is dead in production and special-cases only `strict` policy; `shouldEscalateRetry` has the same `soft`/`advisory` gap. |

Notable near-misses (single Critical+High): `fix_yaml_safe_schema_20260425` (BunStepExecutor AbortSignal bug, High), `settings_config_page_20260330` (SettingsPage 404-line body + dual-source-of-truth, Critical), `auth_authorization_20260502` (missing `auth.config.ts` + anonymous-bootstrap, Critical latent).

## 6. Top-25 Master Improvement Queue

Cross-slice priority list. Effort: XS (< 1h) · S (1-4h) · M (1-2d) · L (3-5d). Items in **bold** are Critical.

| Rank | Severity | Slice | Node / area | Effort | Recommendation |
|------|----------|-------|-------------|--------|----------------|
| 1 | **Critical** | 6 | `convex/scoreAudit.ts:createScoreAudit` | XS | Add `ctx.db.insert('scoreAudit', args)`; otherwise remove the export. |
| 2 | **Critical** | 6 | `convex/lib/auth.ts:resolveActor` + missing `convex/auth.config.ts` | S | Create `auth.config.ts` with a real OIDC provider; gate `anonymous-bootstrap` behind `process.env.NODE_ENV === 'development'`. |
| 3 | **Critical** | 3 | `pivot/src/reconciliation/sweep.ts:loadCanonicalState`/`saveCanonicalState` (no-op stubs) | M | Implement against Convex (`reconciliationProposals.getCanonicalState`); otherwise remove the export. |
| 4 | **Critical** | 3 | `pivot/src/reconciliation/hash.ts:computeMarkdownHash` (32-bit djb2) | XS | Swap to SHA-256 (`node:crypto`), truncate to 16 hex chars. |
| 5 | **Critical** | 3 | `pivot/src/convexClient.ts` ↔ `pivot/src/typedConvexClient.ts` (parallel implementations) | S | Delete the `convexClient.ts` variant; migrate `server.ts` to the typed version. |
| 6 | **Critical** | 3 | `pivot/src/planning/recommender.ts` boundary leak (imports from `../pipeline/*`) | S | Move `recommender.ts` into `pivot/src/pipeline/` or inline the `Agent`/`Task` types. |
| 7 | **Critical** | 1 | `pivot/src/orchestrator/orchestrator.ts::runProject` (985 LOC, 5+ exit paths) | L | Refactor into pipeline stages (`loadTasks → score → checkBudget → checkCircuit → execute → persist → review`). See `tech_debt_remediation_20260516` Phase 4. |
| 8 | **Critical** | 1 | `pivot/src/orchestrator/autoRunner.ts::runAutoRunner` (racy closure) | S | Restructure: read interval once, then `setTimeout(readInterval, run)`; add a regression test. |
| 9 | **Critical** | 1 | `pivot/src/orchestrator/sdkClient.ts::sendPromptToSession` (timeout race) | S | Use `AbortController` (the SDK takes a signal) or rename to `flagBasedTimeout` and document. |
| 10 | **Critical** | 1 | `pivot/src/orchestrator/{recoveryDispatcher,continuousMode,continuousOrchestrator,autoPauseHandler,concurrencyLimiter,taskQueue,circuitBreaker,stalledDetector}.ts` (~1,000 LOC dead code) | M | Pick one path: delete 6 files + tests, OR wire `RecoveryDispatcher` into the orchestrator's main tick and remove inline checks. |
| 11 | **Critical** | 1 | `pivot/src/orchestrator/scheduler.ts` (parallel scheduler with `runProject`) | M | Pick one. If `runProject` wins, delete `scheduler.ts`. If `runSchedulerTick` wins, migrate to use Symphony backoff and the OpenCode SDK path. |
| 12 | **Critical** | 2 | `pivot/src/policy/rollup.ts:computeDispatchPolicyStats` (`p50Cost` from `architectConfidence`) | M | Add real `costUsd` field; either compute from `costTracker.calculateStageCost` or rename `p50Cost` to `p50Confidence` end-to-end. |
| 13 | **Critical** | 2 | `pivot/src/policy/weeklyReport.ts` (top-level `await main()`) | S | Wrap in `if (import.meta.main) await main();`; delete the duplicated 47 lines in `weeklyReport.test.ts`. |
| 14 | **Critical** | 2 | `pivot/src/policy/{allocator,allocator:WorktreeManager,allocator:DispatchPacer}` (orphans) | S-M | Delete or wire into orchestrator tick. |
| 15 | **Critical** | 2 | `pivot/src/policy/economic.ts:applyBudgetPenalty` (dead, magic 1000, soft/advisory ignored) | M | Wire into `selectBestCandidate` and document units, or delete. |
| 16 | **Critical** | 4 | `frontend/src/components/MarkdownViewer.tsx` ↔ `MarkdownEditor.tsx` (parseInlineTokens byte-for-byte) | M | Extract to `lib/markdown.tsx`; both files import from it. |
| 17 | **Critical** | 4 | `frontend/src/pages/SettingsPage.tsx` (404 lines, 3 fetches, 8 useState, dual-source-of-truth race) | L | Split into 4 page files; create `useAppConfig` + `useNotificationPreferences` hooks; fix the `preferences`→`prefState` race. |
| 18 | **Critical** | 5 | `frontend/src/lib/useConvexData.ts` (1,137 LOC / 55 nodes god-file) | M | Split into 10 domain files (`useConvexCatalog.ts`, `useConvexCoverage.ts`, etc.). |
| 19 | **Critical** | 5 | `frontend/src/lib/useConvexRealtime.ts` (399 LOC / 45 nodes god-file) | S | Split into 5 domain files; propagate generics; remove the `(args as Record<string, unknown>)` cast. |
| 20 | High | 3 | `pivot/src/routes/git.ts:15` references `getProjectByNameHandler` not exported by `routes/projects.ts` (probable 500) | XS | Grep `convex/` for the actual function name; either rename or wire the correct one. |
| 21 | High | 3 | 21 of 27 `pivot/src/routes/*.ts` lack sibling tests | L | Prioritise `projects`, `git`, `agents`, `sprints`; copy the `orchestrator.test.ts` request-mock + Convex-mock pattern. |
| 22 | High | 4 | `frontend/src/components/legacy/KanbanBoard.tsx` (469 lines, single non-test caller) | M | Migrate `ProjectViewPage` to `components/kanban/*`; delete the legacy file. |
| 23 | High | 5 | `useSprintHistoryQuery` (useConvexData.ts:829-834) returns `startDate === endDate` | S | Drop the alias or query the right field. |
| 24 | High | 6 | `convex/analytics.ts:4 functions` do `.collect()` then in-memory filter | M | Add `by_updated_at` index to `tasks`; switch to `.withIndex('by_updated_at', q => q.gte('updatedAt', cutoff)).take(1000)`. |
| 25 | High | 6 | `convex/employees.ts:5 handlers` use `.filter(_id)` + `as any` (should be `ctx.db.get(id)` with `v.id('employees')`) | S | Replace all 5 with `await ctx.db.get(args.id)` after changing the arg type. |

## 7. Spec ↔ Implementation Drift Highlights

| Track | Phase | Spec said | Code does | Impact |
|-------|-------|-----------|-----------|--------|
| `frontend_convex_migration_20260402` | "Add Convex data hooks, adapter boundary" | Small set of Convex hooks; clean adapter | 1,137 LOC god-file with 40+ hooks; "adapter boundary" pattern OK in `dataAdapter.ts` but every track added 5-10 hooks to `useConvexData.ts` | Navigation, tree-shaking, test cost; copy-pasted JSDoc on every hook |
| `continuous_orchestration_20260405` | Phase 1: Continuous Mode State | `ContinuousModeState` type + `startContinuousLoop` using `setInterval` | Type + class defined; orchestrator uses recursive `setTimeout` (not `setInterval`) | Continuous mode is the documented intent; the chosen primitive is different and the primitives are mostly dead |
| `continuous_orchestration_20260405` | Phase 3: Queue Management | `TaskQueue` with priority ordering (critical > high > medium > low, FIFO tie-break) | `TaskQueue` implemented exactly to spec but unused | Implementation correct; integration skipped |
| `self_healing_20260502` (REDUNDANT) | Phase 1: Stalled Detection | "Transition stalled tasks to failed with reason='stalled' / Log stall detection to recoveryLog" | `RecoveryDispatcher.detectStalled` exists but is never called by `runProject`; the inline recovery path uses eventType `'retry'` not `'stalled'` | Stalled path is not implemented; the audit pattern reports `retry` instead of `stalled` |
| `state_reconciliation_engine_20260415` | (Phase 1) | "Reconciliation engine with persistable canonical state" | `loadCanonicalState`/`saveCanonicalState` are no-op stubs; sweep builds empty `CanonicalState` and always reports `added` | Reconciliation decisions cannot rely on the engine output |
| `economic_control_plane_20260415` | Phase 3 (Orchestrator Integration) | "Hook `applyBudgetPenalty` into B2 scoring output / `shouldEscalateRetry` into recovery decisions / `selectHarnessByEconomics` into harness selection" | None of the four modulators are imported outside the test file | Economic control plane has zero runtime effect |
| `resource_allocation_policy_20260415` | Phase 3 (Worktree Manager) | "Emit governance event on reclaim" | `WorktreeManager` exported + tested; `reclaimStale` has no caller | Plan's deviation is implicit (not acknowledged) |
| `resource_allocation_policy_20260415` | Phase 5 (Budget Pacing) | "Dispatch rate throttled to configured cap ±10%" | `DispatchPacer` exists and is tested, but `selectBestCandidate` does not consult it | Throttle is unenforced |
| `virtual_software_house_mvp_20260516` | (Phase 1) | "Migrate simplified schema" | `convex/migrate.ts:migrateSimplifiedSchema` returns `null`; `migrateTask` silently writes `projectId: old.projectSlug` (wrong type) | The migration script is a landmine; running it on real data would corrupt `projectId` |
| `environment_management_20260330` | (Score Audit) | "Persist score audit per dispatch" | `convex/scoreAudit.ts:createScoreAudit` returns the constructed object without `ctx.db.insert` | 200 OK with no row written |
| `agent_scheduling_execution_20260313` | "Migrate opencode agent execution to @opencode-ai/sdk" | CLI invocation → SDK | `opencodeServer.ts`, `sdkClient.ts`, `executor.ts::executeTask` use the SDK; but `scheduler.ts::executeTaskWithEmployee` (2026-05-16) reverts to `executeCommand('opencode', ...)` | The track's primary win is rolled back by a later track |
| `agent_harness_management_ui_20260327` | "Tabbed project view" | One kanban implementation | `ProjectViewPage` uses `legacy/KanbanBoard` (469 LOC); the rest of the app uses the new `components/kanban/*` | 469 LOC of legacy kanban that nothing else uses |
| `cost_tracking_20260502` | "Cost UI: Budget gauge, cost-by-agent, cost-by-project charts" | Charts reused by later pages | `components/cost/*` exists but `CostsPage.tsx` (later, by `dashboard_20260517`) re-implements the same components inline | Two competing cost dashboard implementations |
| `convex_test_remediation_20260520` | "Replace fake analytics tests with real pure-function tests" | Pure functions tested against synthetic inputs | `lib/analytics.ts` ✅; `lib/retrospective.ts` ✅; **handler tests** still use the in-house `createMockCtx` mock and never exercise Convex transaction/index semantics | Real Convex semantics (16K doc limit, index ordering, scheduler batching) are not tested |
| `fix_yaml_safe_schema_20260425` | (Phase 1) | "Validate circular stage deps" | `validateNoCircularDeps` only checks *existence* of deps, not cycles (cycle detection happens correctly in `runner.ts:resolveStepOrder`) | Two inconsistent error messages at different lifecycle stages |
| `frontend_convex_migration_20260402` | "Read-only markdown viewer for retrospectives" | Single parser, shared with editor | `MarkdownViewer.tsx` re-implements the parser that `MarkdownEditor.tsx` already has | 180 lines of byte-identical code |

## 8. Architectural Risks Surfacing in the Graph

- **High out-degree god-files** — `pivot/src/orchestrator/orchestrator.ts::runProject` (985 LOC, 8+ in-edges, ~15 out-edges into the live system) is the single biggest coupling node in the codebase. A change to it ripples to timing telemetry, WAL, run-contract, hooks, notifications, recovery, and review. **Recommendation:** refactor into pipeline stages per §6 row 7.

- **High out-degree god-hooks** — `useConvexData.ts` is 55 nodes / 1137 LOC with 100+ out-edges into the page layer. Splitting it (per §6 row 18) reduces the cycle-detection problem in the graph and makes the per-domain queries independently testable.

- **Orphan exports with `in_edges = 1` from the test file** — measurable dead-code signal. `pivot/src/orchestrator/{recoveryDispatcher,continuousMode,continuousOrchestrator,autoPauseHandler,concurrencyLimiter,taskQueue,circuitBreaker,stalledDetector}.ts` (8 files), `pivot/src/policy/allocator.ts::{WorktreeManager,DispatchPacer,canAdmit,watchAllocationPolicy}`, `pivot/src/policy/economic.ts::{applyBudgetPenalty,shouldEscalateRetry,selectHarnessByEconomics}`, `lib/employees.ts`. **Recommendation:** add a `build-graph` CI rule: "no exported symbol with `in_edges == 1` and that single edge originating from a `*.test.ts` sibling." This is a *measurable* invariant the graph is well-positioned to enforce.

- **Two parallel subsystems with no shared invariant** — `pivot/src/orchestrator/orchestrator.ts::runProject` (SDK path) and `pivot/src/orchestrator/scheduler.ts::runSchedulerTick` (CLI path) execute the same conceptual task with different retry policies, different schemas (`Agent` vs `Employee`), and different execution mechanisms. **Recommendation:** the graph could be queried for "nodes that both consume Convex `tasks.list*` queries" to detect this pattern automatically.

- **Type-system bypasses at the Convex boundary** — pervasive `as any` / `as unknown as X` / `v.string()` for IDs. Each is a missed compile-time check. **Recommendation:** lint rule "no `as any` in `pivot/src/**` or `convex/**`" — already present in `frontend/src/` per inventory of `eslint-disable-next-line @typescript-eslint/no-explicit-any`.

- **Boundary leaks** — `pivot/src/planning/recommender.ts` imports from `../pipeline/*` (slice 3 reaches into slice 2), `convex/lib/auth.ts:resolveActor` is called from ~30 handlers but ~half of all handlers skip it (slice 6), `routes/simulation.ts` imports from `../orchestrator/*` and `../policy/*` (slice 3 imports from slice 1+2). **Recommendation:** a `boundary-deps` graph query that lists "imports that cross a slice boundary."

- **Graph indexer artifacts** — the build-graph indexer creates duplicate nodes for common-name exports (`EmptyState`, `Row`, `ResultPanel`, `LoadErrorCard`, `PortfolioCard`, `PortfolioRedirect`, `MarkdownEditor`, `MarkdownViewer`, `parseInlineTokens`, `renderInlineTokens`, `renderPreviewBlock`, `InlineToken`). Every `caller/callee` count in slice 4 is suspect for in_edges ≤ 1. **Recommendation:** fix the indexer or add a `de-dup` post-processing pass before the next audit.

## 9. Recommended Next Tracks (3–5)

### Track 1 — `chore(measure): orphan-exports & dead-code wire-or-delete sweep`
- **Type:** chore
- **Scope:** 8 pivot files (slice 1 dead primitives), 5+ pivot/policy files (slice 2 orphan exports), 3 convex stub mutations, 1 lib/employees.ts. ~2,000 LOC at stake.
- **Phases:** (1) Enumerate all exported symbols with `in_edges == 1` and that edge originating from a `*.test.ts` file. (2) Per symbol: pick "wire into hot path" or "delete." (3) For each "wire" decision, write the integration test first. (4) For each "delete" decision, remove the file + test + re-export. (5) Re-run `build-graph` to confirm zero new orphan symbols.
- **Success criterion:** `build-graph query "SELECT id, name FROM nodes WHERE in_edges = 1 AND source_file LIKE '%test%'"` returns zero rows for production-source nodes.

### Track 2 — `chore(measure): parallel-implementation resolution`
- **Type:** chore
- **Scope:** MarkdownEditor vs MarkdownViewer, components/legacy/KanbanBoard vs components/kanban/*, AnalyticsDashboard vs AnalyticsPage, CostDashboard vs CostsPage, PerformanceDashboard vs PerformancePage, convexClient vs typedConvexClient, pipeline/agentTypes:Task vs orchestrator/types:Task.
- **Phases:** (1) For each duplicate pair, declare the canonical one in `measure/specs/canonical-implementations.md`. (2) Migrate all consumers to the canonical version. (3) Delete the loser. (4) Update routes (`App.tsx`) to remove the orphan path.
- **Success criterion:** `git grep` for the deleted file returns zero matches; routes resolve to a single implementation per URL.

### Track 3 — `feat(measure): route-body zod migration + typed Convex IDs`
- **Type:** feature
- **Scope:** 27 pivot route files; 5+ convex handlers using `v.string() + as any` for IDs.
- **Phases:** (1) Add `routeBody(schema: z.ZodType)` helper to `pivot/src/routes/router.ts`. (2) Migrate the high-traffic endpoints (`projects`, `git`, `agents`, `sprints`) first. (3) For Convex, change every `args.id: v.string()` to `args.id: v.id('tableName')` and remove every `as any` cast. (4) Add an ESLint rule "no `as any` outside test files." (5) Add a CI step that runs `tsc --noEmit` with the stricter types.
- **Success criterion:** Zero `as any` casts in production code; zero `Record<string, unknown>` returns from typed Convex clients.

### Track 4 — `chore(measure): god-file and god-function split`
- **Type:** chore
- **Scope:** `pivot/src/orchestrator/orchestrator.ts::runProject` (985 LOC), `frontend/src/lib/useConvexData.ts` (1137 LOC), `frontend/src/lib/useConvexRealtime.ts` (399 LOC), `frontend/src/pages/SettingsPage.tsx` (404 LOC), `frontend/src/pages/OptimizePage.tsx` (490 LOC), `frontend/src/pages/ProjectViewPage.tsx` (345 LOC), `frontend/src/hooks/useAgentForm.ts` (562 LOC), `frontend/src/hooks/useProjectView.ts` (392 LOC).
- **Phases:** One phase per file. Each phase: (1) identify seams via graph `deps` query. (2) Write integration tests that exercise the seams. (3) Extract. (4) Verify integration tests pass.
- **Success criterion:** No file > 400 LOC; no function > 80 LOC; integration tests for every extracted seam.

### Track 5 — `feat(measure): auth + Convex-handler hardening`
- **Type:** feature
- **Scope:** `convex/auth.config.ts` (missing), `convex/lib/auth.ts:resolveActor` (anonymous-bootstrap), stub mutations (`scoreAudit.createScoreAudit`, `dispatchPolicyStats.upsertDispatchPolicyStats`, `migrate.migrateSimplifiedSchema`, `seed.seedDemoData`), `.collect().then(filter)` patterns in `convex/analytics.ts`, `convex/notifications.ts`, `convex/fleetCatalog.ts`, `convex/employees.ts`.
- **Phases:** (1) Create `auth.config.ts` with OIDC provider. (2) Gate `anonymous-bootstrap` behind `process.env.NODE_ENV === 'development'`. (3) Add `internalMutation` / `internalQuery` for the sensitive mutations. (4) Add `by_updated_at`, `by_assigneeId` indexes to `tasks`. (5) Replace every `.collect().then(filter)` with `withIndex().take(n)`. (6) Fix the no-op `createScoreAudit` (or remove the export).
- **Success criterion:** `build-graph query "SELECT id FROM nodes WHERE summary LIKE '%no-op%' OR summary LIKE '%TODO%'"` returns zero rows; `convex` lint rule rejects `v.string()` for ID validators outside the legacy `convex/__fixtures__/`.

## 10. Methodology Notes & Caveats

- **Track-mapping confidence is heuristic.** `best_track` was assigned by date-window (the introducing commit's date) + subject-match (the file's primary keyword) + path-keyword (e.g. `convex/budgets.ts` → `economic_control_plane_*` or `dispatch_policy_stats_*`). Tracks that ran in parallel weeks may be off by one; the user should treat the track-rollup table as a starting point for a manual review, not a definitive verdict.
- **`graph.db` is 3 days old (May 30).** It does not reflect the past 3 days of work, and any commits between May 30 and June 2 (4 days) are not in the graph. The build-graph indexer is invoked from `AGENTS.md`; the audit's source-of-truth is the file system + `measure/archive/`, with the graph used only for cross-referencing callers/callees.
- **The build-graph indexer creates duplicate nodes for common-name exports.** At least 12 symbols in slice 4 return "Ambiguous name" from `build-graph callers`: `EmptyState`, `Row`, `ResultPanel`, `LoadErrorCard`, `PortfolioCard`, `PortfolioRedirect`, `MarkdownEditor`, `MarkdownViewer`, `parseInlineTokens`, `renderInlineTokens`, `renderPreviewBlock`, `InlineToken`. Every `in_edges` count ≤ 1 in slice 4 is suspect. The same is likely true for slice 5; verify before re-running the audit.
- **Several slice reports observed a discrepancy between the spec-track's "wiring" claim and the runtime state.** For example, the `symphony_pivot_20260503` plan's deviation note said "runProject still uses DEFAULT_RETRY_CONFIG with the legacy jittered calculateBackoff" but the implementation actually uses the Symphony backoff — the deviation is resolved. The synthesis pass should be careful not to re-flag resolved deviations.
- **The "test gap" counts are inclusive of empty `*.test.ts` files** (e.g. `pivot/src/convexRetry.test.ts` exists with 0 nodes; `pivot/src/performance/benchmark.test.ts` exists with 0 nodes). The red-phase-but-no-green pattern is widespread and may be the dominant cause of the "tests pass but production is broken" shape observed in the audit.
- **Cross-slice findings were re-counted once.** When a pattern appears in slices 1, 2, 3, 4, 5, 6, the master report attributes the pattern to the slice with the highest-severity exemplar (e.g. the markdown duplication is attributed to slice 4 because that's where the byte-identical code lives, not to slice 5 which has the `parseInlineTokens` import).
- **Two Criticals are "latent" rather than active bugs** — `convex/scoreAudit.ts:createScoreAudit` (returns args without inserting; called by `orchestrator.ts:307` so the missing row will silently skew the audit dashboards) and the missing `convex/auth.config.ts` + anonymous-bootstrap (currently only fires in development; the production risk depends on deployment). Both warrant a fix; neither is currently producing 5xx errors.

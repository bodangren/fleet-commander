# Graph Node Audit — frontend/lib + frontend/hooks + fixtures + the rest of frontend

**Slice:** `slice-5-frontend-lib-hooks`
**Files reviewed:** 50
**Nodes reviewed:** 360
**Findings:** Critical: 2 · High: 9 · Medium: 11 · Low: 5
**Date:** 2026-06-02

## 1. Slice Overview

This slice is the data-access backbone of the React frontend: a thin **adapter boundary** (dataAdapter.ts, ConvexProvider.tsx, convex.ts) feeding two **god-hook files** (useConvexData.ts 1137 LOC / 55 nodes; useConvexRealtime.ts 399 LOC / 45 nodes) that hand-roll ~70 typed `useConvex*` subscription hooks, plus a small set of conventional page-hooks (useAgentForm, useProjectView, useHarnessForm, useSprintPlanning, etc.) and a fixtures layer. Tracks dominating: `frontend_convex_migration_20260402` (god hooks), `dashboard_20260517` (insights/performance fixtures), and `agent_issue_autocreation_20260330` (form hooks). The dominant health problem is the two god-hook files; the boundary/adapter code is clean. JSDoc is present on ~80% of exports but is wildly inconsistent — many hooks share a copy-pasted docstring that doesn't describe the actual function, and the analytics hooks in useConvexRealtime.ts have generic `as Record<string, unknown>` casts. No `.test.ts` files were found alongside these files, so the "untested exported symbol" rule fires on essentially every hook.

## 2. Per-section findings

### 2.1 God-file deep-dive: `lib/useConvexData.ts`
**Originating track:** `frontend_convex_migration_20260402` — commit `6d9355d068` (2026-04-02)
**Verdict:** **split**
**Findings:**
- **[Critical]** 1137 LOC / 55 entities in a single file holding ~40 typed subscription hooks spanning seven domains (catalog, coverage, queue, fleet-health, dispatch, governance, reconciliation, analysis, notifications, history, abTests, audit, retrospective). Hard to navigate, hard to tree-shake, hard to review. **Action:** split by domain into `useConvexCatalog.ts`, `useConvexCoverage.ts`, `useConvexRealtimeHealth.ts` (queue/fleet/dispatch), `useConvexGovernance.ts` (governance/reconciliation/policy), `useConvexAnalysis.ts`, `useConvexNotifications.ts`, `useConvexHistory.ts`, `useConvexExperiments.ts`, `useConvexAudit.ts`, `useConvexRetrospective.ts`. Keep `useConvexQuery` (the engine) in a new `useConvexClient.ts` (or merge with `convex.ts`).
- **[Critical]** Every exported hook (and several non-exported helpers) has the *same* JSDoc block copy-pasted: `Subscribe to a Convex query imperatively (no React provider required). Returns undefined when Convex is not configured or client unavailable.` (lines 22, 45, 57, 77, 104, 132, 184, 204, 226, 244, 258, 268, 282, 303, 322, 392, 436, 478, 514, 548, 580, 623, 651, 689, 726, 754, 783, 802, 837, 867, 920, 980, 1014, 1093, 1109, 1123). This is wrong for 90% of them — the "Subscribe imperatively" doc actually describes `useConvexQuery` only; the other hooks are *thin* wrappers that just call `useConvexQuery` and return its result. **Action:** delete the boilerplate, replace with one-liner describing the query (e.g., `/** Returns latest coverage record for a project. */`).
- **[High]** `parseToolsJson` (line 49-55) silently swallows JSON parse errors and returns `{}`. If Convex ever returns malformed `toolsJson`, the UI shows no tools without a console signal — debugging nightmare. **Action:** log via `console.warn` and return empty map; better still, propagate.
- **[High]** `useFleetHealth` (line 396-422) and `useDispatchTimeline` (440-469) declare each result type *inline* with a 10-15 line object literal, then map it. The unmapped shape is exported as its own `interface` (`DispatchPolicyStatEntry`, `HarnessReliabilityStatEntry`, `DispatchTimelineEntry`) but the inline query generic doesn't reuse it. Drift risk: changing the interface won't update the query type. **Action:** derive query type from the interface: `useConvexQuery<DispatchPolicyStatEntry[]>(...)`.
- **[High]** `convexProjectToSummary` (line 61-75) maps project→`ProjectSummary` with `tracks: []` hard-coded. Any UI that renders the tracks will get nothing. The original pivot API returned tracks populated; Convex shape does not. This is a **silent feature loss** in the migration. **Action:** either fetch tracks in a follow-up query or surface a typed `tracks: undefined` flag so consumers know.
- **[Medium]** `useReconciliationProposals` (line 584-608) builds `args` as `{ projectSlug: projectSlug, limit }` when `projectSlug` is provided but `{ projectSlug: '', limit }` otherwise. This passes an empty string to Convex, which is a magic "no filter" convention — undocumented and fragile. **Action:** make Convex handler take `v.optional(v.string())` and send `undefined` instead.
- **[Medium]** `useSprintHistoryQuery` (line 829-834) `as`-casts the status string to a 3-literal union. If a future sprint has status `cancelled` or `archived`, the type is wrong. **Action:** widen the union in `types/history.ts` or accept the unsafe cast and add a runtime check.
- **[Medium]** `convexUrl` is read at module load (line 43) and never re-evaluated. In SSR or test environments where `import.meta.env.VITE_CONVEX_URL` is set after import, the cache is wrong. Same pattern in ConvexProvider.tsx:5 — two sources of truth. **Action:** centralize in a `getConvexUrl()` helper from `convex.ts`.

### 2.2 God-file deep-dive: `lib/useConvexRealtime.ts`
**Originating track:** `frontend_convex_migration_20260402` — commit `36f5685be2` (2026-05-20)
**Verdict:** **split** (same treatment as 2.1, but smaller)
**Findings:**
- **[Critical]** 399 LOC / 45 entities; 38 exported hooks all of which are 1-line `useRealtime('analytics:foo', ...)` wrappers. Massive template-function pattern. No actual logic — but the file makes 38 callers pay the cost of one 399-line import. **Action:** split into 4-5 files by domain: `useConvexRealtimeDashboard.ts` (fleet/blocked/issues/runs/alerts/dashboard/circuit/inProgress/ready/employees), `useConvexRealtimeAnalytics.ts`, `useConvexRealtimePerformance.ts`, `useConvexRealtimeCosts.ts`, `useConvexRealtimeKanban.ts`. Each ~5-10 hooks.
- **[High]** `(args as Record<string, unknown>) ?? {}` is repeated on every analytics/performance/cost hook (lines 175-321). The cast is the real bug — `args` is already a `Record<string, unknown>`, so the cast is for the JSDoc/spec compliance only, but it loses optionality. **Action:** tighten the engine signature: `useRealtime<T>(queryName, args: Record<string, unknown> | undefined = undefined)`.
- **[High]** Return type is always `unknown` or `T | undefined` — no generics. Consumers have to cast at call-site, defeating type safety. The hooks are essentially `any`-returning. **Action:** make engine generic and propagate: `export function useCompletionTrends(args?: AnalyticsArgs): CompletionTrendsResult | undefined`.
- **[Medium]** Private helpers `useRealtime`, `useRealtimeWithProject`, `useRealtimeWithParam` (lines 18-48) form a tiny DSL but `isConvexEnabled` is hard-coded to `config.projects === 'convex'` — meaning *all* of these 38 hooks share a single slice flag. The other slices (`agents`, `tasks`, `issues`) each have their own flag that is ignored. Likely a bug, not by design.
- **[Low]** JSDoc `React hook hook metrics` (line 207) is a copy-paste typo ("hook hook").

### 2.3 `lib/analysis.ts` + `lib/metrics.ts`
**Originating tracks:** `static_analysis_integration_20260330`, `test_coverage_dashboard_20260330`
**Verdict:** **leave-as-is** (with one nit)
**Findings:**
- **[Medium]** `parseAnalysisConfig` (line 76-117) and `parseCoverageThresholds` (coverage.ts:89-118) both reimplement the same YAML→typed-object pattern (load with `DEFAULT_SCHEMA`, return default on `null`/non-object, iterate with type guards). Extracting `parseYaml<T>(content, validator, fallback)` would dedupe ~40 LOC and centralize the `try/catch` swallow.
- **[Low]** `mapSeverity` (line 142-159) has a Ruff-specific branch (`if (toolName === 'ruff' && typeof rawSeverity === 'string' && rawSeverity.length > 1)`) inline — leaks the ruff special-case into a generic mapper. **Action:** keep severity-mapper generic; do ruff code parsing in a ruff-specific helper.
- **[Low]** `metrics.ts` is fine — 4 trivial pure functions, no findings. Coverage is 100% trivially. Could be inlined into `dashboard.ts` but it is a clean module so leave it.

### 2.4 `lib/insightsFixtures.ts` + `__fixtures__/`
**Originating track:** `dashboard_20260517`
**Verdict:** **refactor** (schema drift + dead-file)
**Findings:**
- **[High]** `__fixtures__/historyFixtures.ts` has 0 nodes per the graph but 113 LOC on disk and *re-exports* types from `@/types/history`. The graph extractor missed `export type {...}` re-exports (a known parser gap), but consumers (`convex-provider.tsx:11`, `useConvexData.ts:7-9`, `insightsFixtures.ts:1`) all import from `./historyFixtures`. The fixture is structurally sound, but the empty-node signal will break any "fixture schema drift" check. **Action:** either list re-exports in graph schema or add a `schema` annotation.
- **[High]** **Schema drift** between `MockSprint` (dashboardFixtures.ts:1-7) — `budget: { actual, estimated }` (nested) — and `DashboardSprint` (useDashboardData.ts:3-12) — `budget: number` (flat). The mock-setup in `convex-provider.tsx:204-208` manually unpacks `sprint.budget.estimated` and `sprint.budget.actual` because the production hook flattened it. Two shapes for the same domain. **Action:** unify on flat `budget: number` and fix MockSprint, or vice versa.
- **[Medium]** `InsightSprint extends SprintHistoryItem` adds `costPerPoint: number` and `budgetAccuracy: number`. The parent interface has `status: 'planned' | 'active' | 'closed'`; the mock sets `status: 'active'` / `'closed'`. But `useSprintHistoryQuery` returns `status as 'planned' | 'active' | 'closed'` — runtime mismatch if Convex adds a value. **Action:** widen the union.
- **[Low]** `mockInsightSprints` has 4 entries; `mockLargeCostData` has 55. The "55 sprint" sentinel is used in performance tests — fine, but the file is 334 lines and the only partition is the `BASE_TIME` constant + object literals. Could become a generator (`makeMockSprints(n)`) for parameterization.

### 2.5 `hooks/` directory
**Originating tracks:** `agent_issue_autocreation_20260330`, `frontend_project_kanban_board_20260325`, `dashboard_20260517`, others
**Verdict:** **refactor** (split mega-hook files; some are well-shaped)
**Findings:**
- **[High]** `useAgentForm.ts` packs 5 hooks into 562 LOC: `useAgentForm` (54), `useAgentLoader` (86), `useHarnessList` (45), `useModelDiscovery` (72), `useAgentActions` (178). The 178-line `useAgentActions` (line 412-589) holds 5 action handlers (`handleSave`, `handleClone`, `handleTestAgent`, `handleReset`, `handleDelete`) — each ~30-50 lines. **Action:** split into `useAgentSave.ts`, `useAgentTest.ts`, `useAgentClone.ts`, etc., or at minimum extract each handler into a `useCallback` in a separate file. Rules-of-Hooks compliance is OK (top-level calls, deps arrays complete), but cohesion is broken.
- **[High]** `useProjectView.ts` similarly has 18 entities / 392 LOC across 6 hooks. `useTaskStatus` (line 157-208) is the only one with non-trivial logic (optimistic updates + rollback). The rest are pure fetch wrappers. **Action:** split off `useTaskStatus` to its own file; leave the thin fetchers.
- **[Medium]** `useHarnessForm.ts` mirrors `useAgentForm.ts` exactly in shape (loader, form, actions, harness-list) — same code-pattern. Same split recommendation.
- **[Medium]** `useKanbanBoard.ts` exports a mix: 3 hooks (`useSprintBoard`, `useProjectSprints`, `useActiveSprint`) that just call `useQuery` and 3 mutation helpers (`updateTaskStatus`, `updateSprintStatus`, `closeSprint`) that call `fetch` directly. The mix is fine but the mutations duplicate the logic in `useProjectView.ts:useTaskStatus` and `convex-provider.tsx` mock. **Action:** extract mutations to a `useKanbanMutations.ts` file.
- **[Low]** `useHistoryFilters.ts` (line 11-104) is 94 LOC of URL state management. Clean, well-typed. No findings.

### 2.6 `lib/convexClient.ts` + adapter layer
**Originating tracks:** `frontend_convex_migration_20260402`, `cost_tracking_20260502`
**Verdict:** **leave-as-is** (mostly clean, one duplication)
**Findings:**
- **[Medium]** **Two `convexUrl` sources of truth**: `ConvexProvider.tsx:5` (`VITE_CONVEX_URL`) and `useConvexData.ts:43` (same env). Both use `import.meta.env` at module load. If only one is mocked in a test, the other will be undefined and the hook will silently no-op. **Action:** export `getConvexUrl()` from `convex.ts` and have both call it.
- **[Medium]** **Three nearly identical "is Convex available" checks** coexist: `isConvexAvailable` (convex.ts:7-9), `hasConvexUrl` (ConvexProvider.tsx:29-31), and the inline `convexUrl` truthy check in `useConvexQuery` (useConvexData.ts:145). **Action:** collapse to one `isConvexAvailable()`.
- **[Low]** `dataAdapter.ts` (76 LOC) is the cleanest file in the slice. `getSliceConfigFromEnv(env: EnvMap)` accepts a dependency-injected env (testable), `getSliceConfig()` wraps it with `import.meta.env`. Well-designed boundary. No findings.
- **[Low]** `AnalyticsFiltersContext.tsx` (75 LOC) follows standard provider+hook pattern. Clean.

### 2.7 Types & interfaces in slice
**Originating tracks:** mixed
**Verdict:** **refactor** (deduplicate, narrow `any`/`unknown`)
**Findings:**
- **[High]** **`convexProjectToSummary` and `convexAgentToRecord` reshape Convex records into the legacy pivot types** (`AgentRecord`, `HarnessRecord`, `ProjectSummary` from `fleetTypes.ts`). The `AUDIT NOTE` at the top of `fleetTypes.ts:1-12` is honest: "These types are intentionally divergent from Convex schema Doc<"table"> types." That divergence means a real type in `convex/projects.d.ts` exists alongside this hand-rolled one, with no compiler link. **Action:** pick one source of truth (Convex generated) and a presentation-only layer that's `Omit<...>` or wraps it.
- **[High]** `useSprintHistoryQuery` (useConvexData.ts:806) returns `SprintHistoryItem[]` where `startDate: item.createdAt` and `endDate: item.createdAt` — *both* are aliased to the same field. This is silently wrong data: every consumer showing a sprint date range will see start === end. **Action:** either drop the field or query the right field.
- **[Medium]** `MockSprint` (dashboardFixtures.ts:1-7) has `budget: { actual, estimated }` but every other sprint-related type uses `budget: number`. The same word "budget" means 3 shapes in this slice (flat, nested, plus `actualCost` separately on DashboardSprint). **Action:** one canonical `Sprint` type in `types/`.
- **[Medium]** `interface TaskHistoryItem` (types/history.ts:29) has `agent: string` (required) but `useTaskHistoryQuery` (useConvexData.ts:900) does `agent: item.agent ?? 'unassigned'` — Convex may return `null`/`undefined` for unassigned, fixture says required. Mismatch only fails at test time.
- **[Low]** `KanbanTask` (hooks/types.ts:9) duplicates `DashboardTask` (useDashboardData.ts:14). Two near-identical types. **Action:** consolidate.
- **[Low]** No `any` types found in the slice (the only `as any` is `// eslint-disable-next-line @typescript-eslint/no-explicit-any` in useConvexData.ts:151,159 — required because `ConvexClient` is dynamic-imported). Acceptable.

### 2.8 Everything else in slice
**Originating tracks:** various
**Verdict:** **refactor** (small, scattered improvements)
**Findings:**
- **[Medium]** `useFleetApi.ts` (417 LOC) bundles 8 type definitions + 8 polling-based hooks (`useFleetStatus`, `useBlockedTasks`, etc.) into one file. It is the **Bun-API-side mirror** of `useConvexRealtime.ts`. They are intentionally parallel — when Convex is enabled, the realtime version is used; otherwise the polling version. **Action:** this is correct architecture but the 8 hooks have nearly identical bodies (fetchJson + setData + setLoading + setError). Extract a `usePolledJson<T>(url, pollMs)` engine and have each hook be 1 line.
- **[Medium]** `useLogStream.ts`, `useGitStatus.ts`, `useWebSocket.ts`, `useFleetData.ts` — each is 2-3 entities, small hooks, all polling-based. Co-locate with `useFleetApi.ts` (or extract a `usePolledJson` shared engine first).
- **[Medium]** `lib/employees.ts` (11 LOC, 2 trivial types: `Employee`, `EmployeeStatus`) is **orphan code** from `tech_debt_remediation_20260516` / `virtual_software_house_mvp_20260516` — a track that was apparently never completed. No callers found by `build-graph`. **Action:** delete or merge into `fleetTypes.ts`.
- **[Low]** `lib/dashboard.ts` (4 LOC, single function `calculateBudgetPercent`) — too small to be a lib file. Inline into the one consumer.
- **[Low]** `lib/pipelineUtils.tsx`, `lib/formatDuration.ts`, `lib/timeline.ts`, `lib/kanban.ts` — small utility files, all reasonable, no findings.
- **[Low]** `layout/AppLayout.tsx` (228 LOC) — fine; `SidebarLink` is reused 4 times, `viewTitle` is a route→title map. Clean.

## 3. Cross-cutting patterns

- **Two god-hook files (`useConvexData.ts` 1137 LOC, `useConvexRealtime.ts` 399 LOC) account for 100 of 187 functions (53%) in this slice.** Splitting them is the single highest-leverage refactor.
- **JSDoc copy-paste:** 30+ hooks in useConvexData.ts share the *exact same* 2-line docstring copied from the engine. After the engine doc, no function has its own description. Same problem in useConvexRealtime.ts (`React hook completion trends` style, all identical). Indicates an auto-generated or AI-generated file.
- **Adapter boundary is clean (`dataAdapter.ts`); the leak is the *implementation* — 40+ hooks in two files that all reimplement the same `config + enabled + useConvexQuery + optional transform` pattern.**
- **Schema drift between fixtures and production types** (`MockSprint.budget` nested vs `DashboardSprint.budget` flat; `InsightSprint.status` union too narrow; `TaskHistoryItem.agent` required vs nullable).
- **Three sources of "is Convex available"** (`isConvexAvailable`, `hasConvexUrl`, inline `convexUrl` truthy check) for a single env var.

## 4. Top-10 improvement queue

| # | Node / file | Severity | Effort | Why |
|---|-------------|----------|--------|-----|
| 1 | Split `lib/useConvexData.ts` (1137 LOC) into 10 domain files | Critical | M | God-file; 55 nodes; navigation/test/tree-shake cost |
| 2 | Split `lib/useConvexRealtime.ts` (399 LOC) into 5 domain files | Critical | S | God-file; 38 one-line wrappers; same template pattern |
| 3 | Fix `useSprintHistoryQuery` returning `startDate === endDate` (useConvexData.ts:829-834) | High | S | Silently wrong sprint date range in UI |
| 4 | Consolidate `convexUrl` / `isConvexAvailable` / `hasConvexUrl` (3 sources → 1) | High | S | Two module-level env reads; test mocking holes |
| 5 | Delete copy-pasted JSDoc on 30+ convex hooks | High | S | "Subscribe to a Convex query imperatively" wrong on all of them |
| 6 | Unify `MockSprint.budget` (nested) with `DashboardSprint.budget` (flat) | High | S | Schema drift breaks fixture→production mapping |
| 7 | Refactor `useAgentForm.ts:useAgentActions` (178 LOC, 5 handlers) | High | M | One hook does 5 things; split or extract per-action callbacks |
| 8 | Refactor `useProjectView.ts` (392 LOC, 6 hooks) | High | M | One non-trivial hook (`useTaskStatus`) hidden in 6-hook file |
| 9 | Type `convexProjectToSummary.tracks: []` placeholder — surface as undefined or fetch | High | M | Silent feature loss: Convex path returns empty tracks |
| 10 | `parseToolsJson` (useConvexData.ts:49) — add warn-on-parse-fail | Medium | S | Silent empty-object fallback hides malformed data |

## 5. Track ↔ Implementation diffs

- **`frontend_convex_migration_20260402` — "Add Convex data hooks, adapter boundary, and log stream"** (commit 6d9355d068). Phase contract promised an "adapter boundary" — that is *exactly* what `dataAdapter.ts` delivers, cleanly. The contract *also* implied a small set of Convex hooks; reality is 70+ hooks in two 1000+ LOC files. **Drift:** hook count is an order of magnitude larger than the spec, suggesting the migration grew organically track-by-track (every dashboard/insights/performance track added 5-10 hooks to the same two files).
- **`dashboard_20260517` — multiple red-phase test commits for insights/perf/dashboard.** Each commit *added a fixture file* (`insightsFixtures.ts`, `performanceFixtures.ts`, `dashboardFixtures.ts`) but **none added a `*.test.tsx` for the hook consumers**. The red-phase tests are in a sibling file but the fixtures and production types have drifted apart — see §2.4 and §2.7.
- **`type_deduplication_20260524` (subject: "Consolidate duplicate convex lib types and audit frontend fleetTypes")** — the track exists; the file `hooks/types.ts` has 4 type aliases (`KanbanTask`, `Sprint`, `BoardAgent`, `SprintBoard`) that **still duplicate** `DashboardTask`/`Sprint`/`BoardAgent` in `useDashboardData.ts`. The track's stated goal was deduplication; the work is partially complete.
- **`convex_test_remediation_20260520`** introduced `__fixtures__/convex-provider.tsx` (259 LOC, 21 mock functions). The mocks are inline `vi.mock` factories that re-implement the *production* transformation functions (`convexProjectToSummary`, `convexAgentToRecord`, `parseToolsJson`) by hand. The track added duplication of ~80 LOC of transform code into a test file. If the production transform changes, the mock won't — silent test pass with wrong data.
- **`agent_issue_autocreation_20260330` — "refactor(frontend): extract page hooks into custom hooks"** (commit 2f3afd6589). The commit is the source of `useAgentForm.ts`, `useHarnessForm.ts`, `useProjectView.ts`. It achieved the *first-order* goal (page→hook extraction) but the hooks themselves are 350-580 LOC — second-order split was never done.

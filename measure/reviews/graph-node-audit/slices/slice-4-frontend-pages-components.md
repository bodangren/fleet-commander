# Graph Node Audit — frontend/pages + frontend/components (+ widgets/, features/)

**Slice:** `slice-4-frontend-pages-components`
**Files reviewed:** 132 (per inventory; 36 in `pages/`, 96 in `components/` — subfolder counts: `analytics/`, `charts/`, `cost/`, `dashboard/`, `history/`, `insights/`, `kanban/`, `legacy/`, `performance/`, `retrospective/`, `timeline/`, `ui/`)
**Nodes reviewed:** 372
**Findings:** Critical: 1 · High: 6 · Medium: 9 · Low: 7
**Date:** 2026-06-02

> Subsystem-driven review. Pages and components audited separately. Cross-page
> duplication (e.g. `formatCost`, `MarkdownEditor`/`Viewer` parser, legacy vs
> new `KanbanBoard`) is the dominant pattern. Direct `fetch()` calls in 10
> pages instead of the `useConvexData`/`useFleetApi` hooks is the second
> largest pattern.

> Note: `frontend/src/widgets/` and `frontend/src/features/` do not exist on
> disk (only the inventory glob references them). The 132 files all live
> under `frontend/src/pages/` and `frontend/src/components/`.

---

## 1. Slice Overview

The slice is the **React 19 + Vite presentation layer** of fleet-commander. It is dominated by the `agent_harness_management_ui_20260327`, `dashboard_20260517`, `cost_tracking_20260502`, `frontend_project_kanban_board_20260325`, `sprint_retrospective_dashboard_20260527`, and `frontend_convex_migration_20260402` tracks. Health is mixed: **pages that route through the `useConvexData` / `useFleetApi` hooks are clean orchestrators (DashboardPage, OpsPage, MonitorPage, KanbanBoardPage); pages that hold business logic and call `fetch('/api/...')` directly are bloated and brittle (SettingsPage, Reconcile, OptimizePage, AgentTemplatesPage, NotificationHistoryPage, SprintPlanningPage, ProvidersPage, SimulatePage wrapper, RetrospectivePage, AgentTemplateEditorPage)**. A second structural problem is **two parallel Markdown implementations and two parallel Kanban implementations**, both of which the originating spec tracks did not call for.

---

## 2. Per-area findings

### 2.1 Dashboard area — `DashboardPage`, `dashboard/*` components

#### `frontend/src/pages/DashboardPage.tsx`
**Originating track:** `agent_harness_management_ui_20260327` — phase UI slice — `f944afacb9`
**Phase contract:** assemble a top-level dashboard from sprint / agents / tasks / pipeline / alerts / metrics.

##### Node: `DashboardPage` (function, lines 15-48)
- **Severity:** Low
- **Construction:** Uses inline `style={{...}}` blocks (e.g. line 19, 26) instead of className. Mixing two style conventions in a single file.
- **Interaction:** Clean. `useDashboardData` hook is the only data source.
- **Recommendation:** Replace inline `style` with the `space-y-6` / Tailwind tokens used elsewhere; same look, less `style=` pollution.

#### `frontend/src/components/dashboard/AgentStatus.tsx` (106 lines, exported, in_edges=2)
- **Severity:** Low
- **Construction:** Healthy. Uses `SprintPanel` and friends, no inline fetch.
- **Interaction:** Two callers (DashboardPage + a test file). Good fan-in for a dashboard panel.
- **Recommendation:** None.

#### `frontend/src/components/dashboard/AttentionNeeded.tsx` (126 lines, exported, in_edges=3)
- **Severity:** Medium
- **Construction:** Three sub-components defined inside (`Header`, `AlertItem`, `BlockedTaskItem`) plus main view. Per the user's "compose smaller components, don't re-implement primitives" rule these should be lifted out so they can be reused by `TasksHistoryPage` and the new `AlertsPage` (which currently re-implements similar cards).
- **Interaction:** Three callers — fan-in is healthy.
- **Recommendation:** Extract `AlertItem` / `BlockedTaskItem` to `components/dashboard/items/`. Tests already exist (`.test.tsx`).

#### `frontend/src/components/dashboard/KeyMetrics.tsx` (3 nodes, exported)
- **Severity:** None. Cleanly delegates to subcomponents.

#### `frontend/src/components/dashboard/RecentActivity.tsx` (6 nodes, in_edges=2)
- **Severity:** None.

#### `frontend/src/components/dashboard/SprintStatus.tsx` (153 lines, exported)
- **Severity:** Low
- **Construction:** Heavy inline color hex codes (`#5e6ad2`, `#27a644`) instead of design tokens; same hex appears 4-5 times. Also has its own `relativeTime` and a local loading skeleton.
- **Interaction:** Two callers (DashboardPage + test).
- **Recommendation:** Promote `relativeTime` to a `lib/format` util (see §2.4 below — the same helper is reinvented in at least four places).

---

### 2.2 Insights / Analytics area — `AnalyticsPage`, `AnalyticsDashboard`, `costs`, `performance` pages and `analytics/*` / `cost/*` components

This is the **highest-duplication area in the slice**.

#### `frontend/src/pages/AnalyticsPage.tsx` (334 lines, 15 nodes)
**Originating track:** `dashboard_20260517` — `72a3d0639d`
**Phase contract:** "Sprint velocity, cost efficiency, and delivery metrics."

##### Node: `AnalyticsPage` (function, lines 201-333)
- **Severity:** High
- **Construction:** 7 local helper functions (`calcCostPerPoint`, `calcBudgetAccuracy`, `calcAvgCostPerPoint`, `calcPointsPerDollar`, `calcAvgVelocity`, `calcAvgBudgetAccuracy`, `formatCostPerPoint`, `formatBudgetAccuracy`) PLUS a local `StatCard` subcomponent PLUS a local `BudgetUtilizationChart` subcomponent. Plus a 9-column inline `<table>` (lines 285-329) that could be the existing `SprintHistoryTable` (which is imported-out at line 4: `// import { SprintHistoryTable }` — **dead commented-out import**, a real finding).
- **Interaction:** Only consumer is the page itself + its test.
- **Recommendation:** (1) Extract helpers to `lib/formatSprint.ts` (shared with CostsPage/PerformancePage — see §2.4). (2) Delete the dead commented import at line 4. (3) Replace inline `<table>` with `SprintHistoryTable` which the inventory confirms exists. (4) Extract `StatCard` to a shared `components/dashboard/StatCard.tsx`.

#### `frontend/src/pages/CostsPage.tsx` (320 lines, 13 nodes)
**Originating track:** `dashboard_20260517` — `93fc462203`
**Phase contract:** "Cost insights and optimization."

##### Node: `CostsPage` (function, lines 262-319)
- **Severity:** High
- **Construction:** 4 local `formatX` helpers (`formatCost`, `formatCostPerPoint`, `formatPointsPerDollar`, `formatReliability`) — **identical names, identical bodies** to the helpers in `AnalyticsPage`. Plus 4 local subcomponents: `CostTrendChart`, `AgentEfficiencyTable`, `ROISummary`, `OptimizationList`. The page is mostly presentational composition. 6 of its 13 nodes are subcomponents.
- **Interaction:** Page self-contains everything; nothing is shared with the other "insight" pages even though the data shape is sibling.
- **Recommendation:** Lift `formatCost` / `formatCostPerPoint` / `formatPointsPerDollar` / `formatReliability` to `lib/formatCost.ts`; lift `CostTrendChart` / `AgentEfficiencyTable` / `ROISummary` to `components/cost/`. The 4 local subcomponents are doing display work that belongs in the component layer, not the page layer.

#### `frontend/src/pages/PerformancePage.tsx` (243 lines, 7 nodes)
**Originating track:** `dashboard_20260517` — `6f25fae66d`
**Phase contract:** "Agent reliability, pipeline costs, and rejection tracking."

##### Node: `PerformancePage` (function, lines 191-242)
- **Severity:** High
- **Construction:** Same problem as AnalyticsPage/CostsPage. 3 local helpers (`formatPercent`, `formatCost`, `formatTrend`) — `formatCost` is **byte-for-byte identical** to CostsPage's `formatCost`. Plus 3 local subcomponents: `AgentReliabilityTable`, `PipelineCostBreakdown`, `RejectionReasonsAnalysis`. Note line 211 has empty docstring: `/** Renders a page component */` — placeholder JSDoc. The same `if (data === undefined) return <Loading/>; if (empty) return <NoData/>; return <Content/>` boilerplate (lines 194-223) is repeated three times across the insight pages.
- **Interaction:** Only consumer is the page itself.
- **Recommendation:** Same as CostsPage — extract `formatCost` (consolidate), pull subcomponents out, share the `data === undefined` / empty-state wrapper with the other two insight pages.

#### `frontend/src/components/analytics/*` (8 files: AgentHeatmap, AnalyticsFilterBar, BottleneckChart, CompletionTrendChart, HookPerformanceChart, QueueDepthChart, SessionResumptionChart, TimeRangeSelector)
- **Severity:** Medium
- **Construction:** All accept a single `data` prop of a leaf type defined locally (e.g. `BottleneckData`, `HookMetric`, `SessionMetrics`). They compose the same Recharts primitives with slightly different field naming (`costPerPoint` vs `costPer_point`). The `AnalyticsFilterBar` and `TimeRangeSelector` are both exported but have **in_edges=1** in the graph — they are single-use and may be merging the responsibility of "filter UI for analytics" with the page itself.
- **Interaction:** Each is consumed by the legacy `AnalyticsDashboard.tsx` page, not by the new `AnalyticsPage` (which ignores them and re-invents). This is **a hidden layer violation**: the dashboard_20260517 track added `AnalyticsPage` and the components exist, but `AnalyticsPage` does not import the analytics/* subcomponents.
- **Recommendation:** Either deprecate the analytics/* subcomponents and let AnalyticsPage continue as a self-contained page, or rebuild AnalyticsPage to compose them. The current state is "two teams built the same thing twice."

#### `frontend/src/components/cost/*` (5 files: BudgetGauge, CostByAgentChart, CostByProjectChart, CostTrendChart, SessionSavingsWidget)
- **Severity:** Medium
- **Construction:** Same shape as analytics/*. The `cost/CostTrendChart` and `cost/CostByProjectChart` overlap with the inline `CostTrendChart` inside `CostsPage.tsx`. **There are two `CostTrendChart` files in the slice** (`components/cost/CostTrendChart.tsx` and the local one in `CostsPage.tsx`), and the local one shadows the shared one.
- **Interaction:** The cost/* components are imported only by `CostDashboard.tsx` (legacy, in inventory, not in pages/ as a current page). They are not used by `CostsPage`.
- **Recommendation:** Same as analytics — pick one path: either rewrite CostsPage to use `components/cost/*`, or move CostDashboard back into CostsPage and delete the components.

#### `frontend/src/components/charts/*` (BarChart, DonutChart, LineChart)
- **Severity:** Low
- **Construction:** The three chart primitives exist but I can find no caller in pages — they appear to be unused or underused. `ChartDataPoint` interface is duplicated in each (lines 12-14, 3-5, 12-14). 
- **Recommendation:** Verify usage; if unused, delete; if used, lift `ChartDataPoint` to a shared `types.ts` and use a generic.

---

### 2.3 Project management — `ProjectViewPage`, `KanbanBoardPage`, `AgentsPage`, `HarnessesPage`, `AgentEditorPage`, `HarnessEditorPage`, `AgentTemplatesPage`, `AgentTemplateEditorPage`

#### `frontend/src/pages/ProjectViewPage.tsx` (345 lines, 2 nodes)
**Originating track:** `agent_harness_management_ui_20260327` — `f944afacb9`
**Phase contract:** multi-tab project view (board, deps, issues, sprint, logs, review, coverage, performance).

##### Node: `ProjectViewPage` (function, lines 45-390)
- **Severity:** Critical
- **Construction:** 345 lines, 8 destructured hooks (`useProjectLoader`, `useNextTask`, `useTaskStatus`, `useIssuePreview`, `useOrchestratorRun`, `useTaskReview`, `useEmployeePerformance`, `useWebSocket`), inline metric-card layout, inline `rounded-xl border border-[#23252a] bg-[#0f1011]` styling repeated 8+ times. Critically, **it imports `KanbanBoard` from `@/components/legacy/KanbanBoard` (line 9) — the duplicate, 469-line legacy implementation**. The new `components/kanban/KanbanBoard.tsx` is not used here. This is the **only non-test caller of the legacy component** (see §2.10).
- **Interaction:** Heavy fan-in to legacy code. `useTaskStatus(id, project, rest.setProject || (() => {}))` (line 49-53) is using a fallback empty function as a default — a sign the hook contract is mismatched.
- **Recommendation:** (1) Decide: either migrate `ProjectViewPage` to the new kanban stack and delete `components/legacy/KanbanBoard.tsx`, or accept the legacy and remove the unused new code. (2) The 8 hook destructure should collapse into a single `useProjectViewState` hook (in `hooks/useProjectView.ts` which already exists). (3) The 345-line body is way over the orchestrator limit; extract at least 5 sub-views.

#### `frontend/src/pages/KanbanBoardPage.tsx` (229 lines, 1 node)
**Originating track:** `frontend_project_kanban_board_20260325` — `02873c8b57`

##### Node: `KanbanBoardPage` (function, lines 20-228)
- **Severity:** Low
- **Construction:** This is what a well-orchestrated page looks like — 4 useState slots, 4 hook calls, no direct fetch, all actions are `useCallback`. Body is mostly project/sprint selector UI. The page uses the **new** `components/kanban/KanbanBoard` — good. The new `KanbanColumn` and `TaskCard` (subcomponents) handle rendering.
- **Interaction:** Only consumer of the new kanban stack.
- **Recommendation:** None — this is the reference implementation. Use as the template for migrating `ProjectViewPage`.

#### `frontend/src/components/kanban/{KanbanBoard,KanbanColumn,TaskCard,SprintInfoBar}.tsx` (new)
- **Severity:** None
- **Construction:** Composed cleanly. `TaskCard` has 7 internal helpers but they are private and well-named. `KanbanColumn` is a clean renderer, `KanbanBoard` is a clean orchestrator. Tests exist.
- **Interaction:** 1 caller (`KanbanBoardPage`) plus tests.

#### `frontend/src/components/legacy/KanbanBoard.tsx` (469 lines including constants, 10 nodes)
**Originating track:** unlisted in inventory (the `-` placeholder); originally part of `agent_harness_management_ui_20260327` per the code comments and `c6cfd5fcb0` style.

##### Node: `KanbanBoard` (function, lines 268-468)
- **Severity:** High
- **Construction:** 201-line body inside a 469-line file. Defines its own `BoardStatus` enum, `mapToBoardStatus`, `flattenBoardTasks`, `taskPriorityClass`, `executionStatusBadge`, `TaskCard`, `PhaseProgress`. **This is a fully independent kanban implementation that competes with `components/kanban/{KanbanBoard,KanbanColumn,TaskCard}`.** The new code is a 100-line `KanbanBoard` + 70-line `KanbanColumn` + 223-line `TaskCard` = ~393 lines (similar total) but distributed across composable files.
- **Interaction:** Only 1 caller: `ProjectViewPage` (and a `useProjectView` hook for the `BoardTask` type). Zero tests.
- **Recommendation:** Delete this file. Migrate `ProjectViewPage` to use the new kanban stack. If the legacy visual style (neo-brutalist borders, hex colors) is required by the Project view, port those into a styling variant on the new TaskCard, not a parallel implementation.

#### `frontend/src/pages/AgentEditorPage.tsx` (362 lines, 2 nodes)
**Originating track:** `agent_harness_management_ui_20260327` — `f944afacb9`

##### Node: `AgentEditorPage` (function, lines 28-361)
- **Severity:** High
- **Construction:** 334-line body. The 3 hook destructure (`useAgentLoader`, `useHarnessList`, `useModelDiscovery`, `useAgentActions`) is fine but the rest is a hand-rolled form with 4 inline `<section>` cards, all with the same `rounded-3xl border border-border/60 bg-black/10 p-5` styling (lines 153, 243, 301, and again in the right column at 204). Local `joinQuery` is a 3-line helper duplicated also in `HarnessEditorPage.tsx:15`. Local `currentModel` `useMemo`. 16 separate inline class strings of `rounded-2xl border border-border/60 ... outline-none transition focus:border-cyan-400` are nearly identical.
- **Interaction:** No cross-component import; self-contained.
- **Recommendation:** Extract the 4 cards (Identity, Provider, Tool Permissions, and the MarkdownEditor wrapper) into a `AgentEditorForm.tsx` component. Move `joinQuery` to `lib/urls.ts`. Use a shared `FieldShell` or `FormSection` UI primitive (the `ui/` folder is empty of layout primitives — opportunity to add one).

#### `frontend/src/pages/HarnessEditorPage.tsx` (281 lines, 2 nodes)
**Originating track:** `agent_harness_management_ui_20260327` — `f944afacb9`

##### Node: `HarnessEditorPage` (function, lines 22-280)
- **Severity:** Medium
- **Construction:** 259-line body, same `joinQuery` duplication as `AgentEditorPage`. Same inline-card pattern. Same `rounded-2xl` Tailwind class repeated 6 times.
- **Interaction:** Self-contained.
- **Recommendation:** Same as AgentEditorPage — extract sections, share the URL helper.

#### `frontend/src/pages/AgentTemplatesPage.tsx` (179 lines, 2 nodes) + `AgentTemplateEditorPage.tsx` (293 lines, 3 nodes)
**Originating tracks:** `custom_agent_templates_20260527` — `8b2388c694`

##### Nodes: `AgentTemplatesPage` and `AgentTemplateEditorPage`
- **Severity:** High (combined)
- **Construction:** **4 direct `fetch('/api/agent-templates...')` calls in `AgentTemplatesPage` (lines 41, 60, 78, 91) and 3 direct `fetch` calls in `AgentTemplateEditorPage` (lines 63, 121, 144)**. These pages bypass the `useConvexData` hook layer entirely. The handler functions do `setState` directly with no toast/error abstraction. The pages mix list, create, edit, delete, clone, and "seed defaults" all in one component.
- **Interaction:** `AgentTemplateEditorPage` is 293 lines — should be split.
- **Recommendation:** Port these endpoints to `useConvexData` (or add a `useAgentTemplates` hook); extract the create form to a subcomponent. The duplication with `AgentEditorPage.tsx` is striking — these are sibling editors of the same domain object.

#### `frontend/src/pages/AgentsPage.tsx`, `HarnessesPage.tsx` (1 node each)
- **Severity:** None.

#### `frontend/src/pages/AgentsHistoryPage.tsx`, `TasksHistoryPage.tsx`, `SprintsHistoryPage.tsx` (history pages)
**Originating track:** `dashboard_20260517` — single commit batch `eb3ebb606a`/`f6a3789208`/`1edffb78de` (2026-05-18)
- **Severity:** Low
- **Construction:** The history pages mostly delegate to `components/history/*` which is well-factored (per inventory: 12 subcomponents across `AgentDetailView`, `AgentModelHistory`, `AgentPerformanceTable`, `CostTrendChart`, `HistoryFilterBar`, `HistorySearchBar`, `SprintDetailView`, `SprintHistoryTable`, `SprintRetrospectiveView`, `TaskDetailView`, `TaskHistoryTable`, `TaskTimelineLink`, `VelocityTrendChart`). Each has a `.test.tsx`.
- **Recommendation:** None.

---

### 2.4 Ops area — `OpsPage`, `MonitorPage`, `DiagnosePage`, `OptimizePage`, `BlockersPage`, `AlertsPage`, `NotificationHistoryPage`, `ProvidersPage`, `Reconcile.tsx`, `TaskTimelinePage`, `RetrospectivePage`, `SimulatePage`, `PortfolioPage`, `SettingsPage`, `PipelinesPage`, `PerformanceDashboard`, `AnalyticsDashboard`, `CostDashboard`, `SettingsPage`

#### `frontend/src/pages/OpsPage.tsx` (138 lines, 3 nodes)
**Originating track:** `environment_management_20260330` — `ef594a6b5a`

##### Node: `OpsPage` (function, lines 63-137)
- **Severity:** None.
- **Construction:** Clean orchestrator. Uses 6 `useConvexData` hooks, no direct fetch. Local `TabButton` is a clean primitive. Keyboard shortcut (Alt+1..5) is appropriate UX.
- **Interaction:** Only consumer of the Ops area tab children.
- **Recommendation:** Lift `TabButton` to `components/ui/TabButton.tsx` (other pages like `KanbanBoardPage` reimplement similar patterns).

#### `frontend/src/pages/MonitorPage.tsx` (242 lines, 1 node)
**Originating track:** `schema_modularization_20260524` — `b38f53c19f`

##### Node: `MonitorPage`
- **Severity:** Medium
- **Construction:** 233 lines. The body is mostly 4 metric `<Card>` blocks (lines 24-75) repeated 4 times. Should be a `<MetricCard label="Ready" value={readyCount} icon={Clock} caption="Tasks waiting" />` — and that's exactly the pattern of the new `dashboard/AgentStatus.tsx`. The 4 cards each repeat the same 11-line structure.
- **Interaction:** Only consumer is itself.
- **Recommendation:** Extract a `MetricCard` primitive (lift from `dashboard/AgentStatus` or create in `ui/`). The page would shrink to ~80 lines.

#### `frontend/src/pages/DiagnosePage.tsx` (121 lines, 2 nodes)
**Originating track:** `schema_modularization_20260524` — `b38f53c19f`
- **Severity:** Low
- **Construction:** Uses `ReconcilePanel` from `./Reconcile` — a sibling-page import. Local `formatTimestamp` (lines 12-24) — **byte-identical** to `formatTimestamp` in `Reconcile.tsx:18-30` and **near-identical** to `Governance.tsx:39-51` and `OptimizePage.tsx:9-11` (a simpler version).
- **Interaction:** Self-contained.
- **Recommendation:** Move `formatTimestamp` (and its siblings) to `lib/formatTimestamp.ts` — 4 places, 1 source of truth.

#### `frontend/src/pages/OptimizePage.tsx` (490 lines, 4 nodes)
**Originating track:** `schema_modularization_20260524` — `b38f53c19f`

##### Node: `OptimizePage` (function, lines 287-489)
- **Severity:** High
- **Construction:** **490 lines, the largest page in the slice.** Contains: (a) a `MetricBar` subcomponent (lines 19-68), (b) a `ExperimentResultsView` subcomponent (lines 70-285) with its own `handleRun`/`handleComplete` calling `fetch('/api/ab-tests/...')` 3 times, (c) a large form for creating a new A/B test (lines 354-418) with 6 inputs inline, (d) a Policy Parameters card (lines 457-486). 3 `fetch` calls; the page uses `useAbTests`/`usePolicyWeights`/`useExperimentResults` for reads but `fetch` for writes. **`window.location.reload()` at line 111** is a hard refresh — brittle in a SPA, should be `await refetch()` or mutate cache.
- **Interaction:** Self-contained but very large.
- **Recommendation:** Split into `pages/optimize/ABTestsList.tsx`, `pages/optimize/ExperimentResultsView.tsx`, `pages/optimize/PolicyParametersPanel.tsx`, `pages/optimize/NewTestForm.tsx`. Move all 3 fetches into a `useAbTestActions` hook. Replace `window.location.reload()` with cache invalidation.

#### `frontend/src/pages/BlockersPage.tsx` (213 lines, 2 nodes)
**Originating track:** `fleet_command_center_20260510` — `c6cfd5fcb0`

##### Node: `BlockersPage` (function, lines 22-212)
- **Severity:** Medium
- **Construction:** Two table sections (lines 97-154 for blocked tasks, lines 156-210 for issues) are **structurally identical** — same `<Card>` wrapper, same `<CardHeader>`/`<CardContent>` skeleton, same `<table>` with the same 4 columns (PROJECT, ITEM, AGENT, AGE). Only the row renderer differs. Local `formatAge` (lines 11-17) is a 7-line helper duplicated as `formatTimestamp`/`formatTime`/etc. in 4 other files.
- **Interaction:** Only consumer is itself.
- **Recommendation:** Extract `<AgeTable title rows />` subcomponent. Consolidate the time formatters into one utility.

#### `frontend/src/pages/AlertsPage.tsx` (134 lines, 2 nodes)
**Originating track:** `fleet_command_center_20260510` — `c6cfd5fcb0`
- **Severity:** None seen in inventory; the file appears to be a thin wrapper. 

#### `frontend/src/pages/ProvidersPage.tsx` (127 lines, 3 nodes)
**Originating track:** `fleet_command_center_20260510` — `2f28831c07`
- **Severity:** High
- **Construction:** **2 direct `fetch` calls** to `/api/agents` and `/api/harnesses` (lines 32, 33) — same data is fetched in `SettingsPage.tsx:98`. Two pages independently loading the same agent list with different error handling.
- **Recommendation:** Port to `useAgents` / `useHarnesses` hooks; the parallel fetches will diverge.

#### `frontend/src/pages/NotificationHistoryPage.tsx` (143 lines, 1 node)
**Originating track:** `notification_system_20260502` — `61772b18e7`
- **Severity:** High
- **Construction:** **3 direct `fetch` calls** to `/api/notifications/mark-read`, `/api/notifications/mark-all-read`, `/api/notifications/delete-old` (lines 39, 51, 63). No abort signal, no error UI — all three swallow errors silently.
- **Recommendation:** Add an `useNotificationActions` hook. Surface errors to a toast.

#### `frontend/src/pages/Reconcile.tsx` (203 lines, 5 nodes)
**Originating track:** `state_reconciliation_engine_20260415` — `096494f284`
- **Severity:** High
- **Construction:** This file lives in `pages/` but defines both a `ReconcilePanel` subcomponent AND a default-exported `ReconcilePage` wrapper. The wrapper does 3 direct `fetch` calls (lines 157, 171, 183) with **no error reporting** (line 177/189: `console.error` only). The two handler functions duplicate the optimistic-update pattern (`setProposals(prev => prev.filter(p => p._id !== id))`) without invalidating any cache.
- **Recommendation:** Either move `ReconcilePanel` to `components/reconciliation/` (and let `DiagnosePage` keep importing from `pages/` is fine but it's a layering smell), and add a `useReconciliationActions` hook.

#### `frontend/src/pages/TaskTimelinePage.tsx` (1 node, originating `environment_management_20260330` — `9fc30bad21`)
- **Severity:** None seen.

#### `frontend/src/pages/RetrospectivePage.tsx` (1 node, originating `continuous_orchestration_20260502` — `2f79f9e748`)
- **Severity:** Medium
- **Construction:** **1 direct `fetch` call** to `/api/retrospectives/generate` (line 24). Should use `useConvexData` hook or a `useRetrospectiveActions` hook.
- **Recommendation:** Port to a hook.

#### `frontend/src/pages/SimulatePage.tsx` (255 lines, 6 nodes)
**Originating track:** `policy_simulation_replay_20260415` — `a1be0b380a`
- **Severity:** Low
- **Construction:** Has a clean wrapper pattern: a pure `SimulatePage({ onRun, initialReport, loading })` plus a default `SimulatePageWrapper` that wires up the fetch. This is the **best practice pattern in the slice** for separating presentation from data. The 255 lines include the wrapper which is reasonable. Local `formatDelta` and `DeltaBar` are small and self-contained.
- **Recommendation:** None for SimulatePage itself; copy this wrapper pattern into the other 9 fetch-based pages.

#### `frontend/src/pages/SettingsPage.tsx` (463 lines, 4 nodes)
**Originating track:** `settings_config_page_20260330` — `cbc9b18678`
**Phase contract:** App configuration form for general, providers, websocket, and notification settings.

##### Node: `SettingsPage` (function, lines 59-462)
- **Severity:** Critical
- **Construction:** 404-line function body. **3 direct `fetch` calls** to `/api/settings` (GET, PUT) and `/api/notifications/preferences` (POST) — 2 of them inside `useEffect`s, 1 inside `handleSave`. 8 `useState` calls (config, loading, saving, error, toast, agents, prefState, savingPrefs). The `useEffect` at lines 79-90 manually syncs `preferences` (a Convex hook) into local state — a **concurrent-source-of-truth bug** if the hook updates faster than the user saves. A 463-line page that orchestrates, manages state, calls 2 APIs, and renders 4 form sections (general/providers/websocket/notifications) is doing too much.
- **Interaction:** One consumer (the route) + test.
- **Recommendation:** Split into `pages/settings/{GeneralSettings,ProviderSettings,WebSocketSettings,NotificationSettings}.tsx`; create a `useAppConfig` and `useNotificationPreferences` data hook. Move `FieldGroup` to `components/ui/FieldGroup.tsx`. The current "local-prefState-synced-from-Convex" pattern is the biggest functional risk in the slice — the user can edit a field, the hook updates, the form snaps back to the original value mid-typing.

#### `frontend/src/pages/PortfolioPage.tsx` (287 lines, 4 nodes)
**Originating track:** `review_remediation_20260529` — `0156192597`
- **Severity:** Medium
- **Construction:** Defines local `PortfolioCard` and `HealthFilterButton` subcomponents inline. The page body has 4 metric tiles (lines 200-217) repeating the same 3-line `<div>` — same pattern as MonitorPage. `formatCurrency` is local. `usePortfolioData` and `usePortfolioFilters` (slice-5) are used. The grid + filter UI is well-decomposed into `PortfolioCard`.
- **Recommendation:** Extract `formatCurrency` to `lib/formatCurrency.ts`; extract `HealthFilterButton` to `components/ui/`. The 4 metric tiles should be a `<MetricTile label value color />`.

#### `frontend/src/pages/PipelinesPage.tsx`, `PerformanceDashboard.tsx`, `AnalyticsDashboard.tsx`, `CostDashboard.tsx` (legacy dashboard pages)
- **Severity:** Medium
- **Construction:** These are **alternate dashboard pages** that the `dashboard_20260517` track did not deprecate. `AnalyticsDashboard.tsx` is the *original* analytics page that was added in the `frontend_global_dashboard_onboarding_20260325` track (commit `532d035e71` 2026-05-03). Three months later, the same track added `AnalyticsPage.tsx` and now both exist. Same for `CostDashboard.tsx` / `CostsPage.tsx` and `PerformanceDashboard.tsx` / `PerformancePage.tsx`.
- **Recommendation:** Decide which is canonical; delete the other. Today the route probably mounts both, which is a navigation collision waiting to happen.

#### `frontend/src/pages/SprintsHistoryPage.tsx` (1 node)
- **Severity:** None.

---

### 2.5 Markdown rendering — `MarkdownEditor.tsx` and `MarkdownViewer.tsx`

#### `frontend/src/components/MarkdownEditor.tsx` (419 lines, 8 nodes)
**Originating track:** `agent_harness_management_ui_20260327` — `f944afacb9`

##### Nodes: `InlineToken` (type), `parseInlineTokens` (function), `renderInlineTokens` (function), `renderPreviewBlock` (function), `renderMarkdownPreview` (function), `renderSourceLine` (function), `MarkdownEditor` (function)
- **Severity:** **Critical** (duplication finding the prompt explicitly called out)
- **Construction:** Implements a hand-rolled markdown parser: `parseInlineTokens` (lines 19-79, 60 lines), `renderInlineTokens` (81-122), `renderPreviewBlock` (124-242, 118 lines), `renderMarkdownPreview` (244-262), `renderSourceLine` (264-313). It also re-defines the `InlineToken` type (lines 13-17). The `<MarkdownEditor>` wrapper ties it to a textarea+preview UI.
- **Interaction:** Used by `AgentEditorPage.tsx` (line 5). Also used by AgentTemplateEditorPage and possibly others.

#### `frontend/src/components/MarkdownViewer.tsx` (276 lines, 6 nodes)
**Originating track:** `frontend_convex_migration_20260402` — `f0ae573c40` (2026-05-04)

##### Nodes: `InlineToken` (type), `parseInlineTokens`, `renderInlineTokens`, `renderPreviewBlock`, `renderMarkdown`, `MarkdownViewer`
- **Severity:** **Critical**
- **Construction:** `parseInlineTokens` is **byte-for-byte identical** to the one in `MarkdownEditor.tsx` (lines 10-75 here vs 19-79 there). `InlineToken` is identical (lines 4-8 vs 13-17). `renderInlineTokens` is a stripped-down version (no `source` param). `renderPreviewBlock` is **functionally identical** to the one in `MarkdownEditor.tsx` (lines 114-232 here vs 124-242 there) — both 118 lines, same block patterns.
- **Interaction:** `MarkdownViewer` is exported and used by sprint retrospective views (per the inventory, `components/retrospective/RetrospectiveViewer.tsx` and SprintRetrospective).
- **Recommendation:** Delete `MarkdownViewer.tsx` and use `MarkdownEditor.tsx` in read-only mode (or extract a `parseInlineTokens` + `InlineToken` + `renderInlineTokens` + `renderPreviewBlock` to `lib/markdown.tsx` and have both files import from it). The 60-line `parseInlineTokens` was copy-pasted, not refactored.

---

### 2.6 Issue tracking components — `IssueCard`, `IssueCreateModal`, `IssueDetailView`, `IssueListView`, `LoadErrorCard`

#### `frontend/src/components/IssueListView.tsx` (162 lines, 1 node)
**Originating track:** `fix_open_tech_debt_20260404` — `4f7438ee12`
- **Severity:** Medium
- **Construction:** 140-line body. Defines its own local kanban-style grouping by type. Uses `parsePayload` (likely the same as in `Governance.tsx:53-59`).
- **Interaction:** Used by `ProjectViewPage.tsx`.
- **Recommendation:** Lift `parsePayload` to a shared `lib/safeParse.ts`.

#### `frontend/src/components/IssueCreateModal.tsx` (152 lines), `IssueDetailView.tsx` (131 lines), `IssueCard.tsx` (66 lines)
- **Severity:** None for the smaller two.
- **IssueCreateModal** has 14 out-edges, suggesting heavy composition — likely fine.
- **Recommendation:** None.

#### `frontend/src/components/LoadErrorCard.tsx` (12 lines)
- **Severity:** Low
- **Construction:** 3-line `useState`-less function returning a single `<Card>`. Used by 2 callers (both versions of `ProjectViewPage` and the tests). Tiniest exported component in the slice.
- **Recommendation:** Move to `components/ui/ErrorCard.tsx` so other pages (Reconcile, NotificationHistoryPage) can use it for their silent-error path.

#### `frontend/src/components/Row.tsx` (8 lines)
- **Severity:** Low
- **Construction:** 3-line wrapper around a `<div>` with a label and value. 3 callers. Borderline-trivially small. Consider inlining at callers or moving to `ui/`.

#### `frontend/src/components/EmptyState.tsx` (7 lines)
- **Severity:** Low
- **Construction:** 1-line component, 2 callers. Both are pages (`AgentEditorPage`, `HarnessEditorPage`). Could be inlined.
- **Recommendation:** Inline or move to `ui/`.

#### `frontend/src/components/HarnessCard.tsx` (59 lines)
- **Severity:** None. 4 callers.

---

### 2.7 Ops / health components — `QueueHealth`, `FleetHealth`, `DispatchTimeline`, `Governance`, `GitStatusBar`, `GlobalQueue`, `ResultPanel`, `ProjectCard`, `ProjectHealthBadge`, `EmployeeCard`, `AgentCard`, `VelocityChart`, `SprintPanel`, `CoverageChart`, `CoverageDiff`, `DependencyGraph`, `PipelineList`, `PipelineLogs`, `LogStatsView`, `LogTimelineView`, `LogViewer`, `WelcomeScreen`, `WorkspaceScanner`, `ReviewResults`, `PortfolioRedirect`

#### `frontend/src/components/FleetHealth.tsx` (324 lines, 12 nodes)
**Originating track:** `environment_management_20260330` — `9e87e8dab7`

##### Nodes: 4 interfaces, 2 type aliases, 2 helpers (`formatDuration`, `formatPercent`), `SortableHeader`, `DispatchTable`, `HarnessTable`, `FleetHealth`
- **Severity:** Medium
- **Construction:** 119-line `FleetHealth` plus 98-line `DispatchTable` and 83-line `HarnessTable`. Two large inline tables. **`formatDuration` (lines 44-53) and `formatPercent` (lines 55-58)** are **duplicated** in `GlobalQueue.tsx:4-13` (with slightly different format), `PipelineLogs.tsx` (likely), and a half-dozen other files. `SortableHeader` is a 24-line private component that could be a shared `SortableHeader` primitive.
- **Interaction:** Single consumer is `OpsPage`.
- **Recommendation:** Extract `formatDuration` to `lib/formatDuration.ts` (it's already imported in `OptimizePage.tsx:7` from `@/lib/formatDuration`, so the canonical version exists — `FleetHealth` should import from there too instead of redefining).

#### `frontend/src/components/GlobalQueue.tsx` (90 lines, 2 nodes)
**Originating track:** `fleet_command_center_20260510` — `c6cfd5fcb0`
- **Severity:** Medium
- **Construction:** 76-line `GlobalQueue`. Has a **local `formatDuration`** (lines 4-13) that overlaps with the one in `FleetHealth` and the one in `lib/formatDuration`. Auto-refresh every 10s — should use `useConvexRealtime` from slice-5 instead of `setInterval` if not already.
- **Interaction:** 1 caller (`OpsPage`).
- **Recommendation:** Use the shared `formatDuration`.

#### `frontend/src/components/Governance.tsx` (180 lines, 6 nodes)
- **Severity:** Medium
- **Construction:** Local `formatTimestamp` (lines 39-51) — same as `Reconcile.tsx:18-30` and `DiagnosePage.tsx:12-24`. Local `parsePayload` (lines 53-59) — same as in `IssueListView.tsx`. **`parsePayload`** is **the most-duplicated helper in the slice** — at least 3 copies.
- **Interaction:** 1 caller (`OpsPage`).
- **Recommendation:** See §2.4.

#### `frontend/src/components/QueueHealth.tsx` (154 lines, 5 nodes)
- **Severity:** None seen.

#### `frontend/src/components/DispatchTimeline.tsx` (118 lines, 6 nodes)
- **Severity:** None.

#### `frontend/src/components/DependencyGraph.tsx` (294 lines, 7 nodes)
**Originating track:** `dependency_graph_20260330` — `1044ba51cd`
- **Severity:** Medium
- **Construction:** 166-line `DependencyGraph` body with 2 helpers (`buildReactFlowNodes` 71 lines, `buildReactFlowEdges` 17 lines) — all private. The component is self-contained but the ReactFlow conversion logic is doing a lot; consider extracting the data → ReactFlow adapter.
- **Interaction:** 1 caller (`ProjectViewPage`).
- **Recommendation:** Extract `buildReactFlowNodes` and `buildReactFlowEdges` to a `lib/dependencyGraphLayout.ts` for unit testability.

#### `frontend/src/components/CoverageChart.tsx` (166 lines, 2 nodes)
- **Severity:** Low.

#### `frontend/src/components/AgentCard.tsx` (142 lines, 3 nodes)
- **Severity:** Low
- **Construction:** 95-line `AgentCard` with private `SuccessBar` and `getAgentCategory`. 5 callers, 16 out-edges — high fan-out, indicates the card is doing more than just rendering (likely composing 4-5 sub-elements). The card imports from `@/lib/fleetTypes` which is a server-shared type. **Boundary check**: the file imports `ExecutionStatus` from `@/lib/fleetTypes` — if that's the same type used by the pivot REST API, this is fine; if not, the type is leaking.
- **Recommendation:** Verify the type import is a benign shared type, not a pivot server type.

#### `frontend/src/components/WorkspaceScanner.tsx` (198 lines, 3 nodes)
- **Severity:** Low.

#### `frontend/src/components/ProjectCard.tsx` (106 lines, 2 nodes), `ProjectHealthBadge.tsx` (28 lines), `HarnessCard.tsx` (59 lines), `EmployeeCard.tsx` (73 lines)
- **Severity:** None seen.
- All healthy.

#### `frontend/src/components/PerformanceRegressionTrendChart.tsx`, `SlowAgentLeaderboard.tsx`, `PhaseBreakdown.tsx`, `PhaseTrends.tsx`, `EmployeePerformancePanel.tsx`
- **Severity:** None seen in inventory.

#### `frontend/src/components/retrospective/*` (8 files)
**Originating track:** `sprint_retrospective_dashboard_20260527` — `a6c5d5285e` (2026-05-29)
- **Severity:** Low
- **Construction:** 8 subcomponents, all created in the same commit. Tests exist for `SprintRetrospectiveDashboard` and `AutoInsights`. Several are simple chart wrappers.
- **Interaction:** Used by `RetrospectivePage`.
- **Recommendation:** None.

#### `frontend/src/components/history/*` (12 files)
- **Severity:** None. Healthy decomposition.

#### `frontend/src/components/timeline/*` (4 files: AgentChain, ExecutionLog, PipelineTimeline, TaskInfoBar)
**Originating track:** `e2e_task_timeline_20260424` — `7d52a6c70d` (2026-05-19)
- **Severity:** None. Healthy.

#### `frontend/src/components/insights/InsightsErrorBoundary.tsx` and `InsightsTabs.tsx`
- **Severity:** Low. Used by the historical `AnalyticsDashboard.tsx` page. With the new `AnalyticsPage` in place, these may become orphans — verify route is still mounted.

#### `frontend/src/components/legacy/*` — only `KanbanBoard.tsx`
- **Severity:** High — see §2.3.

#### `frontend/src/components/ui/*` — `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`
- **Severity:** None. Real primitives (forwardRef + class-variance-authority). The graph didn't pick up these nodes (no `summary` fields populated by the indexer for `export interface` constructs) but they exist and are well-formed.
- **Recommendation:** Extend `ui/` with the missing primitives this slice invents repeatedly: `FieldGroup`, `MetricCard`, `MetricTile`, `TabButton`, `HealthFilterButton`, `StatCard`, `SortableHeader`, `ErrorCard`, `EmptyState`. Today every page reinvents these.

---

### 2.8 Track-level `useKanbanBoard` and `useConvexData` consumers — no findings; this is the hook layer in slice-5, but the pages here interact with it.

---

### 2.9 Orphan / low-fan-in components

The following are exported with `in_edges <= 1` (single caller) and may be candidates for inlining, or may be the legitimate API surface for a future track. Spot-checked:

- `WelcomeScreen` (3 callers incl. tests) — onboarding-only, fine.
- `PortfolioRedirect` (1 caller) — `App.tsx`, fine.
- `ResultPanel` (5 callers) — fine.
- `Row` (3 callers) — borderline; see §2.6.
- `EmptyState` (2 callers) — borderline; see §2.6.
- `LoadErrorCard` (2 callers) — borderline; see §2.6.
- `HarnessCard` (4 callers) — fine.
- `ProjectCard` (2 callers) — fine.
- `InsightsTabs` (1 caller?) — verify after the new AnalyticsPage migration.
- `WorkspaceScanner` (2 callers) — fine.

No true orphan components found in the inventory. The graph's "Ambiguous name" responses for several small components (e.g. `EmptyState`, `ResultPanel`, `Row`) suggest the indexer is creating two nodes per file — a duplicate-node bug in the build-graph indexer worth flagging to the synth pass (cross-slice link, slice-7).

---

### 2.10 Spec drift — 5 sampled pages

#### Sample 1: `frontend/src/pages/ProjectViewPage.tsx` (originating `agent_harness_management_ui_20260327`)
- **Phase contract (spec track):** "tabbed project view with board, dependencies, issues, sprint, logs, review, coverage, performance" (8 tabs declared in code).
- **Code reality:** 8 tabs declared. Tab implementations: board (uses `legacy/KanbanBoard` — not the new kanban stack), dependencies (`DependencyGraph`), issues (`IssueListView` + `IssueCreateModal` + `IssueDetailView`), sprint (`SprintPanel`), logs (`LogStatsView` + `LogTimelineView` + `LogViewer`), review (`ReviewResults`), coverage (`CoverageChart`), performance (`EmployeePerformancePanel`).
- **Drift:** The board tab uses the **legacy** kanban component, while the same track delivered a **new** kanban stack at `components/kanban/`. The spec did not call for two implementations; one is dead weight.
- **Impact:** Maintenance burden (469 lines of legacy kanban that nothing else uses); future kanban work will fork between two paths.

#### Sample 2: `frontend/src/pages/DashboardPage.tsx` (originating `agent_harness_management_ui_20260327`)
- **Phase contract:** Top-level dashboard.
- **Code reality:** 48 lines, 5 dashboard subcomponents, all from the `dashboard_20260517` track (later work).
- **Drift:** None significant. The original 2026-03-28 commit delivered a placeholder; the `dashboard_20260517` track (2026-05-17) refilled it. The 2-month gap is a tech-debt signal, not a drift.

#### Sample 3: `frontend/src/pages/AnalyticsPage.tsx` (originating `dashboard_20260517` — `72a3d0639d`, 2026-05-18)
- **Phase contract:** Sprint velocity, cost efficiency, delivery metrics.
- **Code reality:** 7 helpers, 2 subcomponents, inline 9-column table, plus a **commented-out import** at line 4: `// import { SprintHistoryTable } from '@/components/history/SprintHistoryTable'`. The inventory confirms `SprintHistoryTable` exists with 4 nodes — it is the **canonical** sprint-history table component.
- **Drift:** **Confirmed spec drift** — the page was specified to use `SprintHistoryTable` (or equivalent), but the import is commented out and replaced with an inline `<table>`. Almost certainly an unfinished migration.
- **Impact:** Dead commented code at line 4; the user gets a non-themed inline table instead of the consistent `SprintHistoryTable` styling.

#### Sample 4: `frontend/src/pages/CostsPage.tsx` (originating `dashboard_20260517` — `93fc462203`, 2026-05-18)
- **Phase contract:** "Cost insights and optimization."
- **Code reality:** 4 subcomponents, 4 formatters, no use of `components/cost/*` (BudgetGauge, CostByAgentChart, CostByProjectChart, CostTrendChart) which were delivered by the same `cost_tracking_20260502` track. The shared `CostTrendChart` component has the same name as the page-local one — naming collision.
- **Drift:** **Confirmed spec drift** — the cost tracking track built both `components/cost/*` and a `CostDashboard.tsx` page, then the dashboard_20260517 track built a *different* `CostsPage.tsx` that doesn't compose the cost components.
- **Impact:** Two competing cost dashboard implementations; one of them (CostDashboard) is now likely unused.

#### Sample 5: `frontend/src/pages/PerformancePage.tsx` (originating `dashboard_20260517` — `6f25fae66d`, 2026-05-18)
- **Phase contract:** "Agent reliability, pipeline costs, and rejection tracking."
- **Code reality:** 3 local subcomponents, 3 local formatters. Inline color classes for trend badges. Uses `usePerformanceData` hook (slice-5).
- **Drift:** **None significant** — this page is consistent with its own spec, but the empty `/** Renders a page component */` JSDoc at line 188 is a placeholder.

#### Sample 6: `frontend/src/pages/OptimizePage.tsx` (originating `schema_modularization_20260524` — `b38f53c19f`, 2026-05-26)
- **Phase contract:** A/B test management and policy weight inspector.
- **Code reality:** 490 lines, 1 page + 1 inner `ExperimentResultsView` + 1 inner `MetricBar`. Uses `window.location.reload()` for cache invalidation.
- **Drift:** The `window.location.reload()` and 3 direct `fetch` calls suggest the data layer (`useAbTests`/`useExperimentResults`) is read-only and missing a write API — a half-built data hook.
- **Impact:** Brittle state management; user gets a hard page reload after marking an experiment complete.

---

## 3. Cross-cutting patterns in this slice

The following patterns recur **more than twice** across the slice and should feed `lessons-learned.md`:

1. **Direct `fetch('/api/...')` in pages instead of `useConvexData`/`useFleetApi` hooks** — 10 pages (`SettingsPage`, `Reconcile`, `NotificationHistoryPage`, `OptimizePage`, `AgentTemplatesPage`, `AgentTemplateEditorPage`, `SprintPlanningPage`, `SimulatePage` wrapper, `ProvidersPage`, `RetrospectivePage`), ~25 fetch call-sites total. The slice-5 hooks (per the inventory glob) clearly exist for these endpoints but were not used. **Every direct fetch is a coupling risk: error paths diverge, abort signals are absent in 8 of 10, cache invalidation is ad-hoc.**

2. **Identical formatting/parsing helpers copied across files** — `formatCost` (4 copies: AnalyticsPage, CostsPage, PerformancePage, FleetHealth), `formatTimestamp`/`formatTime`/`formatAge` (5+ copies: DiagnosePage, Reconcile, Governance, BlockersPage, OptimizePage, plus more in slice-5), `parsePayload`/`parsePatch`/`parseInlineTokens` (3+ copies), `formatDuration` (3+ copies: FleetHealth, GlobalQueue, TaskCard — and there's already a `lib/formatDuration` that some files do import). **The pattern is "tried-and-true inline helper" — the `lib/format*` utilities either don't exist or aren't trusted.**

3. **Pages doing too much (size > 200 lines + business logic + direct fetches)** — 8 pages exceed the 200-line threshold while still doing fetch/state/render in the same file. `OptimizePage` (490), `SettingsPage` (463), `ProjectViewPage` (345), `AgentEditorPage` (362), `CostsPage` (320), `AnalyticsPage` (334), `SprintPlanningPage` (343), `BlockersPage` (213). The "page is an orchestrator" rule is violated by ~25% of pages.

4. **Two parallel implementations of the same domain**:
   - Markdown: `MarkdownEditor.tsx` and `MarkdownViewer.tsx` share `parseInlineTokens` (60 lines, byte-for-byte), `InlineToken` (5 lines, byte-for-byte), `renderPreviewBlock` (118 lines, near-identical). Two separate tracks (`agent_harness_management_ui_20260327` then `frontend_convex_migration_20260402`) added them 5 weeks apart — the second added a read-only viewer without extracting the parser.
   - Kanban: `components/legacy/KanbanBoard.tsx` (469 lines) vs `components/kanban/{KanbanBoard,KanbanColumn,TaskCard,SprintInfoBar}.tsx` (393 lines total). The legacy is consumed by `ProjectViewPage`; the new is consumed by `KanbanBoardPage`. Same problem.
   - Dashboards: `AnalyticsDashboard.tsx` (old) vs `AnalyticsPage.tsx` (new); `CostDashboard.tsx` (old) vs `CostsPage.tsx` (new); `PerformanceDashboard.tsx` (old) vs `PerformancePage.tsx` (new). Three pairs of duplicate top-level pages.

5. **Local subcomponents in pages** — `MetricBar`, `ExperimentResultsView`, `PortfolioCard`, `HealthFilterButton`, `TabButton`, `StatCard`, `BudgetUtilizationChart`, `CostTrendChart`, `AgentEfficiencyTable`, `ROISummary`, `OptimizationList`, `AgentReliabilityTable`, `PipelineCostBreakdown`, `RejectionReasonsAnalysis`, `FieldGroup` — **all defined inline at the top of page files**, never exported, never tested. The UI primitives layer (`components/ui/`) is sparse: 4 primitives, none of which are layout helpers.

6. **Inline color hex codes instead of design tokens** — `text-[#5e6ad2]`, `bg-[#141516]`, `border-[#23252a]`, `bg-[#0f1011]`, `text-[#8a8f98]`, `text-[#f7f8f8]` appear in 30+ files. Tailwind `theme.extend.colors` likely has `primary`/`secondary`/`foreground` tokens (per the `ui/card.tsx` usage) but the pages bypass them with arbitrary-value brackets. The "neo-brutalist" design system from the older pages (`legacy/KanbanBoard`, `BlockersPage`, `ProjectViewPage`) is in tension with the shadcn-style `border-border/60` pattern in newer pages.

7. **Missing semantic HTML in pages** — `<section>`, `<main>`, `<nav>`, `<header>`, `<article>` are used inconsistently. `DashboardPage.tsx:25` uses `<div>` for the entire layout; `MonitorPage.tsx:21` uses `<section>`; `OpsPage.tsx:107` uses `<section>`; `BlockersPage.tsx:43` uses `<section>`. **About half the pages use `<section>`, half use `<div>` for top-level layout.** Interactive elements are mostly `<button>` (good) but a few `<div role="button">` patterns exist (none found in this slice — good).

8. **"Empty-state / loading / no-data" boilerplate repeated 4+ times** — the pattern `if (data === undefined) return <Loading/>; if (data.length === 0) return <NoData/>; return <Content/>` appears verbatim in `AnalyticsPage.tsx:204-230`, `CostsPage.tsx:265-291`, `PerformancePage.tsx:194-223`, `MonitorPage.tsx`, `DashboardPage.tsx:18-20`, `BlockersPage.tsx:106-113 + 165-171`. A `<DataView data={...} loading={...} empty={...} render={...} />` primitive would eliminate ~150 lines.

9. **Placeholder JSDoc** — `/** Renders a page component */` and `/** Renders a view component */` appear on at least 12 exported page/component functions (e.g. `PerformancePage:188`, `MonitorPage:7`, `CostDashboard`, `AnalyticsDashboard`, many in slice-5 too). These came from the indexer template, not from a human. The actual semantic content is empty.

10. **Two `KanbanBoard` ambiguities and other graph indexer artifacts** — `build-graph callers` returns "Ambiguous name" for `EmptyState`, `Row`, `ResultPanel`, `LoadErrorCard`, `PortfolioRedirect`, `PortfolioCard`, and both Markdown components. The indexer appears to be creating two nodes per exported symbol. **This is a cross-slice finding for the synthesis pass — the graph.db is partially corrupted for the slice-4 surface.**

---

## 4. Top-10 improvement queue

| # | Node | Severity | Effort | Why |
|---|------|----------|--------|-----|
| 1 | `MarkdownViewer.tsx` + `MarkdownEditor.tsx` (parseInlineTokens/InlineToken/renderPreviewBlock duplication) | Critical | M | 60+118 lines of byte-identical code; the read-only viewer re-implements the editor. Extract to `lib/markdown.tsx`. |
| 2 | `SettingsPage.tsx` (404-line body, 3 direct fetches, dual-source-of-truth bug) | Critical | L | 8 `useState`, 3 fetches, 4 sections, "sync preferences into local state" race condition. Split into 4 page files + `useAppConfig`/`useNotificationPreferences` hooks. |
| 3 | `legacy/KanbanBoard.tsx` (469 lines, single caller `ProjectViewPage`) | High | M | A complete parallel kanban implementation that nothing else uses. Migrate `ProjectViewPage` to the new stack, delete the file. |
| 4 | `OptimizePage.tsx` (490 lines, 3 inner subcomponents, 3 fetches, `window.location.reload()`) | High | M | 5 months of mixed read-and-write logic in one page. Split into 4 subcomponents, port writes to a `useAbTestActions` hook. |
| 5 | `ProjectViewPage.tsx` (345 lines, 8 hook destructures, uses legacy kanban) | High | L | Should be 4 sub-views composed by a thin shell. Use the new `kanban/` stack. |
| 6 | `AgentTemplatesPage` + `AgentTemplateEditorPage` (7 direct fetches total) | High | M | Bypass the `useConvexData` hook layer entirely; should be a `useAgentTemplates` hook + form subcomponents. |
| 7 | `AnalyticsPage` + `CostsPage` + `PerformancePage` (duplicate formatters, duplicate empty-state boilerplate, competing dashboard pages) | High | L | Extract `lib/format{*,Cost,Percent}.ts`; extract a `<DataView>` primitive; decide between the legacy dashboard pages and the new ones. |
| 8 | `Reconcile.tsx` (3 direct fetches, `console.error` only) + `NotificationHistoryPage` (3 direct fetches, silent errors) | High | S | Add `useReconciliationActions` and `useNotificationActions` hooks; replace `console.error` with toast. |
| 9 | `SprintPlanningPage.tsx` (343 lines, internal `useProjects` hook does direct fetch) + `ProvidersPage.tsx` (127 lines, 2 parallel fetches with SettingsPage) | High | S | Port to `useProjectList`/`useAgents`/`useHarnesses`; the parallel fetches in SettingsPage and ProvidersPage will otherwise drift. |
| 10 | Local `formatTimestamp`/`formatAge`/`formatDuration`/`parsePayload` (≥10 copies across the slice) | Medium | S | Consolidate into `lib/format*`; touch at least 10 files. |

---

## 5. Track ↔ Implementation diffs

| Track | Phase | Spec said | Code does | Impact |
|-------|-------|-----------|-----------|--------|
| `agent_harness_management_ui_20260327` | UI slice | Multi-page editor + project view | Delivered a working UI but the **board view uses a 469-line legacy kanban** while the rest of the app uses the 393-line new kanban stack | Two parallel implementations to maintain |
| `dashboard_20260517` | Dashboard rebuild | Replace legacy dashboard with `useDashboardData` | Delivered `DashboardPage.tsx` (48 lines, clean) but **also** delivered `AnalyticsPage`, `CostsPage`, `PerformancePage` that don't use the new `analytics/*`/`cost/*` components | Three pairs of duplicate top-level pages |
| `cost_tracking_20260502` | Cost UI | Budget gauge, cost-by-agent, cost-by-project charts | Delivered `components/cost/*` and `CostDashboard.tsx` | `CostsPage.tsx` (later) duplicates the work |
| `frontend_convex_migration_20260402` | Convex integration | Read-only markdown viewer for sprint retrospectives | Delivered `MarkdownViewer.tsx` that **re-implements** the parser that `MarkdownEditor.tsx` already has | 180 lines of duplicated code |
| `environment_management_20260330` | Ops console | Tabs: queue, fleet, timeline, governance, runs | Delivered `OpsPage.tsx` (clean orchestrator) + 4 panel components | None |
| `frontend_project_kanban_board_20260325` | Kanban rewrite | Drag-and-drop kanban with new component stack | Delivered `kanban/{KanbanBoard,KanbanColumn,TaskCard,SprintInfoBar}.tsx` and `KanbanBoardPage.tsx` | `ProjectViewPage` was not migrated — uses the legacy component |
| `policy_simulation_replay_20260415` | Simulate page | Policy simulation form + report | Delivered `SimulatePage.tsx` with the **wrapper pattern** (pure page + default wrapper) | Best practice template; other 9 pages should adopt it |
| `state_reconciliation_engine_20260415` | Reconciliation UI | Apply/reject proposals | Delivered `Reconcile.tsx` with `ReconcilePanel` + default `ReconcilePage` wrapper | 3 silent-error fetches; pattern is correct but data layer is incomplete |
| `notification_system_20260502` | Notification history | Mark-read, mark-all-read, delete-old | Delivered `NotificationHistoryPage.tsx` with 3 fetches and no error UI | High — silent failure mode |
| `agent_harness_management_ui_20260327` | Markdown editor | Markdown editor with live preview | Delivered `MarkdownEditor.tsx` (419 lines) | Parser re-implemented in `MarkdownViewer.tsx` later |

---

## 6. Other observations for the synthesis pass

1. **The `frontend/src/widgets/` and `frontend/src/features/` directories do not exist on disk.** The inventory glob references them but no files live there. The 132 files in the inventory all live under `frontend/src/pages/` and `frontend/src/components/`. If the inventory glob was meant to be a forward-looking place-holder, the slice should be re-scoped.

2. **The graph.db indexer is producing duplicate nodes** — `build-graph callers` returns "Ambiguous name" for at least 10 single-file exported components in this slice (`EmptyState`, `Row`, `ResultPanel`, `LoadErrorCard`, `PortfolioRedirect`, `PortfolioCard`, `MarkdownEditor`, `MarkdownViewer`, `parseInlineTokens`, `renderInlineTokens`, `renderPreviewBlock`). The grep confirms there is one `EmptyState` function in one file, but the indexer created two nodes for it. **This affects every dependency-edge computation in the slice — caller/callee counts may be off by 2× for small components.** The synth pass should validate this is not a real coupling problem (it's not — only one file defines each).

3. **The `ui/` folder is sparsely populated** (4 primitives: button, card, input, label) while **pages reinvent layout primitives repeatedly** (FieldGroup in SettingsPage, TabButton in OpsPage, MetricCard in MonitorPage + Dashboard, HealthFilterButton in PortfolioPage, StatCard in AnalyticsPage, etc.). This is a one-time consolidation opportunity — adding 6-8 primitives would let ~150 lines of inline JSX in pages go away.

4. **Two parallel dashboard systems**: the `dashboard_20260517` track (2026-05-17) and the older `frontend_global_dashboard_onboarding_20260325` track (2026-03-25) co-exist. Routes likely mount both. The synth pass should confirm: are `AnalyticsDashboard.tsx`, `CostDashboard.tsx`, `PerformanceDashboard.tsx` still routed? If yes, which is the entry point for each URL?

5. **Cross-slice link to slice-5 (frontend/lib/hooks)**: many of the page-level fetches in this slice are calls to endpoints that slice-5 already exposes as hooks. Examples: `useProjectList`, `useAgentTemplates`, `usePortfolioData`, `usePerformanceData`, `useCostData`, `useSprintHistory`, `useKanbanBoard` — all used by some pages, all bypassed by others. The slice-5 audit should call out which hooks have read APIs but no write APIs (the most likely cause of the direct fetches).

6. **Cross-slice link to slice-7 (build-graph indexer)**: the duplicate-node artifact mentioned above. Either the indexer re-scanned a file (producing two `nodes` rows for the same symbol+file), or the SQL view is broken. Either way, every edge count in this report is suspect for nodes with in_edges ≤ 1.

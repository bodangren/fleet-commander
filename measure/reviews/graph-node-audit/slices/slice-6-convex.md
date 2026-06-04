# Graph Node Audit — Convex backend (schema + queries + mutations + analytics)

**Slice:** `slice-6-convex`
**Files reviewed:** 81
**Nodes reviewed:** 122 (71 functions, 34 interfaces, 9 type_aliases, 8 schema-level; plus file nodes)
**Findings:** Critical: 1 · High: 8 · Medium: 10 · Low: 4
**Date:** 2026-06-02

---

## 1. Slice Overview

The Convex slice is the source-of-truth datastore for the fleet: a 7-file modular schema (`schema/{core,tasks,agents,planning,operations,analytics,contracts}.ts` re-exported from `schema.ts`), ~35 query/mutation files, and a deep `convex/lib/` pure-function layer covering analytics, budget, cost, insights, performance, retrospective, and notifications helpers. The `schema_modularization_20260524` track landed cleanly — schemas are split along domain seams and the generated `dataModel` is stable. The `convex_test_remediation_20260520` track successfully replaced fake analytics tests with real pure-function tests in `convex/lib/`. Health signal: **structurally solid, but several anti-patterns from the Convex guidelines appear repeatedly** — `.filter()` lookups by `_id` instead of `ctx.db.get`, `.collect()` for counts, sequential `await` in loops, `v.string()` typed IDs, anonymous-bootstrap auth fallback, and a missing `auth.config.ts`. These add up to a hidden cost on hot queries and a latent auth risk.

---

## 2. Schema audit (first, per Convex special guidance)

The schema is split into 7 files of ~50–120 lines each; `convex/schema.ts` is a 17-line spread. **Modularization is clean** (schema_modularization_20260524 plan Phase 7 verification: "dataModel.d.ts: zero diff").

### Index coverage vs usage

Spot-checked 6 high-traffic tables:

| Table | Indexes defined | Queries that use `withIndex` | Tables using `.filter()` lookup by `_id` |
|-------|-----------------|------------------------------|------------------------------------------|
| `tasks` | by_project, by_status, by_sprint, by_status_and_updated_at, by_task_key | tasks.ts:35, kanban.ts:62, history/tasks.ts:36, history/sprints.ts:43 (projectId not sprintId), retrospectives.ts:245 | employees.ts (×5), notifications.ts:122 (type filter) |
| `employees` | by_status, by_name | scheduler.ts:67 | employees.ts:41,102 (uses .filter by _id) |
| `runs` | by_task, by_employee, by_employee_and_startedAt, by_status | kanban.ts:93, scheduler.ts:141 | — |
| `workRuns` | by_project, by_project_and_status, by_run_id, by_started_at, by_status_and_started_at, by_runnerHost_and_started_at | analytics.ts:70, performance.ts:37, fleet.ts:39 | — |
| `costRecords` | by_project, by_agent, by_task, by_recorded_at, by_project_and_recorded_at | costs.ts:115,121,170,178,219,227,273,281,313,320 | — |
| `notifications` | by_user, by_user_and_read, by_user_and_type, by_created_at | notifications.ts:113,122,174,183,191,198,211,234,252,261,275,302 | notifications.ts:175 (filter after withIndex) |

**Verdict: index coverage is good.** Most queried fields have an index; the remaining `.filter()` calls are for `_id` (which should use `ctx.db.get` — see §3 findings).

### `v.any()` / overly-broad validators

- `convex/notifications.ts:533` — `deliverWebhook` action: `payload: v.record(v.string(), v.any())`. **Anti-pattern** (see guideline §Typescript: "Be strict with types, particularly around id's of documents"). For a webhook the payload is genuinely arbitrary, but a tighter `v.union(...)` covering the known event payloads (or a discriminated union like the `agents.test.ts` example in the guidelines) would be safer.

### Validator duplication across files

- `convex/notifications.ts:10-21` re-defines the `notificationType` union already exported by `convex/lib/validators.ts:65-76`. Should import.
- `convex/budgets.ts:8-13` declares a local `GovernanceEventType` (string union), and `convex/budgets.ts:25-36` declares a `governanceEventEntry` validator, while `convex/schema/analytics.ts:35-51` is the source of truth for the table validator. **Two sources of truth** for governance event types — drift risk if a new event type is added.

### Schema fields with hanging refs (verify migration cleanliness)

- `convex/schema/tasks.ts:8,16-18` — `sprintId: v.optional(v.id('sprints'))`, `assigneeId/reviewerId/mergerId: v.optional(v.id('agents'))` — all reference other tables correctly.
- `convex/schema/contracts.ts:32-36` — `dispatchRejections: v.optional(v.array(v.object({...})))` — embedded objects are bounded (per guideline: "Do not store unbounded lists").
- `convex/schema/analytics.ts:53-67` — `performanceBaselines` table has `by_baseline_date` (single field), no compound `(agent, projectSlug, taskKind, baselineDate)`. Queries against baseline lookups by agent+project+kind then filter in-memory.

### `auth.config.ts`

**Missing.** The directory has no `convex/auth.config.ts`. Per the Convex guidelines §Authentication: "ALWAYS create this file when using authentication. Without it, `ctx.auth.getUserIdentity()` will always return `null`." This is not theoretical — combined with the `anonymous-bootstrap` fallback in `lib/auth.ts:28-30`, **every public mutation in this slice is anonymously callable in any environment**. See §3 finding `resolveActor`.

---

## 3. Per-file findings

### `convex/schema.ts` (modularized)

- **No findings.** 17-line spread across 7 module files. Phase contract ("split into per-domain files") is met.

### `convex/schema/{core,tasks,agents,planning,operations,analytics,contracts}.ts`

- **No major findings.** One minor: `convex/schema/analytics.ts:65` `by_agent_project_and_taskKind` — field order is `agent, projectSlug, taskKind` but the field list reads `by_agent_project_and_taskKind` (no "and" between project and taskKind). Per the guideline "Always include all index fields in the index name" the name is fine; just a readability nit.
- `convex/schema/analytics.ts:49-50` — index `by_scope_and_eventType_and_createdAt` is defined but `convex/budgets.ts:224` queries `by_scope_and_eventType_and_createdAt` with only `.eq('scope', ...)` (no `eventType`), which **does not use the leading index field correctly** — Convex requires the leading field to be in the predicate. This works only because Convex's index is on `['scope', 'eventType', 'createdAt']` and a `scope.eq` query can scan within the scope partition, but the filter for eventType is then redundant. The query is functional but may not benefit from the index as intended.

### `convex/lib/auth.ts`

**`resolveActor` (function, lines 10-30)**
- **Severity: Critical (latent).**
- **Construction:** Returns `{ subject: 'anonymous-bootstrap', isAuthenticated: false }` when `ctx.auth.getUserIdentity()` returns null. The docstring labels this "Bootstrap mode: allow local development without auth provider wiring." But because **no `convex/auth.config.ts` exists**, `getUserIdentity()` will **always** return null in any environment (per Convex guideline: "Without it, ctx.auth.getUserIdentity() will always return null"). Every public mutation in this slice silently accepts anonymous callers.
- **Interaction:** Called by ~30 query/mutation handlers across the slice.
- **Recommendation:** Create `convex/auth.config.ts` with a real OIDC provider for production; in development either keep the bootstrap behind a `process.env.NODE_ENV === 'development'` check or have the bootstrap throw for sensitive mutations. At minimum, log a warning when the bootstrap path is taken.

### `convex/lib/analytics.ts` (20 entities — the slice's biggest pure lib)

All 10 functions are pure (no DB access, no globals beyond `Date.now()` passed in). Reads inputs, returns outputs. This is the **intended contract** per the `convex_test_remediation_20260520` plan ("Phase 1: Replace fake analytics tests with real pure-function tests"). The real-function test file `convex/lib/analytics.test.ts` (21KB) confirms the pure-function contract is enforced.

**`bucketCompletionTrends` (function, lines 161-177)**
- **Severity: Low.** In `getCompletionTrends` the caller `ctx.db.query('tasks').collect()` ALL tasks and filters in-memory. This is at the caller side — see `analytics.ts` finding below.
- **Construction:** clean; uses `generateDayBuckets` for date boundaries.
- **Recommendation:** none for the lib itself; fix is on the caller.

**`computeBottlenecks` (function, lines 224-278)**
- **Severity: Low.** The `key.split('::')[0]` and `key.split('::')[1]` pattern at the end recovers `agent` and `taskKind` from a composite key that was constructed with `${agent}::${taskKind}`. If `agent` or `trackId` ever contains `::` the split will be wrong. In practice trackId/agent names are slugs, so this is a defensive-coding concern only.

**`computeSessionMetrics` (function, lines 344-380)**
- **Severity: Low.** At line 377: `resumptionRate: tasks.length > 0 ? sessionTasks.length / tasks.length : 0`. The name `resumptionRate` suggests "rate of session resumption" but the formula is "fraction of tasks that have a sessionId" (i.e. session adoption rate, not resumption rate). Resumption is computed at line 354-372 as `resumedSessions` but never folded into this rate. The semantic mismatch is a real correctness risk for the Insights dashboard.

**The 9 interface declarations (AnalyticsTaskDoc, etc.) and 1 type alias (AnalyticsTaskFilters)**
- **No findings.** All have non-empty JSDoc summaries and are descriptive.

### `convex/lib/retrospective.ts` (8 entities)

**Every node in this file has an empty `summary: ""`** in the graph inventory (6 interfaces + 2 functions). The graph extractor didn't pick up JSDoc; the actual file has JSDoc on `extractTags` and `aggregateSprintData` — but the 6 interfaces (`RetrospectiveTaskDoc` etc.) have no JSDoc at all. This is consistent with the `type_deduplication_20260524` track's intent (move types to `lib/types.ts`) — only `OrchestratorErrorDoc` actually got moved.

- **Severity: Medium** for the 6 interfaces lacking JSDoc.
- **Recommendation:** add brief JSDoc to each (the file has rich internal comments — they should be in the JSDoc not free-floating). Consider also moving the `RetrospectiveTaskDoc` family to `lib/types.ts` per the same consolidation that landed for `OrchestratorErrorDoc`.

**`aggregateSprintData` (function, lines 133-352)** — 220 lines, one of the largest functions in the slice.
- **Severity: Low.** High cyclomatic complexity (multiple responsibilities: task filtering, agent workload, issue patterns, velocity, hook failures, session metrics, priority correlation, blocked-by chains, top errors). Worth refactoring into named helpers (`computeAgentWorkload`, `computeIssuePatterns`, etc.) so each can be tested in isolation. Currently tested as a monolith in `analytics.test.ts` (21KB). No memory or correctness bug.

### `convex/lib/insights.ts` (11 entities)

`computeSprintMetrics`, `computeCostTrend`, `computeAgentEfficiency`, `computeROISummary`, `computeOptimizations`, `classifyValueScore` — all pure functions, all take typed inputs.

- **Severity: Medium** — `computeSprintMetrics`, `computeCostTrend`, `computeAgentEfficiency`, `computeROISummary` use parameter type `any[]` instead of typed `SprintDoc[]` / `AgentDoc[]` / `CostRecord[]`. The interfaces (SprintMetric, CostTrendItem, etc.) are exported but not used as the parameter type. This loses type-safety at the function boundary.
- **Recommendation:** define `SprintDoc`, `AgentDoc`, `CostRecordDoc` interfaces (analogous to `AnalyticsTaskDoc`) and use them as the parameter types. The caller `insights.ts:55,116-119` will need to provide typed docs.

### `convex/lib/performance.ts` (14 entities)

All exported functions (`computePhaseBreakdown`, `computePhaseTrends`, `computeAgentLatencyStats`, `detectSlowAgents`, `computeBaselineSnapshots`, `computeRegressions`) are pure. They take `readonly WorkRun[]` where `WorkRun = Doc<'workRuns'>` (uses the proper Convex generated type — good). `percentile` and `computePercentiles` are module-private (no `export`) but are imported in scope by other functions.

- **No findings.** Cleanest of the lib files.

### `convex/lib/budget.ts` (12 entities)

9 exported pure functions, 2 type aliases, 1 interface. All have JSDoc.
- **`isBudgetBreached` (lines 18-26):** the strict and the fallback both return `budget.spent >= budget.cap` (lines 20 and 25). The "soft" case is missing — the comment in the diff says "if policy is not strict, advisory → > ; default → >=" but the implementation drops the soft policy entirely (no `else if (budget.policy === 'soft')` branch). The two `if` arms collapse: strict and not-strict and not-advisory all hit the second arm. The `advisory` branch returns `>` as expected. **Latent logic gap**: the implicit "soft" case has no semantics and silently falls through to the `>=` check.
- **Severity: Medium.**

### `convex/lib/cost.ts` (9 entities)

`MODEL_RATES` has 11 entries (gpt-4 through gemini-1.5-flash). Schema `agentTemplates.model` uses `supportedModels` from `lib/validators.ts:118-125` which lists only `claude-opus`, `claude-sonnet`, `gpt-4o`, `gpt-4o-mini`, `gemini-pro`, `gemini-2.5-pro` — **disjoint from `MODEL_RATES`**. So if a task is recorded with model `claude-opus` (valid in schema), `computeCost` falls through to `DEFAULT_RATE` ($10/$30) instead of the correct `claude-3-opus` rate ($15/$75) or a real `claude-opus` rate. Two parallel model lists with no shared source of truth.
- **Severity: Medium** (cost reports will be wrong for any `supportedModels` value not in `MODEL_RATES`).

`extractTokenUsage` (lines 80-98) uses `??` (nullish coalescing) on `usage.prompt_tokens as number` etc. — if a provider returns `prompt_tokens: 0` it will fall through to the next field. Minor; likely intentional (treat 0 as missing).

### `convex/lib/costMetrics.ts`, `convex/lib/notifications.ts`, `convex/lib/types.ts`

- All clean, minimal, well-documented. No findings.

### `convex/employees.ts` (7 handlers)

**`getEmployeeHandler` (function, lines 28-34)** & **`updateEmployeeStatusHandler` (74-84)** & **`assignTaskHandler` (95-105)** & **`unassignTaskHandler` (116-123)** & **`getEmployeeWorkloadHandler` (131-135)**
- **Severity: High** (repeating pattern, count once).
- **Construction:** Each uses `ctx.db.query('employees').filter((q) => q.eq(q.field('_id'), args.id as any)).first()` to look up by primary key. Per the Convex guidelines, use `ctx.db.get(id)` directly. The `filter` approach forces a full table scan and is the documented anti-pattern in guideline §Query guidelines: "Do NOT use `filter` in queries. Instead, define an index in the schema and use `withIndex` instead."
- **Plus:** `args.id` is typed as `v.string()` then cast `as any` to satisfy `_id`. The signature should be `v.id('employees')` per guideline §Typescript: "Be strict with types, particularly around id's of documents."
- **Recommendation:** replace all 5 with `const doc = await ctx.db.get(args.id)` after changing the arg to `v.id('employees')`.

**`getEmployeeWorkloadHandler` (lines 131-135)**
- **Severity: High.**
- **Construction:** `ctx.db.query('tasks').collect()` then filters in memory for `t.assigneeId === _args.employeeId`. No `withIndex('by_project'...)` or `withIndex('by_sprint'...)` — collects the entire `tasks` table just to count rows for one employee. This is a textbook `v.union`-of-N+1 and a `.collect().length`-adjacent anti-pattern (guideline: "you should ALWAYS return a bounded collection").
- **Recommendation:** add a `by_assigneeId` index to the `tasks` table (schema/tasks.ts), then `ctx.db.query('tasks').withIndex('by_assigneeId', q => q.eq('assigneeId', args.employeeId)).take(1000).length`. Or maintain a denormalized workload counter on the `employees` row.

### `convex/scheduler.ts` (5 handlers)

**`getRunByTaskHandler` (lines 110-153)**
- **Severity: Low.**
- **Construction:** collects all runs for a task then iterates linearly to find the most recent by timestamp. For a task with many runs this is O(n). Could use `.order('desc').first()` with a `by_task_and_startedAt` index, or use `by_employee_and_startedAt` analogously. Currently uses index `by_task` correctly (no filter) but no compound index.
- **Recommendation:** add `by_task_and_startedAt` index and use `.order('desc').first()`.

**`listReadyTasksHandler` (45-51)**, **`listActiveEmployeesHandler` (54-60)** — clean, use indexes correctly.

**`createRunHandler` (68-79)**, **`updateTaskStatusHandler` (90-99)** — clean, no `resolveActor` call (these are internal-facing scheduler APIs that pivot calls). Mild concern that they bypass the auth check, but they're called from the same Convex context as authenticated callers so it's a non-issue.

### `convex/notifications.ts`

**`getUnreadCount` (lines 204-215)**
- **Severity: Medium.**
- **Construction:** `ctx.db.query('notifications').withIndex('by_user_and_read', ...).collect()` then `.length`. Convex guideline §Query: "Never use `.collect().length` to count rows. ... maintain a denormalized counter." Even with an index this fetches all unread rows just to count them.
- **Recommendation:** denormalize unread count per user on `notificationPreferences` (or a `userStats` doc) and increment in `createNotification` / reset in `markRead`.

**`markAllRead` (lines 227-242)**
- **Severity: High.**
- **Construction:** same `.collect()` then N×`ctx.db.patch` in a serial loop. For a user with 10K unread notifications this is 10K round-trips inside one transaction. Convex mutation limit is 16K documents per transaction. **Will fail at scale.**
- **Recommendation:** process in batches of 100 with `ctx.scheduler.runAfter(0, internal.notifications.markReadBatch, ...)` per guideline §Mutation: "If a mutation needs to process more documents than fit in a single transaction... process a batch with .take(n) and then call ctx.scheduler.runAfter(0, api.myModule.myMutation, args)."

**`deleteOldNotifications` (lines 244-264)**
- **Severity: High.** Same pattern: `.collect()` then N×`ctx.db.delete`. Same scaling risk and same recommendation.

**`deliverWebhook` action (lines 529-547)**
- **Severity: Medium.** Uses `v.record(v.string(), v.any())` for payload (per guideline: prefer strict types). Also note this is an `action` (good — webhook I/O shouldn't be in a mutation) but it's a public `action`, callable anonymously given the bootstrap auth gap.

**`getUserNotifications` (lines 158-202)**
- **Severity: Low.** Branching logic for type+read, read-only, type-only, neither — the (type && read) branch is correct, but the (read-only) branch (line 180-186) uses index `by_user_and_read` correctly. No issue other than the (type && read) branch falling through to a `.filter()` after the index at line 175 (which is documented but technically unnecessary since `by_user_and_type` is available for type-only — line 188-194).

### `convex/budgets.ts`

**`upsertBudget` (lines 45-82)**
- **Severity: Low.** Uses `by_scope` index correctly.

**`recordSpend` (lines 107-147)**
- **Severity: High.**
- **Construction:** atomically updates budget, then `ctx.runMutation(api.notifications.notifyBudgetAlert, ...)` in a try/catch. This is **the correct pattern** per the guideline (chain via `ctx.runMutation`). The try/catch is also documented in the plan. However, the notification runs *inside* the same mutation transaction — if the notification logic ever throws something other than what the try/catch handles, the whole mutation rolls back. Currently `notifyBudgetAlert` calls `insertNotificationIfAllowed` which is well-bounded, so this is fine in practice. Flagging because the try/catch silently swallows any error including type errors.

**`getGovernanceEvents` (lines 194-239)**
- **Severity: Medium.** The `if (args.scope)` branch (line 221-227) uses index `by_scope_and_eventType_and_createdAt` but only filters on `scope` — should use `by_scope_and_createdAt` (which is defined in schema/analytics.ts:51). The compound index is fine for a prefix query but suboptimal vs. the dedicated 2-field index.

**`resetBudgetsCron` (lines 318-346)**
- **Severity: Low.** Reads `ctx.db.query('budgets').collect()` (all budgets) then patches in serial loop. For a system with hundreds of budgets this is fine; for thousands it approaches the transaction limit. Consider batched scheduler pattern.

### `convex/portfolio.ts`

**`getPortfolioHandler` (lines 63-152)**
- **Severity: High.**
- **Construction:** N+1 pattern. For each project, 2 separate awaits (`sprints` query, then conditionally `tasks` query for the last sprint). Inside `Promise.all` but each `await` inside the map still serializes on the project axis. For 50 projects this is 100 separate queries. The Promise.all helps, but each project sequentially issues its sprints then tasks query.
- **Interaction:** Called by the portfolio dashboard (no graph caller available, but used by `useConvexQuery(portfolio.getPortfolio...)` per typical patterns).
- **Recommendation:** fetch all sprints in one query grouped by `projectId` client-side; or use a single index that covers `(status, projectId)` and order by `closedAt desc` to get the "last sprint" for each project without the second query.

**`getProjectHealth` (lines 8-61)** — pure function, clean.

### `convex/kanban.ts`

**`getSprintBoardHandler` (lines 29-141)**
- **Severity: High.**
- **Construction:** Two N+1 patterns:
  1. Lines 72-74: `Array.from(agentIds).map((id) => ctx.db.get(id as any))` — parallelised, fine.
  2. Lines 88-99: `taskIds.map(async (id) => { ... .query('runs').withIndex('by_task', ...) })` — one indexed query per task to find the latest run. For a sprint with 30 tasks this is 30 queries. Could be replaced by a single `by_sprint_and_startedAt` index on `runs` (or a denormalized `latestRun` field on `tasks`).
- **Interaction:** Used by `useConvexQuery(kanban.getSprintBoard)` (high-traffic kanban dashboard).
- **Recommendation:** denormalize `latestRunId` and `latestRunDurationMs` on the `tasks` document, updated in the same mutation that creates a run.

### `convex/taskTimeline.ts`

**`getTaskTimelineHandler` (lines 82-145)**
- **Severity: High.**
- **Construction:** Lines 125-130 — `for (const agentId of agentIds) { const agent = await ctx.db.get(agentId); }` — **serial `await` in a loop**. For a task with 5 agents, 5 round-trips in series. Could be `await Promise.all(Array.from(agentIds).map(id => ctx.db.get(id)))`.
- **Plus:** `omitCreationTime` summary in the graph is "Task timeline aggregation combining task, pipeline runs, agents..." — **wrong summary** (it actually just strips `_creationTime` from a doc). JSDoc in the file (line 72-76) is correct; the graph extractor picked up the wrong text. Minor.
- **Plus:** `as unknown as WithCreationTime<typeof agent>` casts (line 128, 136, 138, 141, 142) — pervasive `as any`/`as unknown as` pattern. Should use Convex's `Doc`/`Id` types directly.

### `convex/analytics.ts` (function side, 6 queries)

**`getCompletionTrends` (17-48)**, **`getBottlenecks` (82-115)**, **`getQueueDepth` (117-147)**, **`getSessionMetrics` (181-215)**
- **Severity: High** (4 functions, all same pattern).
- **Construction:** Each does `ctx.db.query('tasks').collect()` then filters in-memory by `updatedAt >= cutoff`. This is **the slice's biggest "collect then filter" problem** — there is **no `by_status_and_updated_at` index on `tasks` keyed off `updatedAt` alone**, but the `by_status` index doesn't help here. For thousands of tasks this is unbounded.
- **Recommendation:** add a `by_updated_at` index to `tasks` table; replace the `.collect()` with `.withIndex('by_updated_at', q => q.gte('updatedAt', cutoff)).take(1000)` or paginate. Then the lib/analytics pure functions still get bounded inputs.

**`getAgentUtilization` (50-80)** — uses `by_started_at` index correctly, no `.collect()`.

**`getHookMetrics` (149-179)** — uses `by_created_at` index on `orchestratorErrors`, no `.collect()`.

### `convex/performance.ts` (function side)

**`getPerformanceOverview` (lines 232-363)**
- **Severity: High.**
- **Construction:** Lines 285-291: `ctx.db.query('pipelineRuns').collect()` then if `projectSlug` is provided, **also** `ctx.db.query('tasks').collect()` to filter pipeline runs by `projectSlug`. The `pipelineRuns` table has no `projectSlug` field — so project filtering requires joining with `tasks`. This is documented and the project plan (Phase 2: "filter pipelineRuns by projectSlug via tasks table lookup") is the accepted workaround, but it's a perf hazard.
- **Recommendation:** add a denormalized `projectSlug` to `pipelineRuns` (filled in at insert time) and add `by_project` index. This is also a "high-churn operational data on a shared document" smell (per guideline §Schema: "Separate high-churn operational data... from stable profile data") — pipelineRuns gets denormalized taskId+projectSlug+cost+timing on every pipeline stage.

**`getPhaseBreakdown`, `getPhaseTrends`, `getAgentLatencyStats`, `getSlowAgents`, `getRegressionAlerts`** (lines 16-230) — All use `by_started_at` index correctly. The `if (args.projectSlug)` branch falls back to `by_project` index + filter (lines 39-44, 81-86, 117-122, 153-159, 197-203, 209-214) — this dual-path pattern is repeated 6 times and could be extracted into a helper.

### `convex/insights.ts` (function side)

**`getCostOverview` (lines 59-145)**
- **Severity: Medium.**
- **Construction:** Lines 127, 133, 136 — `ctx.db.query('agents').collect()`, `ctx.db.query('tasks').collect()` (or `by_project` index), `ctx.db.query('costRecords').collect()`. Three unbounded queries. The `tasks` and `costRecords` paths use indexes, the `agents` path doesn't.
- **Recommendation:** for `tasks` and `costRecords`, filter by `recordedAt`/`updatedAt >= cutoff` in the index predicate (same as analytics.ts). For `agents`, all-agents is probably fine for a dashboard, but the lib function `computeAgentEfficiency` will iterate everything in-memory regardless.

### `convex/costs.ts`

**`recordCost` (lines 9-90)**
- **Severity: High.**
- **Construction:** Mutation does **5 sequential awaits**: insert cost record → patch runContracts → query budgets → patch budget → conditionally insert governanceEvent. All serial. This is one mutation transaction so the awaits are necessary for atomicity, but the workload is heavy per call. If called in a hot loop (e.g., bulk import) this will hit the 16K document / transaction limit.

**`backfillCostRecords` (lines 334-399)**
- **Severity: High.** Per-contract: 1 `withIndex` query, then 1 `withIndex` query for existing, then 1 `insert`. For 10K contracts: 20K+ queries inside one transaction. Will fail.
- **Recommendation:** batched scheduler pattern.

**`getCostByProject`, `getCostByAgent`, `getCostTrend`, `getSessionSavings`, `getCostPerTask`** (lines 92-332) — all use `by_project_and_recorded_at` or `by_recorded_at` indexes correctly. The triple-`(projectSlug)`-branch pattern is repeated 5 times — could be extracted.

### `convex/fleetCatalog.ts`

**`getBootstrapSummary` (lines 6-56)**
- **Severity: High.**
- **Construction:** `Promise.all` of 8 `ctx.db.query(...).collect()` calls, then `.length` on each. The file itself has a `// TD-029:` comment acknowledging the issue. Convex guideline §Query explicitly says "Never use `.collect().length` to count rows." For 8 tables this is 8 full table scans on every dashboard refresh.
- **Recommendation:** denormalized counters on `systemMetadata` (which already has `key`/`valueJson`/`updatedAt` and an index) maintained in the relevant insert/delete mutations.

### `convex/history/{tasks,sprints,agents}.ts`

**`listTaskHistoryHandler` (tasks.ts:22-67)**
- **Severity: Medium.** Lines 55-56: `ctx.db.query('agents').collect()` (all agents) on every call. Then map by ID. No `by_...` index needed since it's loaded into a Map, but the `.collect()` is unbounded. Should be at least `.take(1000)`.

**`getTaskHistoryHandler` (tasks.ts:69-86)** — same `.collect()` of all agents just to resolve one name.

**`getSprintHistoryHandler` (history/sprints.ts:63-87)** — line 70-74 uses `by_project` index on tasks to find sprint tasks, then filters in memory. Should be `by_sprint` index (which exists on tasks). The function is doing one extra scan.

**`listAgentHistoryHandler` (history/agents.ts:21-78)** — line 42: `ctx.db.query('pipelineRuns').collect()` (all pipeline runs) for every call. This will be expensive as pipelineRuns grows.

**`listAgentHistoryHandler` line 47** — `tasks.find((t) => t._id === run.taskId)` inside a loop is O(N×M) where N=pipelineRuns and M=tasks. Should build a task Map.

### `convex/fleet.ts`, `convex/audit.ts`, `convex/projects.ts`, `convex/agents.ts`

**`getFleetStatus` (fleet.ts:5-53)** — uses indexes correctly (`by_status` for tasks/issues/workRuns, `by_recorded_at` for costRecords). Clean.

**`getAlertsWithFilters` (fleet.ts:206-262)** — when `args.resolved === false`, uses `by_resolved` index. When `args.resolved !== false`, **falls through to `ctx.db.query('alerts').order('desc').collect()`** with no `.take()` — unbounded.

**`getAgentWorkload` (fleet.ts:159-204)** — many fields are hard-coded to `0` or `undefined` (`successRate7d`, `medianLatencyMs`, `queueDepth`, `circuitState`). The handler is effectively a stub — the schema for `harnessReliabilityStats` exists and could be queried. This is a known gap (fleet_command_center_20260510).

**`getActiveSprintForProject` (fleet.ts:277-296)**, **`getTasksForSprint` (298-317)**, **`getBlockedTasksAcrossProjects` (55-75)** — return `null` / `[]` (stubs). Phase 1 of the Fleet Command Center track is incomplete.

**`listAuditEventsHandler` (audit.ts:26-115)** — 4 `take(limit)` calls + 1 `agents.collect()` (line 89). The agents collect is fine since it's loaded into a Map. But the function merges 4 streams and then filters in-memory — `args.type` and `args.agentId` filters at lines 106-110 cannot use any index. For an audit log this is acceptable; just flag.

### `convex/tasks.ts` (function side)

**`assignTaskHandler` (lines 130-165)**
- **Severity: Medium.**
- **Construction:** `await ctx.db.get(args.agentId)` then `await ctx.db.get(args.taskId)` then 2 patches. Two `get`s in series. Should `Promise.all` them.

**`createTaskHandler` (56-96)**
- **Severity: Low.** Accepts `assigneeId` as `v.optional(v.id('agents'))` correctly (good — uses `v.id`, not `v.string()`). Resolves cost estimate from agent's `costPerPoint`. Clean.

### `convex/agentTemplates.ts` (9 handlers)

All use `v.id('agentTemplates')` for IDs, all use `by_name` index. `deleteTemplateHandler` (lines 153-167) checks for assigned agents via `by_templateId` index — good cascading check.

- **No major findings.** Clean file.

### `convex/harnessProfiles.ts`, `convex/dispatchPolicyStats.ts`, `convex/scoreAudit.ts`

**`harnessProfiles.ts`** — clean, uses `by_name` index, JSON-stringifies `invocationFlags`/`capabilities`/`policy` correctly.

**`dispatchPolicyStats.ts`** — **all 3 query handlers are stubs returning `null` or `[]`**; the `upsertDispatchPolicyStats` mutation returns `args` directly without writing to the database. This is a Phase 1 placeholder but it's wired into the public API. Convex guideline §Query: "If the user does not explicitly tell you to return all results from a query you should ALWAYS return a bounded collection" — these return bounded empty arrays, so technically OK, but the file advertises a working feature in `pivot/src/policy/statsClient.ts` that doesn't actually exist.

**`scoreAudit.ts`** — same pattern: 4 stub queries + 1 stub mutation. The `createScoreAudit` mutation **returns the constructed object without inserting it** — lines 34-44. This is a "did the write happen?" correctness bug: a caller calling `createScoreAudit` will get a 200 with the new entry but no row will exist.

- **Severity: Critical (latent)** for `scoreAudit.ts:createScoreAudit` — the mutation body does not call `ctx.db.insert` (line 33-44). This looks like a Phase 1 stub from `environment_management_20260330` that was never finished. Should be fixed or the export removed.

### `convex/__fixtures__/foundation.ts`

`createMockCtx` (lines 10-137) — comprehensive mock with `query` chain (`order`/`withIndex`/`filter`/`collect`/`unique`). Limitations:
- `withIndex` only supports `eq` and a single `order` direction (no `gte`/`lt`).
- `get` walks all tables to find a doc by `_id` (line 102) — fine for mocks.

**`sampleAgents` is duplicated** in `convex/agents.ts:137-186` and `convex/agentTemplates.ts:203-244` and `convex/__fixtures__/foundation.ts:192-240` — three sources of truth for "the canonical set of demo agents". Drift risk.
- **Severity: Low.**

### `convex/__fixtures__/history.ts`, `convex/seed.ts`, `convex/migrate.ts`

- `seed.ts` exports `seedDemoData` mutation that returns `null` without doing anything (line 125-131). Stub.
- `migrate.ts:70-76` `migrateSimplifiedSchema` mutation returns `null` without doing anything. Stub.
- `migrate.ts:39-49` `migrateProject` — pure function, takes a string status, returns it only if it matches one of 3 literals, else defaults to 'active'. The status parameter is typed `string`, not the union from the project validator. Loses type safety.
- `migrate.ts:57-68` `migrateTask` — takes `_newProjectId: string` (prefixed `_` because unused) but the function **ignores it** and uses `old.projectSlug` (line 64: `projectId: old.projectSlug` — wrong type! `projectId` is `v.id('projects')` per schema/tasks.ts:7, but the legacy migration passes a slug string). This is a **silent type bug** — the migration result wouldn't validate against the schema.

- **Severity: Medium** for `migrate.ts:migrateTask` (wrong field assignment), and **High** for the stub mutations (`seedDemoData`, `migrateSimplifiedSchema`).

---

## 4. Cross-cutting patterns in this slice

1. **`ctx.db.query('table').filter((q) => q.eq(q.field('_id'), id as any)).first()` instead of `ctx.db.get(id)`** — appears 5× in `convex/employees.ts` alone, plus a few scattered. The id is typed as `v.string()` and cast `as any` to satisfy `_id`. Per guideline §Query: "Do NOT use `filter` in queries" and §Typescript: "take in `Id<'table'>` rather than `string`".

2. **`.collect()` for counting or as a "give me everything" idiom** — appears in `convex/analytics.ts` (4×), `convex/fleetCatalog.ts:33-42` (8× in one query, documented as TD-029), `convex/notifications.ts` (3×), `convex/insights.ts` (3×), `convex/performance.ts:285`, `convex/history/agents.ts:42`. Per guideline: "you should ALWAYS return a bounded collection" and "Never use `.collect().length` to count rows."

3. **Serial `await` inside loops (true N+1)** — `convex/taskTimeline.ts:125-130`, `convex/notifications.ts:237-239` (mark all read), `convex/notifications.ts:256-261` (delete old), `convex/costs.ts:backfillCostRecords:363-395`. Most can be parallelised with `Promise.all` or batched with `ctx.scheduler.runAfter(0, ...)`.

4. **Hard-coded `as any` casts everywhere** — pervasive in kanban.ts, taskTimeline.ts, fleetCatalog.ts, fleet.ts. Indicates either the data model doesn't match what handlers expect, or `_creationTime` stripping is being done at the wrong layer. The `convex/lib/types.ts` consolidation (the `type_deduplication_20260524` track) only landed for one type — there are 8+ duplicate `*Doc` interfaces in `lib/retrospective.ts` and `lib/analytics.ts`.

5. **Stub mutations that return `null` without doing anything** — `convex/scoreAudit.ts:createScoreAudit` (returns args without inserting — **the most worrying**), `convex/dispatchPolicyStats.ts:upsertDispatchPolicyStats`, `convex/migrate.ts:migrateSimplifiedSchema`, `convex/seed.ts:seedDemoData`. These are publicly callable and silently succeed.

6. **Anonymous-bootstrap auth** — `lib/auth.ts:resolveActor` falls back to `{ subject: 'anonymous-bootstrap', isAuthenticated: false }`. Combined with missing `convex/auth.config.ts`, **every public mutation in the slice is anonymously callable in any environment**. This is the slice's single biggest cross-cutting risk.

7. **`scope`-prefixed `args.id: v.string()`** — pattern repeated across employees.ts, budgets.ts, fleetCatalog.ts, scoreAudit.ts. Per the Convex schema guidelines and typescript guidelines, these should be `v.id(tableName)`.

8. **No internal/auth distinction** — every public `mutation`/`query` is registered via the public `mutation`/`query` decorators. Per guideline §Function registration: "Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions." The `costs.recordCost` mutation is called by pivot via `convexClient` — it should arguably be `internalMutation` if only called from other Convex functions, or it should require a non-bootstrap auth check.

---

## 5. Top-10 improvement queue

| # | Node | Severity | Effort | Why |
|---|------|----------|--------|-----|
| 1 | `convex/scoreAudit.ts:createScoreAudit` | Critical | XS | Mutation returns args without `ctx.db.insert` — silent no-op with a 200 response. Either implement or remove. |
| 2 | `convex/lib/auth.ts:resolveActor` (combined with missing `auth.config.ts`) | Critical | S | Anonymous-bootstrap fallback + no auth config = every public mutation is anonymously callable. Create `convex/auth.config.ts`; either remove bootstrap or guard it behind `process.env.NODE_ENV`. |
| 3 | `convex/analytics.ts:getCompletionTrends/getBottlenecks/getQueueDepth/getSessionMetrics` | High | M | All do `ctx.db.query('tasks').collect()` then filter in-memory. Add `by_updated_at` index, switch to `.withIndex('by_updated_at', ...).take(1000)`. |
| 4 | `convex/employees.ts` (5 handlers using `filter` for `_id` lookup) | High | S | Replace `.filter((q) => q.eq(q.field('_id'), args.id as any))` with `ctx.db.get(args.id)`. Change arg from `v.string()` to `v.id('employees')`. |
| 5 | `convex/portfolio.ts:getPortfolioHandler` | High | M | N+1 (per-project sprints + tasks queries). Use a single grouped query or denormalize last-sprint onto project. |
| 6 | `convex/kanban.ts:getSprintBoardHandler` | High | M | Per-task `runs` query for latest run. Denormalize `latestRunId`/`latestRunDurationMs` onto task. |
| 7 | `convex/taskTimeline.ts:getTaskTimelineHandler` | High | XS | Serial `await ctx.db.get(agentId)` in loop. Use `Promise.all`. |
| 8 | `convex/notifications.ts:markAllRead` + `deleteOldNotifications` | High | M | Per-row loop in one transaction. Use `ctx.scheduler.runAfter(0, internalNotifications.markReadBatch, ...)` per Convex guideline. |
| 9 | `convex/fleetCatalog.ts:getBootstrapSummary` | High | M | 8× `.collect()` for counts (TD-029). Use denormalized counters on `systemMetadata`. |
| 10 | `convex/costs.ts:backfillCostRecords` | High | M | Will exceed transaction limit on large projects. Use batched scheduler. |

---

## 6. Track ↔ Implementation diffs

- **`convex_test_remediation_20260520` / Phase 1 "Replace fake analytics tests with real pure-function tests"** — ✅ Implemented. `convex/lib/analytics.ts` is a pure-function module (no `ctx`, no `import 'convex/server'`), and `convex/lib/analytics.test.ts` (21KB) tests the real functions with synthetic inputs. The functions in `lib/retrospective.ts` are also pure (they import only `OrchestratorErrorDoc` from `./types` — a type-only import). `lib/insights.ts`, `lib/performance.ts`, `lib/budget.ts`, `lib/cost.ts` are all pure-function modules. **The remediation landed cleanly.**

- **`schema_modularization_20260524` / Phase 2-6** — ✅ Implemented. `convex/schema.ts` is 17 lines, spreads from 7 module files. Phase 7 verification: "dataModel.d.ts: zero diff" against baseline. **Modularization landed cleanly.**

- **`convex_test_remediation_20260520` / Phase 2 "Fix `seedAgentsHandler` — insert missing defaults by name instead of returning all existing"** — ✅ Implemented in `convex/agents.ts:188-205` (uses `existingNames` Set to filter defaults). 

- **`schema_modularization_20260524` / Phase 6 (analytics/contracts extraction)** — ✅ Done, but `convex/budgets.ts:25-36` still has its own `governanceEventEntry` validator that should reuse the one in `schema/analytics.ts`. Tracked here for a follow-up.

- **`fleet_command_center_20260510` / Phase 1 (Fleet Status dashboard)** — ⚠️ Partial. `getFleetStatus` is implemented correctly, but `getBlockedTasksAcrossProjects`, `getActiveSprintForProject`, `getTasksForSprint`, `getAgentWorkload` are stubs returning `null`/`[]` or hard-coded zeros. The fleet dashboard will render but most of its data will be missing.

- **`notification_system_20260502` / delivery channels** — ⚠️ `deliverWebhook` action exists with `v.any()` payload (security-smell + type-smell). No tests for it. No retry logic visible in this file.

- **`virtual_software_house_mvp_20260516` / Phase 1 schema simplification** — Spec said "migrateSimplifiedSchema" mutation. Implemented as a stub returning null (`convex/migrate.ts:70-76`). The pure-function helpers `migrateProject` and `migrateTask` exist but the latter has a **silent type bug** (passes `old.projectSlug` into `projectId` field, but schema requires `v.id('projects')`). Track not done.

---

## 7. Notes for synthesis pass

- The slice's pure-function libs (`lib/analytics.ts`, `lib/retrospective.ts`, `lib/insights.ts`, `lib/performance.ts`, `lib/budget.ts`, `lib/cost.ts`, `lib/costMetrics.ts`, `lib/notifications.ts`) are **exemplary** for testability — they import nothing from Convex, take typed inputs, return typed outputs. The handlers in `convex/*.ts` (the function side) compose these libs but consistently add `.collect().then(filter)` overhead before invoking them. The fix is structural (indexes + bounded collections) not algorithmic.

- The `convex_test_remediation_20260520` track's promise of "real pure-function tests" is honored in the libs but NOT in the handlers — the slice's test files (`convex/*.test.ts`) are heavy and many rely on the in-house `createMockCtx` mock. There is no `convex-test` usage (per guideline §Testing guidelines: "Use `convex-test` with `vitest` and `@edge-runtime/vm`"). The mock-driven approach means real Convex semantics (transaction limits, index ordering, scheduler batching) are not exercised.

- Schema modularization was done well, but **type consolidation** (the companion `type_deduplication_20260524` track) only landed for `OrchestratorErrorDoc`. `lib/retrospective.ts` still has 5+ duplicated `*Doc` interfaces, and `lib/insights.ts` uses `any[]` parameters instead of typed `Doc`-imported shapes.

- The auth model has a clear pattern: `resolveActor` is the gate, called in most handlers but **not all** (e.g., `agents.ts:createAgentHandler`, `agents.ts:updateAgentHandler`, `fleetCatalog.ts:listHarnesses`, `sprints.ts:listSprintsHandler`, `fleet.ts:getFleetStatus` — wait, that one does call it). About half the handlers skip it. This is uneven enforcement and combined with anonymous-bootstrap means there's no real auth boundary.

- Recommended file for a follow-up audit deep-dive: `convex/costs.ts` — heaviest mutation logic (5 sequential awaits in `recordCost`), largest cost-per-record schema, multiple stub functions elsewhere (`scoreAudit.ts`, `dispatchPolicyStats.ts`) suggest this is the slice's "feature surface that was never finished" zone.

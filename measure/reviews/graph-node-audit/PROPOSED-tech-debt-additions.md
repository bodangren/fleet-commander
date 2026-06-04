# Proposed Tech-Debt Additions (from Graph Node Audit, 2026-06-02)

> These are proposed for review before being merged into `measure/tech-debt.md`. Each row links back to a finding in `MASTER-REPORT.md` and uses the existing `| ID | Description | Severity |` table format.

| ID | Description | Severity | Linked master-report finding |
| --- | --- | --- | --- |
| TD-200 | `convex/scoreAudit.ts:createScoreAudit` returns args without `ctx.db.insert`; caller in `orchestrator.ts:307` gets a 200 with no row written | Critical | §6 row 1, §7 (`environment_management_20260330`) |
| TD-201 | `convex/auth.config.ts` is missing; `lib/auth.ts:resolveActor` falls back to `anonymous-bootstrap` — every public mutation is anonymously callable in any environment | Critical | §6 row 2, §7 (auth_authorization_20260502) |
| TD-202 | `pivot/src/reconciliation/sweep.ts:loadCanonicalState` / `saveCanonicalState` are no-op stubs — every track is flagged `divergenceType: 'added'` | Critical | §6 row 3, §7 (state_reconciliation_engine_20260415) |
| TD-203 | `pivot/src/reconciliation/hash.ts:computeMarkdownHash` uses 32-bit djb2 (`Math.abs(hash).toString(16)`); birthday-collision territory on >100k documents | Critical | §6 row 4 |
| TD-204 | `pivot/src/convexClient.ts` and `pivot/src/typedConvexClient.ts` are parallel implementations; `server.ts` uses the untyped one | Critical | §6 row 5 |
| TD-205 | `pivot/src/planning/recommender.ts` (slice 3) imports from `../pipeline/agentTypes` and `../pipeline/costTracker` (slice 2); boundary leak | Critical | §6 row 6 |
| TD-206 | `pivot/src/orchestrator/orchestrator.ts::runProject` is 985 lines with ~10 duplicated WAL-wraps, 5+ exit paths, inconsistent timing-field population | Critical | §6 row 7 |
| TD-207 | `pivot/src/orchestrator/autoRunner.ts::runAutoRunner` racy closure — `getInterval` returns the default before the async read resolves, and there's no error handling for the .then chain | Critical | §6 row 8 |
| TD-208 | `pivot/src/orchestrator/sdkClient.ts::sendPromptToSession` claims "no race condition" in commit subject but the flag-based timeout has a small residual race window (timer fires after clearTimeout) | Critical | §6 row 9 |
| TD-209 | ~1,000 LOC of dead code in pivot: `recoveryDispatcher.ts`, `continuousMode.ts`, `continuousOrchestrator.ts`, `autoPauseHandler.ts`, `concurrencyLimiter.ts`, `taskQueue.ts`, `circuitBreaker.ts`, `stalledDetector.ts` — each exported + tested, none imported in production | Critical | §6 row 10 |
| TD-210 | `pivot/src/orchestrator/scheduler.ts` is a parallel task-execution pipeline to `runProject` (CLI path vs SDK path, different retry policy, different schema) | Critical | §6 row 11 |
| TD-211 | `pivot/src/policy/rollup.ts:computeDispatchPolicyStats` computes `p50Cost` from `architectConfidence` (0-1) — author flagged via TD-043 but did not finish the fix; end-to-end semantic bug | Critical | §6 row 12 |
| TD-212 | `pivot/src/policy/weeklyReport.ts` ends with `await main();` at module scope; the test file duplicates 47 lines of helpers as a result | Critical | §6 row 13 |
| TD-213 | `pivot/src/policy/allocator.ts::{WorktreeManager,DispatchPacer}` exported, tested, never instantiated; `WorktreeManager.reclaimStale` has no caller | Critical | §6 row 14 |
| TD-214 | `pivot/src/policy/economic.ts:applyBudgetPenalty` is dead in production; special-cases only `strict` policy; `taskExpectedCost / 1000` is a magic-number unit conversion | Critical | §6 row 15 |
| TD-215 | `frontend/src/components/MarkdownViewer.tsx` and `MarkdownEditor.tsx` share byte-identical `parseInlineTokens` (60 LOC), `InlineToken` (5 LOC), and near-identical `renderPreviewBlock` (118 LOC) | Critical | §6 row 16 |
| TD-216 | `frontend/src/pages/SettingsPage.tsx` is 404 lines with 3 direct `fetch` calls, 8 `useState`, and a dual-source-of-truth race between Convex preferences and local `prefState` | Critical | §6 row 17 |
| TD-217 | `frontend/src/lib/useConvexData.ts` is 1,137 LOC / 55 nodes — single file with 40+ typed hooks; copy-pasted JSDoc on 30+ of them | Critical | §6 row 18 |
| TD-218 | `frontend/src/lib/useConvexRealtime.ts` is 399 LOC / 45 nodes — 38 one-line `useRealtime` wrappers in a single file | Critical | §6 row 19 |
| TD-219 | `pivot/src/routes/git.ts:15` references `api.projects.getProjectByNameHandler`; not exported by `routes/projects.ts` — likely 500 on every `/api/git/*` endpoint | High | §6 row 20 |
| TD-220 | 21 of 27 `pivot/src/routes/*.ts` files have no sibling test (orchestrator, abTests, fleet, logs, notifications, retrospectives, simulation, coverage, performance, dashboard, taskTimeline, stats, pipelines, kanban, agents, projects, git, harnesses, issues, sprints, settings, dependencies, costs, analytics, analysis, environments, pr, sprintPlanning, agentTemplates) | High | §6 row 21 |
| TD-221 | `frontend/src/components/legacy/KanbanBoard.tsx` (469 lines) is a complete parallel kanban; only `ProjectViewPage` uses it | High | §6 row 22 |
| TD-222 | `frontend/src/lib/useConvexData.ts:useSprintHistoryQuery` returns `startDate: item.createdAt` and `endDate: item.createdAt` (both aliased) — every sprint date range shows start === end | High | §6 row 23 |
| TD-223 | `convex/analytics.ts:getCompletionTrends/getBottlenecks/getQueueDepth/getSessionMetrics` all do `ctx.db.query('tasks').collect()` then filter in memory by `updatedAt` | High | §6 row 24 |
| TD-224 | `convex/employees.ts:5 handlers` use `.filter((q) => q.eq(q.field('_id'), args.id as any)).first()` instead of `ctx.db.get(args.id)`; arg is `v.string()` not `v.id('employees')` | High | §6 row 25 |
| TD-225 | `frontend/src/lib/format*` utilities exist but are not trusted; `formatCost` (4 copies), `formatTimestamp` (5+ copies), `formatDuration` (3+ copies), `parsePayload` (3+ copies) | Medium | §3 pattern 2, slice 4 |
| TD-226 | Three sources of `isConvexAvailable` / `hasConvexUrl` / `convexUrl` truthy check — module-level env reads; test mocking holes | Medium | §3 pattern 10, slice 5 |
| TD-227 | `MockSprint.budget` is nested `{actual, estimated}` but `DashboardSprint.budget` is `number` — fixture→production schema drift | Medium | §3 pattern 2, slice 5 |
| TD-228 | `convex/lib/cost.ts:MODEL_RATES` (11 entries) and `convex/lib/validators.ts:supportedModels` (6 entries) are disjoint; `computeCost` falls through to `DEFAULT_RATE` for any model in `supportedModels` | Medium | slice 6 §3 |
| TD-229 | `convex/lib/budget.ts:isBudgetBreached` drops the `soft` policy case; `advisory → >`; implicit `soft → >=` (collapses with the default) | Medium | slice 6 §3 |
| TD-230 | `pivot/src/orchestrator/orchestrator.ts::updateTaskStatus` does a hidden `as 'backlog' | 'ready' | 'in_progress' | ...` cast that widens the input type | Medium | slice 1 |
| TD-231 | `pivot/src/orchestrator/hookRunner.ts::runHook` and `pivot/src/orchestrator/executor.ts::executeCommand` are duplicate shell-runner patterns; `executeCommand` has 1 production caller (`scheduler.ts::executeTaskWithEmployee`) | Medium | slice 1 |
| TD-232 | `pivot/src/recommenderClient.ts:24,37,52,67,82` return `Record<string, unknown>` despite Convex having generated types | Medium | slice 3 |
| TD-233 | `convex/notifications.ts:markAllRead` and `deleteOldNotifications` use per-row `ctx.db.patch` / `ctx.db.delete` in a serial loop — will fail the 16K-doc transaction limit at scale | High | slice 6 |
| TD-234 | `convex/fleetCatalog.ts:getBootstrapSummary` does 8× `ctx.db.query(...).collect()` for counts (TD-029 known); should use denormalized counters on `systemMetadata` | High | slice 6 |
| TD-235 | `convex/portfolio.ts:getPortfolioHandler` is an N+1 (per-project sprints + tasks queries) — 100+ queries for 50 projects | High | slice 6 |
| TD-236 | `convex/kanban.ts:getSprintBoardHandler` does 1 indexed query per task to find the latest run; 30 queries for a 30-task sprint | High | slice 6 |
| TD-237 | `convex/taskTimeline.ts:getTaskTimelineHandler` does serial `await ctx.db.get(agentId)` in a loop; should be `Promise.all` | High | slice 6 |
| TD-238 | `convex/migrate.ts:migrateTask` writes `projectId: old.projectSlug` — schema requires `v.id('projects')`; silent type bug | High | slice 6 |
| TD-239 | `pivot/src/pipeline/runner.ts:BunStepExecutor` ignores the parent `AbortSignal` — external aborts never reach the child process | High | slice 2 |
| TD-240 | `frontend/src/pages/AgentTemplatesPage.tsx` (4 fetches) and `AgentTemplateEditorPage.tsx` (3 fetches) bypass the `useConvexData` hook layer entirely | High | slice 4 |
| TD-241 | `frontend/src/pages/ProvidersPage.tsx` and `SettingsPage.tsx` independently fetch `/api/agents` and `/api/harnesses` with different error handling — parallel fetches will drift | High | slice 4 |
| TD-242 | `convex/lib/insights.ts:{computeSprintMetrics, computeCostTrend, computeAgentEfficiency, computeROISummary}` use `any[]` parameters instead of typed `SprintDoc[]` / `AgentDoc[]` / `CostRecord[]` | Medium | slice 6 |
| TD-243 | `convex/lib/retrospective.ts` has 6 interfaces with empty `summary: ""` in the graph (extractor missed JSDoc); `type_deduplication_20260524` only landed for `OrchestratorErrorDoc` | Medium | slice 6 |
| TD-244 | `pivot/src/orchestrator/scheduler.ts` reintroduces the CLI invocation (`executeCommand('opencode', ...)`) that `agent_scheduling_execution_20260313` deprecated | High | slice 1 |
| TD-245 | `convex/scoreAudit.ts:createScoreAudit` returns the constructed object without `ctx.db.insert('scoreAudit', args)` (line 33-44) — known stub from `environment_management_20260330` Phase 1, never finished | Critical | slice 6 (also TD-200) |

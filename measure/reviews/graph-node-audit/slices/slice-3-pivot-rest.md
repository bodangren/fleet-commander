# Graph Node Audit — pivot/routes + server + reconciliation + performance + git + failover + everything-else-pivot

**Slice:** `slice-3-pivot-rest`
**Files reviewed:** 130
**Nodes reviewed:** 457
**Findings:** Critical: 5 · High: 8 · Medium: 7 · Low: 4
**Date:** 2026-06-02

## 1. Slice Overview

This slice contains pivot's HTTP surface (145 routes, 27 route files), request dispatch (`server.ts` + `routes/router.ts`), the reconciliation engine, the performance analytics stack, git/failover/pr/harness/environment/retrospective/sync subsystems, the Convex client layer, and the worker + types. Originating tracks span the entire project history — `go_decommission_final_20260402`, `platform_pivot_bun_convex_20260401`, `continuous_orchestration_20260502`, `state_reconciliation_engine_20260415`, `employee_performance_analytics_20260517`, and many more. The dominant health signals: the routes layer is the largest unsubscribed surface in pivot (6 of 27 route files have tests); the reconciliation engine has placeholder stubs in its core sweep; the Convex client layer has two parallel implementations that have drifted; and several subsystems import across slice boundaries into `orchestrator/` and `policy/`. The shape is "feature-complete but test-starved and refactor-divergent."

## 2. Per-subsystem findings

### 2.1 pivot/routes/ (145 route nodes)
**Originating tracks:** `go_decommission_final_20260402` (majority), `continuous_orchestration_20260502`, `environment_management_20260330`, `fleet_command_center_20260510`, `employee_performance_analytics_20260517`, `agent_ab_testing_framework_20260527`, `custom_agent_templates_20260527`, `dispatch_scoring_v2_20260501`, `sprint_planning_20260517`, `pipeline_engine_20260517`, `e2e_task_timeline_20260424`, `schema_modularization_20260524`, `cost_tracking_20260502`, `dashboard_20260517`, `notification_system_20260502`, `test_coverage_dashboard_bun_convex_20260411`, `performance_profiling_20260502`, `frontend_project_kanban_board_20260325`, `frontend_global_dashboard_onboarding_20260325`, `policy_simulation_replay_20260415`, `bun_orchestrator_migration_20260402`, `fix_yaml_safe_schema_20260425`, `static_analysis_integration_20260330`, `dispatch_policy_stats_20260415`.

**Subsystem-level findings:**
- **[High] Test gap.** 27 route files / 145 routes; only 6 have sibling test files (orchestrator, abTests, fleet, logs, notifications, retrospectives, simulation, coverage, performance, dashboard, taskTimeline, stats, pipelines, kanban, agents, projects, git, harnesses, issues, sprints, settings, dependencies, costs, analytics, analysis, environments, pr, sprintPlanning, agentTemplates — most are 0 test nodes). Coverage target is 80%; route layer is the worst offender. **Recommendation:** prioritise route tests for the high-fan-in handlers — `projects`, `git`, `agents`, `sprints`. Use the existing test patterns in `orchestrator.test.ts` as a template; they show the request-mock + Convex-client-mock idiom.
- **[High] JSDoc copy-paste error.** Every `register*Routes` JSDoc says `@param router - Express Router instance` (see `projects.ts:9`, `fleet.ts:7`, `git.ts:9`, `orchestrator.ts:8`, `simulation.ts:25`). This is a Bun `Router`, not Express. **Recommendation:** global regex replace of the docstrings.
- **[High] Body validation by hand-rolled casts.** All mutating routes parse JSON and cast: `routes/projects.ts:51-55`, `routes/agents.ts:53-65`, `routes/git.ts:42-44`, `routes/abTests.ts:38-58`. No zod schema. Field names silently drift if the Convex mutation signature changes. **Recommendation:** add a `routeBody(schema: z.ZodType)` helper to `router.ts`; migrate the high-traffic endpoints first.
- **[Medium] Duplicated scan logic in `projects.ts`.** `registerProjectRoutes` is 130 lines; lines 70-96 and 98-123 contain near-identical `readdir → stat measure/` scans. **Recommendation:** extract `scanMeasureWorkspaces(rootDir: string): Promise<string[]>`.
- **[Medium] `registerGitRoutes` is 193 lines** with 7 routes. ~30 lines are repeated try/catch boilerplate. Same shape in `registerOrchestratorRoutes` (155 lines) and `registerSimulationRoutes` (161 lines). **Recommendation:** add a `route(handler, { schema? })` wrapper that handles try/catch + uniform 500 response.
- **[Medium] `registerAbTestRoutes` `computeSimilarity`** (`abTests.ts:5-16`) is a character-prefix match (500-char window), not a real similarity metric. `run` handler (lines 61-128) uses `Math.random()` for `controlCost`, `treatmentCost`, `controlDuration`, `treatmentDuration`, and `rejected`. **Recommendation:** if this is a stub, mark it `if (!options.real) { return mock… }` and have the real impl behind a feature flag; do not ship `Math.random()` cost data to Convex as production telemetry.
- **[Low] `(params.id as any)` casts** in `routes/git.ts:25, 31, 33, 68, 91, 92, 104, 109, 117, 136, 144, 156, 160, 169` and `fleet.ts:59`. The router already gives `params: Record<string, string>`; `as any` defeats the type system. **Recommendation:** pass the Convex `Id<>` type to a small helper.

### 2.2 pivot/server.ts + pivot/routes/router.ts
**Originating tracks:** `platform_pivot_bun_convex_20260401` (server), `go_decommission_final_20260402` (router).

**Subsystem-level findings:**
- **[Critical] `convexClient.ts` and `typedConvexClient.ts` are parallel duplicates.** Both files define `readEnvLocalValue`, `getConvexUrl`, `createConvexClient` independently (`convexClient.ts:10-60`, `typedConvexClient.ts:16-67`). The drift is visible: `typedConvexClient.ts` adds `typedQuery`/`typedMutation` helpers and re-exports `api`, but `convexClient.ts` (used by `server.ts:3,39` and most routes) does not. `retrospective/scheduler.ts:54-72` uses string queries with `'projects:listProjects' as any` instead of `typedConvexClient`'s typed helpers. **Recommendation:** delete `typedConvexClient.ts`'s `readEnvLocalValue`/`getConvexUrl`/`createConvexClient` and re-export from `convexClient.ts`; migrate `convexClient` to the typed version.
- **[Medium] `server.ts:128-134` uses `(realtimeClient as any).onUpdate(...)`.** Casts the public Convex API. **Recommendation:** import `ConvexClient` from `convex/browser` and type the call directly.
- **[Medium] `server.ts:242-245` log level routing is hard-coded** by URL substring (`url.pathname !== '/api/health' && url.pathname !== '/api/orchestrator/health'`). New health endpoints will spam logs unless added to the deny list. **Recommendation:** introduce a `LOG_SILENT_PREFIXES` set.
- **[Low] `Router` (`router.ts:20-23`)** uses regex-based path matching with manual `paramNames` extraction; nested patterns (e.g. `/api/projects/:slug/sprints/:sprintId/tasks`) work but no path normalisation. Functional but limits future middleware (auth, body parsing) integration.

### 2.3 pivot/reconciliation/ (engine, differs, hash, sweep, rules)
**Originating tracks:** `state_reconciliation_engine_20260415`, `reconciliation_event_logging_20260415`, `environment_management_20260330`.

**Subsystem-level findings:**
- **[Critical] `reconciliation/sweep.ts:29-43` `loadCanonicalState` and `saveCanonicalState` are documented as "placeholder implementation" and are empty no-ops.** The whole sweep builds an empty `CanonicalState` (lines 30-34), iterates `conductorTracks`, and never persists anything. The function returns divergences based on the empty `canonical` map, so any added track will *always* be flagged as `divergenceType: 'added'`. **Recommendation:** implement these against Convex (e.g. `reconciliationProposals.getCanonicalState`) or remove the function and gate the sweep behind a feature flag.
- **[Critical] `reconciliation/hash.ts:55-63` `computeMarkdownHash` uses 32-bit djb2-style hash.** `Math.abs(hash).toString(16)` is 8 hex chars max, ~4 billion possibilities. Real-world markdown bodies regularly produce birthday-collision territory at <100k documents. The function is the *foundation* of the divergence detector. **Recommendation:** swap to SHA-256 (`node:crypto`), truncate to 16 hex chars — keeps the same shape, removes collision risk.
- **[High] `reconciliation/sweep.ts:99-101` silently swallows `readdirSync` errors** with the comment `// Directory read failed, return empty`. Caller has no way to distinguish "no tracks" from "I/O error." **Recommendation:** at minimum, log the error; better, return `{ divergences, errors }`.
- **[High] `reconciliation/sweep.ts:115-119`** the `for (const [title, canonicalTrack] of canonical.tracks)` loop is empty — the deleted-track case is not implemented. **Recommendation:** push a `divergenceType: 'deleted'` divergence in this branch.
- **[Medium] `reconciliation/engine.ts:88-118` `shouldAutoApply` ignores its `proposal` argument** and just calls `shouldAutoApplyStrategy(strategy)`. The function name suggests it inspects the proposal. **Recommendation:** either drop the parameter or actually inspect `proposal.autoApply`.
- **[Medium] `reconciliation/reconciliationClient.ts:24, 37, 52, 67, 82`** all return `Record<string, unknown>` despite Convex having generated types. Same story as §2.2. **Recommendation:** switch to `FunctionReturnType<…>` via the typed client.
- **[Low] `reconciliation/rules.ts:34-37`** uses `yaml.DEFAULT_SCHEMA` — `js-yaml`'s unsafe loader. YAML parsing of untrusted input + unsafe schema is a classic RCE vector in Node. The file is from a track file the user controls, so risk is low, but worth noting.

### 2.4 pivot/performance/ (benchmark, regressions, statistics, synthetic)
**Originating tracks:** `employee_performance_analytics_20260517`, `dashboard_20260517`, `performance_profiling_20260502`.

**Subsystem-level findings:**
- **[Medium] `performance/benchmark.ts:26-67` `buildBaselineQuery` returns `Promise<any[]>`** and uses `any` for the run record. The same logic is hand-rolled here and in `computeBaselines.ts`. **Recommendation:** define `BaselineQueryDeps`/`RunRecord` interfaces and share.
- **[Medium] `performance/computeBaselines.ts:14`** re-filters `runs` with `withinWindow` after `queryRunsByWindow` was supposed to honour the window already (`benchmark.ts:140-141` filters too). Defensive but suggests the contract is unclear. **Recommendation:** make `queryRunsByWindow` guarantee the window and remove the inner filter.
- **[Medium] `performance/benchmark.test.ts` is empty (0 nodes) and `computeBaselines.test.ts` has 1 node.** This is a new feature (`employee_performance_analytics_20260517`) shipping without real test coverage despite the AGENTS.md coverage target of 80%. **Recommendation:** add tests for `evaluateRegression` first (smallest surface, biggest correctness sensitivity), then `detectRegressions`.
- **[Low] `performance/detectRegressions.ts:28` hard-codes `sampleCount < 5` threshold.** No environment override. **Recommendation:** read from a config in `computeBaselinesDeps`.

### 2.5 pivot/git/ (client, validation)
**Originating tracks:** `environment_management_20260330`, `dispatch_scoring_v2_20260501`.

**Subsystem-level findings:**
- **[High] `routes/git.ts:15` calls `api.projects.getProjectByNameHandler`** but `routes/projects.ts` only references `getProjectHandler` (lines 28, 44, 61, 132). This is a Convex API name mismatch. **Recommendation:** grep `convex/` for the actual function name; either rename one or wire the correct one. (If `getProjectByNameHandler` doesn't exist, the `/api/git/*` endpoints all 500.)
- **[Medium] `git/client.ts:190-211` `createPR` calls `gh` directly via `Bun.spawn` rather than using the `pr/factory.ts:62 createPRClient` pattern.** The route layer should use `pr/factory.ts` exclusively. **Recommendation:** route through `createPRClient('github', cwd)`.
- **[Medium] `git/client.ts:45-51` `branch(name, base)` accepts a `base` and inlines the git invocation** rather than using `git/validation.ts` `validateBranchName` (it exists, used by routes). The method is exported and could be called with user input that bypasses validation. **Recommendation:** call `validateBranchName(name)` inside `branch()`.
- **[Low] `git/client.ts:219-225` `slugify` truncates at 40 chars mid-word** which can collide for two tasks with similar titles.

### 2.6 pivot/failover/ (policyCache, wal)
**Originating tracks:** `continuous_orchestration_20260502`.

**Subsystem-level findings:**
- **[High] `failover/wal.ts:165-172` `replay()` silently catches errors** and increments a counter; nothing surfaces a partial-replay warning to the caller. Combined with `markCommitted` only being called on success (line 167), a single bad entry blocks subsequent entries from ever being marked. **Recommendation:** continue past errors, log each, and call `markCommitted` for entries that succeeded even if others failed.
- **[Medium] `failover/wal.ts:114-128` `getUncommittedEntries` re-reads `todayPath()`** on every call and rebuilds the committed-set from scratch. O(n²) for replay loops. **Recommendation:** cache the committed set per-process.
- **[Low] `failover/wal.ts:50-52` `generateId` uses `Math.random()`** — not crypto-safe. WAL IDs end up in Convex mutation IDs, so a collision could cause idempotency-key confusion. **Recommendation:** `crypto.randomUUID()`.
- **[Low] `policyCache.ts:1`** uses `const DEFAULT_STALENESS_MS = 15 * 60 * 1000` instead of the repo-wide `config/index.ts` settings. Configuration drift.

### 2.7 pivot/pr/ (factory, github, gitlab, types)
**Originating tracks:** `continuous_orchestration_20260502`.

**Subsystem-level findings:**
- **[Medium] `pr/factory.ts:62-71` `createPRClient` returns a `PRClient`** but the routes layer (`routes/git.ts:190-211` in `git/client.ts`) bypasses this entirely. Two parallel PR-creation paths exist. **Recommendation:** delete `GitClient.createPR` (or mark it `@deprecated`).
- **[Low] `pr/github.ts:9-27` `runGh` duplicates the spawn pattern** from `git/client.ts:22-43` and `worker/localWorker.ts:62-72`. Three copies of the same `Bun.spawn` → `text()` boilerplate. **Recommendation:** extract a shared `runCommand(cmd, cwd)` helper.

### 2.8 pivot/planning/ (recommender)
**Originating tracks:** `platform_pivot_bun_convex_20260401`.

**Subsystem-level findings:**
- **[Critical] `planning/recommender.ts:1-2` imports from `../pipeline/agentTypes.js` and `../pipeline/costTracker.js`.** `pivot/pipeline/` is part of slice-2 (`pivot-orchestrator-policy-pipeline`). This slice is supposed to be everything *except* pipeline. **Recommendation:** move the recommender into `pivot/pipeline/` or duplicate/inline the `Agent` and `Task` types it needs.
- **[Medium] `recommender.ts:94-186` `generateRecommendation` is 90+ lines** doing scoring, assignment, budget enforcement, and breakdown computation. The `maxPointsAtBudget` closure (line 181) is dead unless something calls it. **Recommendation:** extract `assignBestAgent(task, agents)` and `computeBreakdown(recs)`.
- **[Low] `recommender.ts:51` `sizePenalty = task.storyPoints > 8 ? -2 : 0`** — magic numbers, no constants exported.

### 2.9 pivot/harness/ (loader)
**Originating tracks:** `harness_capability_schema_20260415`.

**Subsystem-level findings:**
- **[High] `harness/loader.ts:39-41, 69-71` use `require('fs')` and `require('path')` inside functions** while the rest of the file uses ES `import` (line 1-2). Mixed module systems in one file are a code smell. **Recommendation:** hoist `import { readdirSync } from 'node:fs'; import { join } from 'node:path';` to the top.
- **[Medium] `harness/loader.ts:62-103` `watchers` is a module-level `Map`** with no concurrency guard. If `watchHarnesses` runs concurrently in tests it can leak watchers. **Recommendation:** wrap in a class.
- **[Medium] `harness/loader.ts:110-137` `profileToDbEntry` has 4 inline `(profile.x as any)`** casts (lines 111, 112, 118, 123) — the schema in `shared/harnessProfile.ts` is precise enough that these should be type-narrowed. **Recommendation:** type-assert via the exported `HarnessProfile` type.
- **[Low] `harness/loader.ts:30, 56, 91` `console.error` in production code** — no logger integration; the project has a `config/index.ts` `logging` field.

### 2.10 pivot/environment/ (types)
**Originating tracks:** `continuous_orchestration_20260502`.

**Subsystem-level findings:**
- **[Medium] `environment/types.ts:55-63` `loadEnvironments`** maps every environment with `??` defaults but never validates the schema. A malformed YAML file yields silent default-fills. **Recommendation:** add zod parse + surface parse errors.
- **[Medium] `environment/types.ts:73` `saveEnvironments` uses `yaml.dump`** with no schema validation, no path-traversal protection on `projectRoot`. **Recommendation:** `resolve()` and assert within `projectRoot`.
- **[Low] `environment/types.ts:101-103` `addDeployment` ID is `deploy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`** — 4 random chars is ~1.6M possibilities, vulnerable to birthday collisions on a busy day.

### 2.11 pivot/retrospective/ (scheduler)
**Originating tracks:** `continuous_orchestration_20260502`.

**Subsystem-level findings:**
- **[Medium] `retrospective/scheduler.ts:54-72` uses untyped string queries** (`'projects:listProjects' as any`, `'sprints:listSprints' as any`, `'retrospectives:listRetrospectives' as any`) when `typedConvexClient.ts` exists with typed helpers right next door. **Recommendation:** use `typedQuery(client, api.projects.listProjects, {})`.
- **[Medium] `retrospective/scheduler.ts:77-86` fires `executeRetrospectiveGeneration` with `.catch` that only logs.** A scheduled retrospective failure is silent and untracked. **Recommendation:** persist the failure to Convex (`api.retrospectiveFailures.recordFailure`) or at minimum a metrics counter.
- **[Low] `retrospective/scheduler.ts:15` `intervalMs = 7 * 24 * 60 * 60 * 1000`** — 1 week. No jitter. If multiple server instances start simultaneously they all hit Convex at the same instant. **Recommendation:** add a randomised offset at start.

### 2.12 pivot/sync/ (importTasksFromPlans + trackMarkdown)
**Originating tracks:** `fleet_command_center_20260510`, `platform_pivot_bun_convex_20260401`.

**Subsystem-level findings:**
- **[High] `sync/importTasksFromPlans.ts:6-8, 88-104` is a top-level `await` script** with hardcoded `TRACKS_DIR` default `resolve(import.meta.dir, '../../../measure/tracks')`. This file lives in `pivot/src/sync/` but is a one-shot CLI script, not a module. Running it from anywhere except `pivot/` will fail. **Recommendation:** move to `pivot/scripts/` or add a `bin:` entry that pins cwd.
- **[Medium] `sync/importTasksFromPlans.ts:16-50` `parseTasksFromPlan`** uses regex `^(\s*)-\s*\[([ ~x])\]\s*(.+)$` and explicitly skips nested tasks (`if (indent > 0) continue;` line 33). Track plans with sub-tasks will silently lose them. **Recommendation:** surface a warning for skipped lines.
- **[Low] `sync/trackMarkdown.ts:23-33` `normalizeStatus`** silently maps unknown values to `'new'`. Bad track data → silent default.

### 2.13 Convex client layer (convexClient.ts, convexRetry.ts, typedConvexClient.ts)
**Originating tracks:** `platform_pivot_bun_convex_20260401`, `continuous_orchestration_20260502`, `fix_open_tech_debt_20260404`.

**Subsystem-level findings:**
- **[Critical] `convexClient.ts` and `typedConvexClient.ts` duplicate the URL/`.env.local` parser.** See §2.2 — this is the most damaging drift point in the slice. Two different consumers (`server.ts` uses `convexClient`, `convexRetry.ts` uses `ConvexHttpClient` directly) plus the unused typed variant. **Recommendation:** consolidate.
- **[Medium] `convexRetry.ts:29-40` `isRetryable` does string matching** on error message substrings. Fragile — any minor change to Convex SDK error text breaks the retry logic. **Recommendation:** branch on `err.name` / a typed `RetryableError` interface.
- **[Medium] `convexRetry.test.ts` is empty (0 nodes).** The file exists; the tests don't. **Recommendation:** at minimum, add the obvious cases — `maxRetries=0`, `isRetryable=true`, `isRetryable=false`.

### 2.14 Worker + types + fixtures (worker/localWorker.ts, types.ts, types/agentTemplates.ts, __fixtures__/)
**Originating tracks:** `platform_pivot_bun_convex_20260401`, `custom_agent_templates_20260527`, `virtual_software_house_mvp_20260516`, `employee_performance_analytics_20260517`.

**Subsystem-level findings:**
- **[Medium] `worker/localWorker.ts:34-44` `appendExecutionLog` creates a fresh `ConvexHttpClient` per call.** Every log line → new HTTPS connection, no pooling. For a busy run this is N round-trips where 1 would do. **Recommendation:** accept an injected `client` like `getEmployeePerformance.ts` does.
- **[Medium] `__fixtures__/convex-mock.ts:88-89` module-level counters `_taskCounter` and `_employeeCounter`** cause cross-test pollution. Vitest in parallel will race. **Recommendation:** reset in `beforeEach` or use UUIDs.
- **[Low] `types/agentTemplates.ts` (1 node)** — single export, sparse; not enough to evaluate. **Low priority — but verify it is actually consumed by `routes/agentTemplates.ts`.**
- **[Low] `types.ts:1-27` exposes DTOs as plain types** without runtime validation; the routes that accept them (`fleet.ts:38-53`) use `as any` casts on string query params for the `severity` enum. **Recommendation:** make `ProjectDto`/`TrackSnapshotDto` use zod and share with frontend.

## 3. Cross-cutting patterns

- **Test gap is structural, not incidental.** 21 of 27 route files have no sibling test; the empty `convexRetry.test.ts` and the 1-node `computeBaselines.test.ts`/`detectRegressions.test.ts` show that "exists in inventory" is not "tested." Pattern: red-phase TDD files were committed but the green-phase tests were never written.
- **Body validation by hand-rolled casts across the entire route layer.** Every mutating endpoint does `(await request.json()) as Record<string, unknown>` + field-by-field `(body.foo as string)` casts. There is no shared zod schema for route bodies. This will silently break when Convex mutation signatures change.
- **Duplicated module surface (`convexClient.ts` vs `typedConvexClient.ts`, `pr/github.ts` vs `git/client.ts createPR`, three copies of `Bun.spawn → text()`).** The drift is visible: `typedConvexClient` is unused by `server.ts`.
- **Boundary leaks into foreign slices.** `routes/simulation.ts` imports from `../orchestrator/*` and `../policy/*`; `planning/recommender.ts` imports from `../pipeline/*`; `retrospective/scheduler.ts` reaches into `../routes/retrospectives`. This slice is supposed to be the "everything else" of pivot, but several of its modules are physically co-dependent on slice-2.
- **No-op / placeholder implementations in production code paths.** `reconciliation/sweep.ts` has two empty stubs labelled "placeholder implementation" in JSDoc; `routes/abTests.ts` `run` ships `Math.random()` cost data; `git/client.ts createPR` is duplicated but also unused in favour of `pr/factory.ts`. These are landmines for anyone reading the surface and trusting it.
- **Silent error swallowing** in WAL replay (`failover/wal.ts:165-172`), sweep (`reconciliation/sweep.ts:99-101`), and retrospectives scheduler (`retrospective/scheduler.ts:81-86`). The pattern is "catch → increment counter → log." No retry, no escalation, no caller-visible error.

## 4. Top-10 improvement queue

| # | Node | Severity | Effort | Why |
|---|------|----------|--------|-----|
| 1 | `pivot/src/reconciliation/sweep.ts` `loadCanonicalState` / `saveCanonicalState` (no-op stubs) | Critical | M | Whole sweep is broken — every track will be flagged `added`. |
| 2 | `pivot/src/reconciliation/hash.ts` `computeMarkdownHash` (32-bit djb2) | Critical | XS | Collision risk on the foundation of reconciliation. Swap to SHA-256. |
| 3 | `pivot/src/convexClient.ts` ↔ `pivot/src/typedConvexClient.ts` duplication | Critical | S | Two implementations have drifted; `server.ts` uses the untyped one. |
| 4 | `pivot/src/planning/recommender.ts` imports from `../pipeline/*` (slice-2 boundary leak) | Critical | S | Relocate the file or localise the type dependencies. |
| 5 | `pivot/src/routes/git.ts:15` references `getProjectByNameHandler` not exported by `routes/projects.ts` | High | XS | Likely a 500 on every `/api/git/*` endpoint. Verify and fix. |
| 6 | `pivot/src/routes/abTests.ts` `run` (lines 61-128) | High | S | `Math.random()` for cost/duration/rejection is not acceptable for a "running" experiment; mark as a stub. |
| 7 | 21 of 27 `pivot/src/routes/*.ts` files lack sibling tests | High | L | Largest test gap in pivot. Prioritise `projects`, `git`, `agents`, `sprints`. |
| 8 | `pivot/src/failover/wal.ts` `replay` error handling (lines 165-172) | High | S | Silent error swallow blocks subsequent `markCommitted`. |
| 9 | `pivot/src/harness/loader.ts` mixed `require`/`import` (lines 39-41, 69-71) | High | XS | Hoist `import` to the top of the file. |
| 10 | `pivot/src/sync/importTasksFromPlans.ts` top-level `await` script with hardcoded path | High | S | Move to `pivot/scripts/` or pin cwd via a `bin:` entry. |

## 5. Track ↔ Implementation diffs

- **`state_reconciliation_engine_20260415` → `pivot/src/reconciliation/sweep.ts`:** The track delivered a state reconciliation engine with persistable canonical state, but `loadCanonicalState`/`saveCanonicalState` ship as no-op stubs. The "what spec said" was a working sweep; "what code does" is a function that always reports `added` divergences. Impact: the `/api/reconciliation/*` routes are not safe to wire into orchestrator decisions.
- **`platform_pivot_bun_convex_20260401` → `convexClient.ts` vs `typedConvexClient.ts`:** The bun+convex baseline established *one* Convex client. The codebase ended up with two. `typedConvexClient.ts` was added by `fix_open_tech_debt_20260404` but is unused by the server.
- **`environment_management_20260330` → `routes/git.ts` + `git/client.ts`:** Spec was git automation. `git/client.ts` `createPR` (lines 190-211) and `pr/factory.ts` `createPRClient` both exist; the git client is reachable but the routes layer should use the factory.
- **`employee_performance_analytics_20260517` → `performance/*.test.ts`:** Track shipped red-phase tests in commit `12038b7e0d` and `c45942a377`; sibling green-phase coverage is 1-2 nodes per file. Below the 80% target.
- **`continuous_orchestration_20260502` → `retrospective/scheduler.ts`:** Spec called for a self-healing weekly retrospective job. The implementation fires `executeRetrospectiveGeneration` with `.catch → console.error`; failures are not persisted.
- **`continuous_orchestration_20260502` → `failover/wal.ts`:** WAL replay spec called for at-least-once delivery. The implementation increments a counter on error but doesn't surface a `partial_replay` state to the caller or to Convex.

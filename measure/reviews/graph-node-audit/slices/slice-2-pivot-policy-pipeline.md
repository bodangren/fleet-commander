# Graph Node Audit — pivot/policy + pivot/pipeline + scoring

**Slice:** `slice-2-pivot-policy-pipeline`
**Files reviewed:** 44
**Nodes reviewed:** 198
**Findings:** Critical: 4 · High: 7 · Medium: 6 · Low: 3
**Date:** 2026-06-02

---

## 1. Slice Overview

This slice covers the **scoring engine**, **dispatch policy**, **rollups**, **economic control plane**, **resource allocation**, and **two parallel pipeline subsystems** (a 5-stage agent pipeline and a legacy YAML/CLI pipeline). The cluster is dense, well-tested at the per-function level, and structurally clear, but it carries a long tail of "wiring drift": exports from the economic and resource-allocation tracks are reachable only from their own test files, and the legacy `weeklyReport.ts` has a top-level `await main()` that forced the test file to copy-paste the same helpers. Two semantic inconsistencies cut across the slice: (a) `p50Cost` in the rollup is computed from `architectConfidence` (0–1) rather than a real cost figure, and (b) economic-budget modulators special-case only the `strict` policy, leaving `soft` and `advisory` with the same path despite the union type advertising otherwise.

---

## 2. Per-file findings

### `pivot/src/policy/scoring.ts`

**Originating track:** `adaptive_scoring_engine_20260415` — phase 1–2 (per-component scoring + composition) — commit `da8f06ce74`
**Phase contract (1 line):** "Implement 9 scoring components + `scoreCandidate` composition with insufficient-data fallback."

#### Node: `priorityWeight` (function, lines 11-39)
- **Severity:** Medium
- **Construction:** Mixed signal sources. Reads `task.tags?.priority` (typed `Record<string,string>` in `orchestrator/types.ts:30` — fine), then falls back to substring matching `task.title.includes('priority:high')`. The "legacy" string check is a code smell; if a future refactor removes the legacy path the test at `scoring.test.ts:39-42` will still pass but the intent is undocumented. Tags-based is fine; the substring fallback should be marked as deprecated.
- **Interaction:** 2 callers (internal use only). Callers: 1 (test). No issues.
- **Recommendation:** Either drop the legacy substring path or extract it to a clearly-labelled `legacyParsePriorityHint` and add a TODO for retirement.

#### Node: `personaFitness` / `expectedCost` / `regressionRisk` (functions, lines 65-78, 105-118, 145-158)
- **Severity:** High
- **Construction:** Three lookups in scoring.ts do `policyStats.find((s) => s.persona === persona && s.taskKind === taskKind && s.repoType === repoType)`. The `persona` parameter is typed as `string` (not `AgentRole` or the union from `agentTypes.ts`). Caller must rely on convention.
- **Interaction:** `selectBestCandidate` passes `persona ?? 'executor'`, but `scoreCandidate` is exported and any external caller could pass `''` or `'anything'` and silently get 0.5. The bucket key has no compile-time check.
- **Recommendation:** Tighten the type to `'architect' | 'executor' | 'reviewer' | 'recovery'` (matching `derivePersona`'s return). Add a unit test for the "persona not in stats" fallback.

#### Node: `scoreCandidate` (function, lines 244-281)
- **Severity:** Medium
- **Construction:** Composition is clean, weights merged via spread, breakdown dict keyed by component name. Good. Two minor issues: (1) the dynamic lookup `weights[key as keyof ScoreWeights]` after `Object.entries(breakdown)` does not enforce that the breakdown key is in `ScoreWeights` — a future component added to breakdown without a default weight would silently become weight 0 instead of throwing; (2) `taskKind = deriveTaskKind(task.taskKey)` uses the taskKey string (e.g. `fix-bug-x`) as ground truth for the bucket, but the same task would be classified differently in `rollup.ts:deriveTaskKind` using the *full taskId*. For a real Convex taskId like `convex:tasks/abc123`, `deriveTaskKind` in scoring would likely default to `'feature'` even if the task is a bug — but `deriveTaskKind` in rollup, called from the same `scoreCandidate`, is invoked with the same input. Behaviour is consistent; the classification is still brittle (string pattern matching on IDs).
- **Interaction:** Fan-in: 6 (incl. tests + `simulation.ts` + the orchestrator + 2 dynamic-import sites in `simulation.ts`). `simulation.ts:107` does `await import('./scoring')` for `scoreCandidate` even though `simulation.ts:3` already imports from `./dispatch` (which statically imports `./scoring`) — the dynamic import is dead-weight.
- **Recommendation:** Add a runtime check in the `Object.entries(breakdown)` loop: if a key is missing from `weights`, throw or log. Remove the `await import('./scoring')` in `simulation.ts:107`.

---

### `pivot/src/policy/rollup.ts`

**Originating track:** `dispatch_policy_stats_20260415` — phase 2 (rollup functions) — commit `34c98f2995`
**Phase contract (1 line):** "Implement pure rollup function in `pivot/src/policy/rollup.ts`."

#### Node: `computeDispatchPolicyStats` (function, lines 157-210)
- **Severity:** Critical
- **Construction:** At line 181-198, `p50Cost` is computed as the percentile of `architectConfidence` values, then shipped to Convex as `DispatchPolicyStatsInput.p50Cost`. The downstream `expectedCost` in scoring.ts treats it as a cost and returns `1 - p50Cost`. The author already knew about a similar bug for `medianLatencyMs`/`averageTokens` (see the `TD-043` comment at line 296-299), but the same `architectConfidence` field is still being repurposed as a cost. This is the worst kind of silent semantic drift: a confidence score is not a cost; the `expectedCost` component in the scoring engine is therefore comparing apples to oranges, and the policy-stats layer is baking in the wrong domain.
- **Interaction:** Fan-in: 3 (recompute + tests). The wrong value gets written to Convex and is read back by `expectedCost` in `scoring.ts:105-118`. This means the cost scoring is fundamentally biased and not unit-testable to verify the right behaviour, because there is no right behaviour — `expectedCost` is fed garbage.
- **Recommendation:** Either (a) add a real `costUsd` (or `costCredits`) field to `RunContractRecord`, populate it from `costTracker.ts:calculateStageCost`, and roll *that* up, or (b) rename `p50Cost` to `p50Confidence` end-to-end and update `expectedCost` to compute `1 - p50Confidence` consistently. Either way, do not ship `architectConfidence` under the name `p50Cost`.

#### Node: `computeHarnessReliabilityStats` (function, lines 249-307)
- **Severity:** Medium
- **Construction:** `medianLatencyMs` and `averageTokens` are hard-coded to 0 (line 298-299) with a TD-043 comment acknowledging fabrication. The persistence shape is the same as before, so consumers reading these fields will silently see zero. This is a low-grade landmine. `topFailureModes` is computed as `new Set(recoveryActions)` (line 291) which loses the count — distinct modes ≠ top failure modes.
- **Interaction:** `topFailureModes` flows into the `HarnessReliabilityBucket` and Convex via `upsertHarnessReliabilityStats`. Consumers can't distinguish "one retry" from "100 retries" for the same mode.
- **Recommendation:** When fabricating zero data, return `null` (or omit the field) and make the type `number | null` so consumers must handle absence. For `topFailureModes`, count occurrences and sort by frequency.

#### Node: `percentile` (function, lines 85-90)
- **Severity:** Low
- **Construction:** Nearest-rank method. The `index = Math.ceil((p/100)*sorted.length) - 1` math is correct for p∈(0,100], but for `length=1, p=50` → `index = -1`, then `Math.max(0, -1) = 0` returns the only value (correct). NaN handling: if any element is `NaN`, sort places NaN at the end; the filter at lines 181-182 already excludes `undefined` and `v < 0`, but does not filter NaN. With current input types (`architectConfidence?: number`), this is theoretical.
- **Recommendation:** Add a `Number.isFinite(v)` filter for paranoia; add a unit test for `length=1` and `length=2` cases.

#### Node: `identifyDirtyBuckets` (function, lines 320-345)
- **Severity:** Medium
- **Construction:** `derivePersona(record)` is computed twice (rollup line 131 and again here line 329), and since the function is data-driven (`if recoveryAction → recovery; else if reviewerStatus → reviewer; …`) the persona can change between record creation and the dirty-detection pass. If a record is created with `architectOutput` and later updated with `executorStatus`, the dirty bucket would be marked under the new persona but the eventual rollup would also be under the new persona — consistent. But if a record gets a `recoveryAction` added later, the dirty bucket flips to `recovery` and the previously-computed `executor` stats are no longer kept in sync. The single-stamp `createdAt` is the only field used; the actual mutation time of the persona-defining fields is not tracked.
- **Interaction:** Called only by `recompute.ts:135`. The drift is bounded because the persona ordering is monotonic (`recovery` is the last-resort derivation), but in edge cases (reviewer→executor re-run) the persona could regress.
- **Recommendation:** Track `lastUpdatedAt` per record (or per persona-defining field) and use that for dirty detection, not `createdAt`.

---

### `pivot/src/policy/economic.ts`

**Originating track:** `economic_control_plane_20260415` — phase 2 (modulators) — commit `2d3f180a24`
**Phase contract (1 line):** "Implement `applyBudgetPenalty`, `shouldEscalateRetry`, `selectHarnessByEconomics`, `requiredReviewDepth` as pure functions."

#### Node: `applyBudgetPenalty` (function, lines 46-67)
- **Severity:** Critical
- **Construction:** The function only special-cases `budget.policy === 'strict'` (line 56). For `soft` and `advisory` policies — both part of the `BudgetPolicy` union and both handled by `isBudgetBreached` in `convex/lib/budget.ts:18-26` — the function silently applies the same `penaltyMultiplier * (1 - costPenalty*0.5)` formula regardless. Worse, `taskExpectedCost` is documented as "expected cost of task" (line 43) but no unit is given. The `costPenalty = taskExpectedCost / 1000` magic-1000 is unjustified; the value coming from `scoreCandidate.expectedCost` is `1 - p50Cost` which is 0..1, so dividing by 1000 makes the penalty vanish — meaning `applyBudgetPenalty` is a no-op for any caller that pipes the scoring-engine output through it.
- **Interaction:** Zero production callers (only `economic.test.ts` and `economic.integration.test.ts` use it). The function is dead-weight in production. The plan's "Deviations" note explicitly defers Phase 3 integration; this is the consequence.
- **Recommendation:** Either wire the function into the orchestrator's `selectBestCandidate` (per the plan's Phase 3) and document the cost unit (USD? tokens? story-points?), or delete the file. Decide on a single cost unit and express it in a type alias (e.g. `type Usd = number & { __brand: 'Usd' }`).

#### Node: `selectHarnessByEconomics` (function, lines 104-132)
- **Severity:** High
- **Construction:** At line 130, `midTier = available.find((h) => h.costWeight <= 0.7)` then `return midTier?.name ?? available[0]?.name` — the fallback chain is sensible, but the `0.7` threshold is a magic number with no name. The `harness` candidates are passed by the caller as `HarnessCandidate[]`; the field is `costWeight`, a unitless number. A future maintainer cannot tell whether `0.7` means 70% of budget or 70 cents. Same units critique as above.
- **Interaction:** Zero production callers.
- **Recommendation:** Document units in the type (e.g. `costUsdPerTask: number`) and replace the magic `0.7` with a named constant (e.g. `MID_TIER_COST_CEILING_USD`).

#### Node: `requiredReviewDepth` / `REVIEW_DEPTH_MAP` (function + const, lines 134-155)
- **Severity:** Low
- **Construction:** `REVIEW_DEPTH_MAP` is a flat object literal — fine for clarity. Returns `'standard'` for any unknown key (line 154); reasonable default.
- **Recommendation:** None.

#### Node: `shouldEscalateRetry` (function, lines 78-95)
- **Severity:** High
- **Construction:** Returns `'escalate'` for strict+budget-breach (line 90-92), but for `soft` and `advisory` it never escalates on budget. As with `applyBudgetPenalty`, this means the function behaviour depends on which policy the budget was created with — and a `soft` budget can never trigger escalation regardless of overspend. The plan's `selectHarnessByEconomics` and `shouldEscalateRetry` were supposed to be the recovery control plane; in their current form, only `strict` policies get protection.
- **Interaction:** Zero production callers.
- **Recommendation:** Use the shared `isBudgetBreached` from `convex/lib/budget.ts` to determine breach uniformly.

---

### `pivot/src/policy/allocator.ts`

**Originating track:** `resource_allocation_policy_20260415` — phases 2, 3, 5 (admission controller, worktree manager, budget pacing) — commit `de91cfaccb`
**Phase contract (1 line):** "Implement admission controller, worktree manager (lease + reclaim), and token-bucket pacer; wire anti-affinity into A3 hard filter."

#### Node: `WorktreeManager` (class, lines 161-241)
- **Severity:** Critical
- **Construction:** Pure data-structure class — `Map<string, WorktreeLease>` with allocate/release/heartbeat/getLease/getAllLeases/reclaimStale. In-memory only; no persistence. The plan's Phase 3 says "Emit governance event on reclaim"; the `reclaimStale` method takes an `onReclaim` callback, so the governance event emission is delegated to the caller — but no caller exists in production. `reclaimStale` is also not invoked from anywhere; the only `WorktreeManager` instantiations are inside `allocator.test.ts`.
- **Interaction:** Zero production callers. The plan's wiring claim is unfulfilled.
- **Recommendation:** Either delete the class (per YAGNI) or wire `reclaimStale` into the orchestrator's tick loop, and emit `governanceEvent({ type: 'worktree_reclaim', ... })` from the callback.

#### Node: `DispatchPacer` (class, lines 243-285)
- **Severity:** Critical
- **Construction:** Token-bucket pacer. `refill(0)` (line 269) — the default parameter `elapsedMs = Date.now() - this.lastRefill` is evaluated at call time, *not* at function definition. If `lastRefill` is updated inside `refill()` (line 278), then subsequent `refill(0)` calls will compute `elapsedMs = Date.now() - this.lastRefill` (a small non-zero value), contradicting the intent of "refill with 0 elapsed time". The internal state mutation and the parameter default are tangled. `getAvailableTokens()` calls `refill(0)` (line 282) — same issue.
- **Interaction:** Zero production callers. Plan Phase 5 ("Budget Pacing") is unfulfilled.
- **Recommendation:** Decouple: `refill()` should be parameterless and read `Date.now()` itself; the test helper can stub time externally.

#### Node: `canAdmit` (function, lines 80-107)
- **Severity:** Medium
- **Construction:** Concurrency check is correct. Anti-affinity at line 100-104 is checked *after* worktree/concurrency; the plan's Phase 4 says "Wire anti-affinity into A3 hard filter" — implying the A3 (hard-constraints) layer should reject earlier. The current ordering means a task can be admitted past concurrency limits even if it would be rejected by anti-affinity. More importantly, the function does not appear to be invoked anywhere in the dispatch hot path.
- **Interaction:** Production callers? Search shows none. `canAdmit` is exported but not imported outside tests.
- **Recommendation:** Wire `canAdmit` into `selectBestCandidate` (or upstream of it) per the plan.

#### Node: `loadAllocationPolicy` / `watchAllocationPolicy` / `unwatchAllocationPolicy` (functions, lines 116-159)
- **Severity:** Medium
- **Construction:** `loadAllocationPolicy` returns `null` on failure and `console.error`s (line 122-124). The plan's Phase 1 says "hot reload hook" — `watchAllocationPolicy` does provide a 1-second `watchFile` poller but does not propagate the error type from the YAML parse (silently falls back to old onChange with `null` payload). Also, the `watchers` Map at line 109 is a module-level singleton — multiple callers in different processes will collide; the unwatch function at line 154 iterates *all* watchers and clears the map.
- **Interaction:** Zero production callers. The hot-reload feature is unused.
- **Recommendation:** Either remove the file-watch (rely on process restart for config changes) or use `chokidar` for proper FS events and add a way to unsubscribe per-file (not per-process).

#### Node: `taskMatchesPattern` (function, lines 67-71)
- **Severity:** Low
- **Construction:** Takes a `pattern` of form `"feature:*"` but the function destructures with `const [typePattern, ...rest] = pattern.split(':')` and then *ignores* `rest`. Glob-style matching is not actually implemented — only the type segment is compared. The "JSDoc says 'glob-like syntax'" but the code does prefix-only.
- **Recommendation:** Either remove the misleading comment or actually implement glob matching (e.g. `micromatch`).

---

### `pivot/src/policy/dispatch.ts`

**Originating track:** `adaptive_scoring_engine_20260415` — phase 4 (orchestrator integration) — commit `4f69f6e698`
**Phase contract (1 line):** "Wire scoring into dispatch flow after A3 filters; persist audit per dispatch."

#### Node: `selectBestCandidate` (function, lines 32-73)
- **Severity:** Medium
- **Construction:** Returns `Promise<SelectedCandidate | null>`. The justification string at line 62-64 only describes the top-vs-runner-up gap; it does not show the breakdown or the weights used. The plan's Phase 4 said "Persist audit per dispatch" — `createScoreAudit` is called from `orchestrator/orchestrator.ts:307`, but the justification here is too terse for a useful audit. The `trackId` is read from `top.task.trackId` (line 68) — this assumes every task has a `trackId`; the production `Task` type has it as required (`string`), so OK. The `llmTieBreak` is computed against `runnerUp` (the second-highest scorer), but if there are 3+ candidates within `epsilon`, only the top-1 vs top-2 is checked.
- **Interaction:** Fan-in: 6 (orchestrator + simulation + tests).
- **Recommendation:** Include `top.breakdown` and the effective `weights` in the justification / audit record. Tighten the tie-break to "any candidate within epsilon of top" not just the runner-up.

---

### `pivot/src/policy/simulation.ts`

**Originating track:** `policy_simulation_replay_20260415` — phase 1-2 — commit `a1be0b380a`
**Phase contract (1 line):** "Implement pure simulation engine reusing A3 filters + B2 scoring as pure functions; aggregate delta metrics."

#### Node: `simulateDispatches` (function, lines 53-145)
- **Severity:** High
- **Construction:** At line 107, `const { scoreCandidate } = await import('./scoring')` — the module is already imported statically transitively through `selectBestCandidate`. The dynamic import is dead code. More importantly, the function double-scores when diverged: it scores all candidates to pick `simulatedChoice`, then re-scores the historical and simulated candidates separately. The simulation is correct on logic but the API is a sprawl — five parameters plus an options object, and `policyStats`/`harnessStats` are passed all the way through, suggesting a coupling that should be wrapped in a "PolicyContext" object.
- **Interaction:** Fan-in: 6 (tests + potentially a future route per Phase 3). The Phase 3 "Add `POST /policy/simulate` route" is not present.
- **Recommendation:** Remove the `await import('./scoring')`. Bundle the four stats/weights/policy/rules arguments into a `SimulationContext` interface.

#### Node: `aggregateSimulationReport` (function, lines 153-282)
- **Severity:** Medium
- **Construction:** Counterfactual pass-rate at line 224-233: "For diverged choices, estimate from policy stats or use neutral" — the code path just reuses the *historical* outcome as if it were the simulated outcome. The comment admits this is a simplification. `misconfigurationWarning: rejectionRate > 0.25` (line 281) — the threshold 0.25 is a magic number; the plan's Phase 4 said "Add misconfiguration warning (>25% rejection)" so it's per-spec, but the threshold is hard-coded.
- **Recommendation:** Hoist the `0.25` constant. Document the counterfactual assumption prominently in the JSDoc — future maintainers will assume the math is real.

---

### `pivot/src/policy/weeklyReport.ts`

**Originating track:** `continuous_orchestration_20260502` (checkpoint) — commit `21afdd7547`
**Phase contract (1 line):** "Generate weekly scoring report with factor contribution + cost-conservative counterfactual."

#### Node: `main` (function, lines 216-242) + file-level `await main()` (line 244)
- **Severity:** Critical
- **Construction:** The file ends with `await main();` at module scope. Any import side-effect will execute the main loop — fetching Convex data, writing to `measure/reports/`, exiting. The test file (`weeklyReport.test.ts`) therefore *cannot* import the source file: instead, it duplicates `standardDeviation` and `computeFactorStats` line-for-line (verified: 47 lines of duplicated logic in the test file). This is the textbook outcome of top-level-await in a library file. The script is invoked via `pivot/package.json:16` `report:weekly: bun src/policy/weeklyReport.ts` — fine as a script entry — but the file should guard with `if (import.meta.main) await main();` to prevent side-effect leakage.
- **Interaction:** The duplicated logic will drift. If `computeFactorStats` is changed in the source, the test will silently test the stale version.
- **Recommendation:** Wrap `await main()` in `if (import.meta.main) { ... }`. Delete the duplicate definitions in `weeklyReport.test.ts` and import them from the source file (or extract to a sibling `weeklyReport.compute.ts`).

#### Node: `computeCounterfactual` (function, lines 90-120)
- **Severity:** Medium
- **Construction:** Uses a hand-rolled "did the score change significantly" heuristic at line 111: `Math.sign(activeScore) !== Math.sign(altScore) || Math.abs(activeScore - altScore) > Math.abs(activeScore) * 0.5`. This treats the absolute *current* score as the reference; a small absolute score with a small change is flagged as a 50% change. Mathematically, the threshold should be relative to the magnitude of the score, not the absolute value of `activeScore`. A more honest metric: rank the candidates under both weight sets and count rank-flips.
- **Interaction:** Report output only.
- **Recommendation:** Replace the heuristic with a rank-flip count or document it as a "large relative change" approximation.

---

### `pivot/src/pipeline/orchestrator.ts`

**Originating track:** `pipeline_engine_20260517` — phase 1 (orchestrator) — commit `c25c8b9af3`
**Phase contract (1 line):** "Build the main pipeline orchestrator with task pickup, agent matching, stage transition."

#### Node: `PipelineOrchestrator` (class, lines 89-221)
- **Severity:** High
- **Construction:** Class is internally consistent. Stage transition logic at line 193-197 only updates the task's `status` after `executor` (→ `review`) and `merger` (→ `done`) — but other stages (architect, reviewer) leave the status as `in_progress` regardless of pass/fail. The failure handling at line 184-189 is the same regardless of which stage failed. The retry-on-failure logic does not differentiate between "stage produced bad output" (reviewer) and "stage couldn't start" (no agent). `convexClient: null` is passed at line 173 — the orchestrator never actually uses Convex during execution, so the `ExecutionContext.convexClient` field is unused.
- **Interaction:** Fan-in: 1 (PipelineScheduler). The class is a 132-line "god class" doing dispatch, agent selection per stage, retry accounting, and result building.
- **Recommendation:** Extract `buildFailureResult` and `transitionStatusForStage` to free functions. Add a per-stage retry budget (the plan's Phase 8 said "Architect/Executor/Reviewer fail → retry or block" and "Merger fail → retry merger specifically" — the implementation lumps all stages).

#### Node: `findAgentForStage` (function, lines 32-60)
- **Severity:** Low
- **Construction:** Score is `overlap + availability * 5` (line 55). Magic 5. Overlap is naive word-match (lowercase + split on whitespace) on `task.description` — same algorithm as `scoreAgentMatch` in `pipeline/stages/dispatch.ts:14-26`. The two functions are independently maintained and could drift.
- **Recommendation:** Extract to a shared `pipeline/skillMatch.ts` helper.

#### Node: `getCurrentStage` (function, lines 65-83)
- **Severity:** Low
- **Construction:** `status: 'backlog'` and `'done'` both return `'dispatch'` — these are terminal/initial states and mapping them to `dispatch` is fine, but the comment ("blocked/backlog tasks re-enter at dispatch") is misleading for `done` (a `done` task should not be re-entered into dispatch). The fallback `default: return 'dispatch'` is fine.
- **Interaction:** Only used in `orchestrator.test.ts`. Not called from any production code.
- **Recommendation:** Either remove the function (dead code) or mark it as planning-time logic and document that it should not be used in the run-time hot path.

---

### `pivot/src/pipeline/scheduler.ts`

**Originating track:** `pipeline_engine_20260517` — phase 9 (integration) — commit `c25c8b9af3`
**Phase contract (1 line):** "Wire orchestrator to Convex mutations; periodic scheduler."

#### Node: `PipelineScheduler` (class, lines 15-189)
- **Severity:** Medium
- **Construction:** `runCycle` at line 61-118 does an N+1 query pattern: lists all projects, then for each project, lists sprints, then for each project, lists tasks. The `activeSprintIds` filter at line 98 uses `t.sprintId!` — non-null assertion, will throw if a `ready` task has no `sprintId`. The `start()` method calls `this.tick()` (line 32) but `tick` is `private` — and the recursive `this.tick()` at line 53 re-arms `setTimeout`, so there is no drift correction. The plan said "drift correction" (per `continuous_orchestration_20260405` plan reference); not implemented.
- **Interaction:** Wired via `pivot/src/routes/pipelineEngine.ts`. Auto-starts at 5-minute interval.
- **Recommendation:** Add drift correction (compute next deadline from `start() + N*intervalMs`). Pre-fetch active sprints once and pass into a single Convex query.

#### Node: `processTask` (method, lines 123-188)
- **Severity:** High
- **Construction:** At line 169-183, when `execution.finalStatus === 'done'`, the code fetches the task, fetches the sprint, and then *comments* "Note: sprint cost update would need a dedicated mutation / For now, the closeSprintHandler calculates from pipeline runs". The dead code is misleading — the comment says "for now" but no mutation is ever called. The `for (const stage of execution.stages)` loop at line 127 hits dispatch twice in the cost-record path (once at line 128 to assign, then again at line 137 to skip dispatch when recording runs).
- **Recommendation:** Remove the dead block at line 169-183, or implement the sprint-cost mutation.

---

### `pivot/src/pipeline/agentTypes.ts`

**Originating track:** `pipeline_engine_20260517` — commit `c25c8b9af3`
**Phase contract (1 line):** "Types for the 5-stage agent pipeline execution engine."

#### Node: `STAGE_ORDER` (schema, lines 127-133)
- **Severity:** Medium
- **Construction:** Imported by `orchestrator.ts:10` but never referenced (verified: `grep -c STAGE_ORDER pivot/src/pipeline/orchestrator.ts` returns 1, which is the import line). The `remainingStages` array at `orchestrator.ts:146-151` is a hand-written list that duplicates `STAGE_ORDER` minus the `dispatch` prefix.
- **Recommendation:** Either use `STAGE_ORDER.filter((s) => s !== 'dispatch')` in `orchestrator.ts`, or delete the unused export.

#### Node: `STAGE_MULTIPLIERS` (schema, lines 118-123)
- **Severity:** Low
- **Construction:** Multipliers (architect 0.3, executor 1.0, reviewer 0.3, merger 0.1) are hard-coded. No comments explain how they were calibrated.
- **Recommendation:** Either keep as-is (with a comment that they're empirical defaults) or move to a config file.

#### Node: `Task` (interface, lines 39-55) — parallel to `orchestrator/types.ts:Task`
- **Severity:** High
- **Construction:** This `Task` interface has `_id`, `storyPoints`, `costEstimate`, `assigneeId`, `priority: 'low' | 'medium' | 'high'`. The production `Task` in `orchestrator/types.ts` has `taskKey`, `trackId`, `dependencies`, `assignee`, `tags`, `retryCount`, `lastDispatchAttemptAt`. These are two different domains. The pipeline engine (`PipelineScheduler.runCycle`) loads Convex `tasks.listTasksHandler` and casts the result to *this* `Task`, but the Convex `tasks` table is the one used by the orchestrator — so the fields do not align. Either the pipeline engine never runs against real data, or there's a hidden Convex schema in between. (The pipeline engine tests use mock data so the type drift is hidden.)
- **Interaction:** Used by `planning/recommender.ts` and `routes/sprintPlanning.ts` for cost estimation only.
- **Recommendation:** Document the relationship: is this a *projection* of the orchestrator `Task`? If yes, name it `PipelineTask` and provide a mapping function.

---

### `pivot/src/pipeline/costTracker.ts`

**Originating track:** `pipeline_engine_20260517` — phase 7 (cost tracking) — commit `c25c8b9af3`
**Phase contract (1 line):** "Implement cost calculation per stage + sprint cost aggregation."

#### Node: `calculateStageCost` (function, lines 12-20)
- **Severity:** Low
- **Construction:** `agent.costPerPoint * task.storyPoints * multiplier`. Returns 2-decimal rounded. Clean. No unit in JSDoc; comment says "× storyPoints × stage multiplier" but doesn't say "USD per story-point".
- **Recommendation:** Add a JSDoc line: "Returns USD cost (2-decimal precision)."

#### Node: `calculateTotalEstimate` (function, lines 25-39)
- **Severity:** Low
- **Construction:** Hand-writes the 4 stages again (line 29-34), duplicating `STAGE_ORDER` minus dispatch.
- **Recommendation:** Use `Object.keys(STAGE_MULTIPLIERS)` as the iteration source.

---

### `pivot/src/pipeline/stages/dispatch.ts`

**Originating track:** `pipeline_engine_20260517` — phase 2 (dispatch executor) — commit `c25c8b9af3`

#### Node: `scoreAgentMatch` (function, lines 14-26)
- **Severity:** Low
- **Construction:** Duplicates the same word-overlap + availability algorithm in `orchestrator.ts:findAgentForStage`. Two implementations will drift.
- **Recommendation:** Consolidate.

---

### `pivot/src/pipeline/runner.ts` (legacy YAML pipeline)

**Originating track:** `fix_yaml_safe_schema_20260425` — phases 1-2 — commit `64043d61b7`
**Phase contract (1 line):** "Define pipeline YAML schema + parser + runner engine; respect stage conditions and step DAG."

#### Node: `BunStepExecutor` (class, lines 20-58)
- **Severity:** Medium
- **Construction:** `signal.addEventListener('abort', abortHandler, { once: true })` (line 29) but `abortHandler` is declared with `() => controller.abort()` — it ignores the passed-in `AbortSignal` for any cancellation by *external* signal. External abort → timeout continues to fire; external abort of the outer AbortSignal is the *only* way to propagate cancellation. The `finally` block at line 53-56 calls `signal.removeEventListener` which is correct, but the `controller` is a *new* AbortController — so when the parent `signal` aborts, this internal `controller` does not abort. Therefore external aborts never reach the spawned process. **Real bug.**
- **Interaction:** `runPipeline` passes `signal = new AbortController().signal` (line 253) — a never-aborted signal. So the bug is latent in production but testable.
- **Recommendation:** Wire `signal` → `controller.abort()` directly: `signal.addEventListener('abort', () => controller.abort())` (drop the inline `abortHandler`).

#### Node: `executeStage` (function, lines 175-226)
- **Severity:** Medium
- **Construction:** The parallel-detection loop at line 189-196 uses `while (i + 1 < orderedSteps.length && orderedSteps[i + 1].parallel === true && step.parallel === true)`. The first step's `parallel` flag is checked via the outer `i`-increment, but `step` (the *first* step in the group) was fetched *before* the loop; if `step.parallel === false`, the while-body never runs, and the lone step is executed sequentially. The grouping logic is subtle but correct — though the variable name `parallelGroup` is misleading when the group has length 1.
- **Recommendation:** Rename `parallelGroup` to `batch`; add a comment explaining the algorithm.

#### Node: `runPipeline` (function, lines 243-307)
- **Severity:** Low
- **Construction:** On stage failure, returns the partial result with `status: 'failed'` (line 281-293) — fine. `signal = new AbortController().signal` (line 253) creates a brand-new AbortSignal each call. If the caller never aborts, fine; if they want to pass a signal, they pass it in `options.signal` and it's used. OK.

---

### `pivot/src/pipeline/loader.ts`

**Originating track:** `fix_yaml_safe_schema_20260425` — phase 1 (schema + parser) — commit `64043d61b7`

#### Node: `validateNoCircularDeps` (function, lines 101-128)
- **Severity:** Low
- **Construction:** The function name is misleading. It only validates that *every* `depends_on` target *exists* in the global step name set. It does **not** detect cycles. The plan's Phase 1 acceptance criterion was "circular stage deps" (per `pipeline_runner_20260330` plan line 9). True cycle detection requires a topological sort — which `runner.ts:resolveStepOrder` *does* perform and *throws* on cycle (line 97). The two functions have inconsistent error messages and trigger at different lifecycle stages.
- **Recommendation:** Either rename to `validateNoMissingDeps` or implement a real DFS cycle check.

#### Node: `loadPipelines` (function, lines 29-69)
- **Severity:** Low
- **Construction:** Throws typed `PipelineLoadError`; conversion of ZodError is done manually (line 58-62). Clean.

---

### `pivot/src/pipeline/types.ts`

**Originating track:** `fix_yaml_safe_schema_20260425` — phase 1 — commit `64043d61b7`

#### Node: `PipelineExecutionSchema` (schema, lines 77-88)
- **Severity:** Low
- **Construction:** `envOverride: z.record(z.string(), z.string()).optional()` (line 85) — runtime OK, but the field carries the *entire* env snapshot, which may include secrets. The schema does not distinguish secrets.
- **Recommendation:** Either redact in serialization or document the security model.

---

### `pivot/src/pipeline/types.ts` — type collision with `pivot/src/pipeline/agentTypes.ts`

#### Node: `Stage` / `StageResult` (duplicate type names across the two files)
- **Severity:** High
- **Construction:** `pipeline/types.ts:Stage` (the YAML pipeline) and `pipeline/agentTypes.ts:StageResult` (the agent pipeline) both exist; `StageResult` is exported from both `pipeline/types.ts:67-75` and `pipeline/agentTypes.ts:84-93` with different shapes. If a future file imports `StageResult` from a barrel or via `from '../pipeline'`, the wrong one will resolve depending on the order. This is a latent bug.
- **Recommendation:** Rename one — e.g. `PipelineStageResult` for `types.ts`, `AgentStageResult` for `agentTypes.ts`.

---

### `pivot/src/policy/statsClient.ts` / `budgetClient.ts` / `policyClient.ts`

**Originating tracks:** `dispatch_policy_stats_20260415`, `economic_control_plane_20260415`, `environment_management_20260330`

#### Nodes: every exported function in the three clients
- **Severity:** Low
- **Construction:** Each client is a thin wrapper around a Convex mutation/query. Return types are `Record<string, unknown>` or `Promise<Record<string, unknown> | null>` — losing all type information. Callers must cast.
- **Interaction:** Fan-in: 3-5 per function. All wired into `recompute.ts` and `orchestrator/orchestrator.ts` (for `createScoreAudit`).
- **Recommendation:** Define Convex-side types in `convex/_generated/api` and re-export. Replace `Record<string, unknown>` with the real record types.

---

### `pivot/src/policy/scheduler.ts`

**Originating track:** `dispatch_policy_stats_20260415` — phase 4 (scheduler + route) — commit `850db18550`

#### Node: `PolicyStatsScheduler` (class, lines 7-53)
- **Severity:** Low
- **Construction:** Same recursive `setTimeout` pattern as `PipelineScheduler` — no drift correction. Wired in `pivot/src/server.ts:117-118`. The class is a sibling of `PipelineScheduler` and could share a base class.

---

## 3. Cross-cutting patterns in this slice

1. **Orphan exports across the economic + resource-allocation tracks.** `applyBudgetPenalty`, `shouldEscalateRetry`, `selectHarnessByEconomics`, `requiredReviewDepth`, `WorktreeManager`, `DispatchPacer`, `watchAllocationPolicy`, `canAdmit` are all exported but have **zero production callers** — only the test files invoke them. The plans' "Deviations" notes acknowledged this for economic.ts (`economic_control_plane_20260415` plan line 39-40), but resource_allocation_policy_20260415 (Phases 3, 5) and dispatch_hard_constraints_20260415 wiring are equally unwired. **This is the slice's largest pattern** — 8+ exports that look production-ready but aren't.

2. **Duplicate scoring/agent-matching algorithms.** `scoreAgentMatch` (pipeline/stages/dispatch.ts), `findAgentForStage` (pipeline/orchestrator.ts), and the word-overlap logic in `scoreCandidate.affinityScore` are three independent implementations of "how well does this agent/harness match this task". Each will drift. There is no shared `skillMatcher.ts` or `similarity.ts`.

3. **`p50Cost` semantic drift across rollup → scoring.** `p50Cost` is computed from `architectConfidence` in `rollup.ts:181,198` then consumed in `scoring.ts:117` as `1 - p50Cost`. A confidence score is not a cost, and the two values are on incompatible scales. The TD-043 comment at `rollup.ts:296` shows the author is aware of the issue but stopped halfway. The same unit-ambiguity problem recurs in `economic.ts:46-67` where `taskExpectedCost / 1000` is a magic scaling.

4. **Top-level `await main()` in a library file.** Only `weeklyReport.ts` does this, but it forces the test file to copy-paste the helpers. Future test files in similar positions will repeat the mistake.

5. **Untyped strings as enums.** `PipelineStage` is a union type, but `TaskKind` (`'bug' | 'chore' | 'review' | 'feature'`), `RiskLevel`, `ReviewDepth` are only defined as `type_alias` in some files and `string` parameters in others (`persona: string` in `scoring.ts:66`). The `string` parameters in scoring functions bypass the type system and silently return 0.5 on miss.

6. **Two parallel `Task` interfaces.** `pipeline/agentTypes.ts:Task` and `orchestrator/types.ts:Task` describe overlapping but incompatible shapes (`_id` vs `taskKey`, `priority: low|medium|high` vs tags). The pipeline scheduler type-casts Convex data — currently safe because mock data, but a real-data path would crash.

7. **Wired-only-once integration tests.** `economic.integration.test.ts` has 0 nodes, but exists. The economic modulators are tested in isolation but the integration into the dispatch path (the plan's Phase 3) is absent. Many "B* + C*" tracks share this shape: pure functions are written and tested, then never connected.

8. **Magic numbers in scoring/penalty formulas.** `taskExpectedCost / 1000` (economic.ts:63), `costWeight <= 0.7` (economic.ts:130), `availability * 5` (orchestrator.ts:55), `availabilityBonus * 10` (dispatch.ts:21), `penaltyMultiplier = 1 - utilizationRatio` (economic.ts:61), `rejectionRate > 0.25` (simulation.ts:281), `age * 0.1` (scoring.ts:134). None have unit comments.

---

## 4. Top-10 improvement queue

| # | Node | Severity | Effort | Why |
|---|------|----------|--------|-----|
| 1 | `pivot/src/policy/rollup.ts:computeDispatchPolicyStats` (p50Cost from architectConfidence) | Critical | M | End-to-end semantic bug: the field name says cost, the data is confidence. Feeds `expectedCost` in scoring → biased dispatch. Author already started the fix (TD-043 comment) but didn't finish. |
| 2 | `pivot/src/policy/weeklyReport.ts` top-level `await main()` | Critical | S | Single line `if (import.meta.main) await main();` would let the test file stop duplicating 47 lines and prevent future tests from drifting. |
| 3 | `pivot/src/policy/allocator.ts:WorktreeManager` + `DispatchPacer` (orphan exports) | Critical | S–M | Plan claimed "wired"; not wired. Delete or wire into the orchestrator tick loop. |
| 4 | `pivot/src/policy/economic.ts:applyBudgetPenalty` (soft/advisory policies ignored + unit-ambiguous cost) | Critical | M | Either wire into the dispatch path (plan's Phase 3) and fix the unit, or delete. Currently dead code. |
| 5 | `pivot/src/pipeline/runner.ts:BunStepExecutor` (external AbortSignal never reaches the child process) | High | S | Real cancellation bug; tests pass because they don't abort. Replace the inline `abortHandler` with `signal.addEventListener('abort', () => controller.abort())`. |
| 6 | `pivot/src/pipeline/orchestrator.ts:PipelineOrchestrator` (per-stage retry budget collapsed to one branch) | High | M | Plan Phase 8 said "Merger fail → retry merger specifically"; implementation lumps all stages. Per-stage retry policy is a correctness/observability gap. |
| 7 | `pivot/src/pipeline/agentTypes.ts:Task` vs `pivot/src/orchestrator/types.ts:Task` (two parallel type systems) | High | M | Renaming to `AgentPipelineTask` and adding a mapping function would prevent future type-cast bugs when the pipeline engine hits real data. |
| 8 | `pivot/src/pipeline/loader.ts:validateNoCircularDeps` (name says cycle check, body checks missing-deps only) | Medium | S | Rename or implement a real DFS cycle detector; cycle detection is already done correctly in `runner.ts:resolveStepOrder`. |
| 9 | `pivot/src/pipeline/orchestrator.ts` unused `STAGE_ORDER` import + duplicate hand-written stage list | Medium | S | Remove the import or use it; consolidate with `calculateTotalEstimate`'s hard-coded list. |
| 10 | `pivot/src/policy/simulation.ts:107` `await import('./scoring')` (dynamic import of a statically-imported module) | Low | S | Dead code; the same module is reachable via the static import at line 3. |

---

## 5. Track ↔ Implementation diffs

- **`economic_control_plane_20260415` — Phase 3 (Orchestrator Integration).** Plan says: "Hook `applyBudgetPenalty` into B2 scoring output / Hook `shouldEscalateRetry` into recovery decisions / Hook `selectHarnessByEconomics` into harness selection step / Hook `requiredReviewDepth` into review dispatcher." Code: none of the four modulators are imported outside `economic.ts` and its test files. The plan itself acknowledges this as a "Deviation" (line 39-40: "Full orchestrator integration ... is deferred to future work"). The cost is real: the economic control plane has no runtime effect.

- **`resource_allocation_policy_20260415` — Phase 3 (Worktree Manager).** Plan says: "Implement worktree manager / Emit governance event on reclaim." Code: `WorktreeManager` is exported and tested but never instantiated in production. No `reclaimStale` caller exists. The plan's deviation is implicit (not acknowledged).

- **`resource_allocation_policy_20260415` — Phase 5 (Budget Pacing).** Plan says: "Write failing test: dispatch rate throttled to configured cap ±10% / Implement token-bucket pacer." Code: `DispatchPacer` exists and is tested, but the orchestrator's `selectBestCandidate` path does not consult it.

- **`dispatch_hard_constraints_20260415` — Phase 3 (Orchestrator Integration).** Plan says: "Wire `filterEligibleTasks` into dispatch flow." Code: confirmed wired in `pivot/src/orchestrator/orchestrator.ts` via the imported `selectBestCandidate` path. This one *is* delivered.

- **`adaptive_scoring_engine_20260415` — Phase 4 (Orchestrator Integration).** Plan says: "Wire scoring into dispatch flow after A3 filters / Persist audit per dispatch." Code: `selectBestCandidate` and `loadDispatchOptions` are wired in the orchestrator (line 7, 37, 249-254); `createScoreAudit` is called at line 307. Delivered.

- **`pipeline_engine_20260517` — Phase 1 (Pipeline Orchestrator).** Plan says: "Build the main pipeline orchestrator with task pickup from Ready queue." Code: `PipelineOrchestrator.runTask` is built; `PipelineScheduler.runCycle` picks up tasks from Convex `tasks.listTasksHandler`. The status-to-stage mapping in `getCurrentStage` maps `done` to `dispatch` which is a likely bug for re-dispatched tasks.

- **`pipeline_engine_20260517` — Phase 7 (Cost Tracking).** Plan says: "Create cost history tracking (pipelineRuns table)." Code: `costTracker.ts:calculateStageCost` writes cost into `StageResult.cost`, the scheduler writes it into `pipelineRuns` via `updatePipelineRunStatusHandler`. Sprint cost update is *not* implemented (line 169-183 of scheduler.ts is a stub with a "for now" comment).

- **`pipeline_runner_20260330` — Phase 5 (Verification).** Plan says: "Pipeline triggered by task completion hook fires when a task transitions to `done`." Plan's own deviation: "Pipeline runner accepts `triggeredBy: 'task-complete'` and `triggeredByTaskId` — integration deferred until orchestrator hooks are wired." Confirmed: the field is accepted by `runner.ts:233-234` but no production code passes it.

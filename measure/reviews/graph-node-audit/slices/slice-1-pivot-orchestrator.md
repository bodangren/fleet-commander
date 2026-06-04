# Graph Node Audit — pivot/orchestrator core

**Slice:** `slice-1-pivot-orchestrator`
**Files reviewed:** 56
**Nodes reviewed:** 142
**Findings:** Critical: 4 · High: 9 · Medium: 14 · Low: 4
**Date:** 2026-06-02

---

## 1. Slice Overview

The `pivot/src/orchestrator/` slice is the runtime heart of the Bun-based dispatch pipeline: it loads tasks from Convex, scores/selects work, executes it via the OpenCode SDK, persists state, and feeds lifecycle hooks/notifications. It is the result of a long sequence of measure tracks — `agent_issue_autocreation_20260330`, `platform_pivot_bun_convex_20260401`, `dispatch_hard_constraints_20260415`, `self_healing_20260502` (now REDUNDANT), `continuous_orchestration_20260405`/`_20260502` (the second is REDUNDANT), `symphony_pivot_20260503`, `dispatch_scoring_v2_20260501`, `agent_scheduling_execution_20260313`, `notification_system_20260502`, `tech_debt_remediation_20260516`.

The dominant health signal is **scope drift and orphan subsystems**: a large fraction of the 142 nodes belong to two parallel sub-systems (continuous-mode and self-healing) that were never integrated into the main `runProject()` flow, and a third ("virtual software house" scheduler) that targets a different domain model entirely. The active `orchestrator.ts::runProject` is a 985-line monolith that absorbs most of the new behaviour (circuit-breaker, coverage enforcement, hooks, run contract validation, notifications) via inline blocks. The two big red flags are: (a) the parallel self-healing/continuous-mode classes are wired up to nothing in production, and (b) `runProject` has accumulated ~10 distinct inline `try/catch → logAndCaptureError` blocks of near-identical shape, making it the obvious next-refactor target.

---

## 2. Per-file findings

### `pivot/src/orchestrator/orchestrator.ts`

**Originating track:** `agent_issue_autocreation_20260330` — phase `Phase 5 (Verification)`-rooted; most logic added in `dispatch_hard_constraints_20260415`, `symphony_pivot_20260503`, `dispatch_scoring_v2_20260501`, `notification_system_20260502` — commit `c670adabda` (with later phases through 2026-05-05)
**Phase contract (1 line):** Single Bun-side orchestration cycle that loads, scores, executes, persists, and recovers one project's task.

#### Node: `PolicyStatsCacheEntry` (interface, lines 41-44)
- **Severity:** Low
- **Construction:** Summary is generic; struct mirrors a private type alias used by `policyStatsCache`. Not exported, only used by `runProject`.
- **Interaction:** No edges. Pure internal struct.
- **Recommendation:** Add JSDoc distinguishing it from `StalenessCache<T>`'s data parameter; otherwise fine.

#### Node: `RunResult` (interface, lines 48-53)
- **Severity:** Low
- **Construction:** Exported, JSDoc missing for an interface whose consumers (`runAllProjects`, `autoRunner`, routes) depend on the literal status string set.
- **Interaction:** 1 in-edge.
- **Recommendation:** Add a `@remarks` enumerating the exact `status` literals; 4 tests + 3 modules depend on the string set.

#### Node: `appendLog` (function, lines 59-77)
- **Severity:** Medium
- **Construction:** WAL fallback swallows `err` via `console.warn` only — the Convex error is never surfaced to the caller, and the WAL replay path is not asserted anywhere.
- **Interaction:** 8 in-edges (hot path). Replicates the same WAL-wrap pattern as `persistWorkRun` and `updateTaskStatus`.
- **Recommendation:** Extract a `walWrap(client, target, args, log)` helper — three near-identical copies exist in this file alone.

#### Node: `TimingFields` (interface, lines 83-91)
- **Severity:** Medium
- **Construction:** Adjacent fields are partially populated: `hookBeforeMs` and `hookAfterMs` are set but `hookAfterMs` only on success; the failure-exit branch in lines 767-777 omits it.
- **Interaction:** Internal only.
- **Recommendation:** Either make `hookAfterMs` always-set or document why it can be undefined. The spec/audit telemetry will skew if a downstream consumer assumes it is set.

#### Node: `persistWorkRun` (function, lines 93-110)
- **Severity:** Medium
- **Construction:** Same WAL-wrap pattern as `appendLog`. The mutation call `fleetCatalog.upsertWorkRun` is called with `{ startedAt: Date.now(), ...timings }` — `startedAt` is computed inside the function, not from the original `runId`-minted `startMs`. So `startedAt` in the persisted record drifts from the run's actual start by the cost of the surrounding `await`s.
- **Interaction:** 8 in-edges.
- **Recommendation:** Move the `startedAt` capture to `runProject`'s first await and pass it in. Also dedupe with the WAL helper.

#### Node: `updateTaskStatus` (function, lines 116-139)
- **Severity:** High
- **Construction:** The `status` field is cast `as 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'` to satisfy `fleetCatalog.upsertTask`, but the input type is the narrower `'todo' | 'ready' | 'in_progress' | 'blocked' | 'done'` union from `types.ts`. The cast widens the input — `'todo'` and `'done'` are still in the cast union, so this works today, but `types.ts::TaskStatus` and `fleetCatalog` are now coupled only through a hidden cast.
- **Interaction:** 5 in-edges. Any drift in either side silently slips through.
- **Recommendation:** Use the canonical Convex-generated `TaskStatus` type from `convex/_generated/dataModel` instead of an inline string-literal cast.

#### Node: `sleep` (function, lines 144-146)
- **Severity:** Low
- **Construction:** Underscores the absence of a shared util — three different `setTimeout`-based sleeps exist in this slice (also in `AutoRunner`/`ContinuousModeManager` ticks).
- **Interaction:** 2 in-edges.
- **Recommendation:** Promote to a shared `util/sleep.ts` so the `continuous_orchestration_20260405` tick primitives can be deprecated in one step.

#### Node: `runProject` (function, lines 153-1137)
- **Severity:** **Critical**
- **Construction:** 985 lines, 25+ branches, ~10 `try/catch` blocks each calling `logAndCaptureError(client, ...)`, 5 distinct exit paths (`return` statements at 302, 343, 375, 793, 836, 1057, 1136), 3 places that persist `workRun` and 3 that send notifications. Cyclomatic complexity is well above the methodology's 15 threshold. Inferred from edge counts: `scoreStartMs → scoreMs` (line 299) and `executeStartMs → executeMs` (line 798) are both captured only on certain exit paths, so timing metrics are inconsistent across success/failure/coverage-fail/timeout paths. The block at lines 540-562 clears `sessionId` for `replan`/`split` recovery actions — but the recovery action enum lives in `RecoveryEvent` and isn't actually set by anyone (see `RecoveryDispatcher` finding below).
- **Interaction:** 8 in-edges. Most of the file is re-implementing logic that already exists as standalone nodes: `filterEligibleTasks` (constraints.ts) is called, but the scoring fallback at line 282 re-uses `getBestTask` from `evaluator.ts`; circuit-breaker state is queried via Convex mutations (lines 330-355) instead of the local `CircuitBreaker` class; stalled detection lives only in `RecoveryDispatcher` which this function never calls.
- **Recommendation:** Refactor into pipeline stages (`loadTasks → scoreCandidates → checkBudget → checkCircuit → executeWithRetries → persistResults → enforceCoverage → runReview`). Extract a `withConvexWal(target, args, log)` helper for the three WAL-wrap duplicates. The plan-mode "split into composable steps" track likely already exists in `tech_debt_remediation_20260516` — surface as a top improvement.

#### Node: `runAllProjects` (function, lines 1143-1196)
- **Severity:** Medium
- **Construction:** DI shape (`deps.createClient`, `deps.loadProjects`, `deps.runProjectFn`) is good and well-tested (`runAllProjects.test.ts`, 10 tests). But the `msg !== \`no tasks available for project ${project.slug}\`` filter at line 1177 couples this function to a specific error string from somewhere else — likely `runProject`, which currently doesn't throw that message at all. The filter is dead defensive code.
- **Interaction:** 5 in-edges. Only invoked from `run.ts` and `AutoRunner`.
- **Recommendation:** Either delete the special-case filter or replace with a typed `NoTasksError`. Add a regression test that asserts the dead branch is exercised.

---

### `pivot/src/orchestrator/types.ts`

**Originating track:** `agent_issue_autocreation_20260330` — phases 1-3 incrementally — commit `c670adabda`; with later additions across multiple tracks.
**Phase contract (1 line):** Type definitions for the entire orchestrator domain (tasks, projects, agents, harnesses, recovery, hooks, etc.).

**No findings** for the 28 individual interfaces/types. They are well-named, the unions are precise, and the defaults (`DEFAULT_CONFIG`, `DEFAULT_RETRY_CONFIG`, `SYMPHONY_RETRY_CONFIG`) are consistent with what the spec mandated in `symphony_pivot_20260503`. One cross-cutting observation: `IssueHooks.createBlocker` (line 136) and the matching `createDelegationIssues` (line 146) duplicate signatures from `issues.ts::createBlockerIssue` / `createDelegationIssues` but take 8 and 4 positional args, respectively. The two interfaces (here vs `hookRunner.ts::HarnessHooks`) also collide conceptually with the `HookResult`-bearing lifecycle hooks in `hookRunner.ts` — the spec language for "lifecycle hooks" was meant to refer to one thing.

- **Severity:** Medium (aggregate)
- **Construction:** `types.ts` does not export `IssueHooks.runReview` consistently — it is optional (`?:`) but `runAllProjects` passes it positionally to `hooks.runReview(...)` (orchestrator.ts:983) with no null check. The JSDoc on `IssueHooks` does not document the optionality.
- **Interaction:** `types.ts` is the public surface (re-exported from `index.ts`).
- **Recommendation:** Document that the file is a *protocol* surface and add a `// Cross-slice note: changes here break convex/api` line at the top.

---

### `pivot/src/orchestrator/runContract.ts`

**Originating track:** `platform_pivot_bun_convex_20260401` + `run_contract_protocol_20260415` — commit `fada3cda21`
**Phase contract (1 line):** Run-contract protocol — schemas, Convex persistence, validator for pipeline stages.

#### Node: `validateAndParse` (function, lines 44-99)
- **Severity:** High
- **Construction:** 55-line switch with 4 nearly identical cases (`architect`, `executor`, `reviewer`, `recovery`). Each case has a 3-line try with the same shape: `safeParse` → return `{action:'validated'}` or `{action:'error', error, rawOutput}`. This is a textbook table-driven refactor opportunity.
- **Interaction:** 3 in-edges (called by `validateAndPersist` and tests).
- **Recommendation:** Replace with `const schemaByStage = { architect: ArchitectOutputSchema, executor: ExecutorOutputSchema, ... }`; one `safeParse` + one return path.

#### Node: `RunContractValidationError` (class, lines 101-110)
- **Severity:** Medium
- **Construction:** Stores `stage` and `rawOutput` but the consumer in `orchestrator.ts:941-977` only reads `err.message`. The `rawOutput` field is set but unused, meaning the orchestrator discards valuable debugging context (the actual bad output that failed validation) and only logs a Zod-formatted message.
- **Interaction:** 1 in-edge + 1 out-edge (the throw in `validateAndPersist`).
- **Recommendation:** Have `orchestrator.ts` include `err.rawOutput` (truncated) in the `recoveryLog.logRecoveryEvent` call so the audit row retains the offending output.

#### Node: `deriveTaskKind` (function, lines 115-136)
- **Severity:** Medium
- **Construction:** Plan-side acceptance criteria for `dispatch_hard_constraints_20260415` and `run_contract_protocol_20260415` state "Don't default to `'feature'` — avoids false enforcement." The implementation correctly returns `'unknown'`, but the `validateExecutorEnforcement` caller (line 169) only enforces the mandatory-test rule when `taskKind === 'feature' || taskKind === 'bug'`. So an `'unknown'` task that touches source files only triggers the *plan-update* check, not the test-run check. This may be intentional ("unknown means weak enforcement"), but it is a subtle behaviour change from a track-phase spec.
- **Interaction:** 3 in-edges.
- **Recommendation:** Add a `@see` comment cross-linking to the plan's "Deviation Notes" so the next reader doesn't re-litigate the choice.

#### Node: `validateExecutorEnforcement` (function, lines 163-185)
- **Severity:** Medium
- **Construction:** Plan-side intent: "Mandatory testing violation: feature/bug task modified source files but no tests were run." Implementation: it returns a `string` (error message) but the *plan* also has this check only for tasks that *did* update `plan.md`. Currently if `hasSourceChanges && !hasPlanUpdate` is the first failure, the test-run check is short-circuited — meaning an agent that modifies source files but doesn't update `plan.md` *and* doesn't run tests passes validation, because the function returns the first message it finds. Re-read: line 173-175 returns the plan-missing message before the test check at line 178. So the test check is dead unless `hasPlanUpdate` is also true. This contradicts the spec wording "Mandatory testing violation … if no tests were run" which has no plan-update precondition.
- **Interaction:** 3 in-edges.
- **Recommendation:** Either split into two validations, or document the order. Add a test that exercises "source changed, plan updated, tests not run" (currently uncovered).

#### Node: `createRunContractIfNeeded` (function, lines 190-208)
- **Severity:** Low
- **Construction:** 4-arg positional signature is hard to read at the call site in `orchestrator.ts:209-216` and `orchestrator.ts:931-938`. No JSDoc on parameters.
- **Interaction:** 7 in-edges.
- **Recommendation:** Convert to an options object.

#### Node: `validateAndPersist` (function, lines 213-285)
- **Severity:** Medium
- **Construction:** 72 lines, switch-driven persistence for 4 stages. The `executor` branch is the only one with an enforcement step — the others are 5-line straight-through mutation calls. Strong candidate to collapse with the table-driven `validateAndParse` refactor.
- **Interaction:** 5 in-edges.
- **Recommendation:** Combine the two switches behind a `(schema, mutation, optionalValidator)` table.

#### Node: `appendDispatchRejections` (function, lines 290-300)
- **Severity:** Low
- **Construction:** Healthy. Single line of meaningful logic. Has a guard clause.
- **Interaction:** 4 in-edges.

---

### `pivot/src/orchestrator/sdkClient.ts`

**Originating track:** `fix_circuit_breaker_sla_tags_20260504` (symphony SDK migration follow-up) — commit `de960a6334`
**Phase contract (1 line):** Validate SDK responses, send prompts with timeout + max-tokens enforcement.

#### Node: `ValidatedPromptData`, `SendPromptOptions`, `PromptResult` (interfaces)
- **Severity:** Low
- **Construction:** `ValidatedPromptData` and `SendPromptOptions` and `PromptResult` are declared but only `SendPromptOptions` and `PromptResult` are exported via this file. `ValidatedPromptData` is module-private. JSDoc is present and accurate.
- **Interaction:** Internal.
- **Recommendation:** None.

#### Node: `createSession` (function, lines 36-54)
- **Severity:** Low
- **Construction:** Two manual `typeof` checks. JSDoc is present. Defensive runtime validation.
- **Interaction:** 3 in-edges.
- **Recommendation:** None.

#### Node: `validatePromptData` (function, lines 59-81)
- **Severity:** Low
- **Construction:** Healthy. Has explicit `instanceof`-style guards.
- **Interaction:** 2 in-edges.
- **Recommendation:** None.

#### Node: `extractOutput` (function, lines 86-91)
- **Severity:** Low
- **Construction:** Healthy.
- **Interaction:** 2 in-edges.
- **Recommendation:** None.

#### Node: `sendPromptToSession` (function, lines 98-188)
- **Severity:** **Critical**
- **Construction:** 90 lines, implements "flag-based, no race condition" timeout per the commit subject — but the flag pattern is `setTimeout(() => timedOut = true, timeoutMs)` (line 105-107). The `try { ... } catch (err)` at line 110-187 *clears* the timeout *after* awaiting the SDK call, but if the SDK hangs past `timeoutMs` the catch block at line 170 reads `timedOut` and returns the right error. **However** the inner `validatePromptData` and token-limit branches (lines 131-167) clear the timeout at line 120 *before* setting the flag — so a prompt that completes *just as* the timeout fires will see `timedOut === false` (because the timer hasn't yet executed its callback) and proceed to validate. The race is small but the commit subject claims it's eliminated. Recommend a "abort signal"-based approach or document the residual race window precisely.
- **Interaction:** 2 in-edges.
- **Recommendation:** Either use `AbortController` (the SDK takes a signal) or rename to `flagBasedTimeout` so the next reader doesn't believe the comment over the code.

---

### `pivot/src/orchestrator/resolver.ts`

**Originating track:** `agent_issue_autocreation_20260330` (resolver) + `symphony_pivot_20260503` (harness hooks) — commit `c670adabda` + `79ce586f18`
**Phase contract (1 line):** Resolve agent tag → SDK provider/model + harness hooks.

#### Node: `loadAgents`, `loadHarnesses` (functions, lines 23-34)
- **Severity:** Low
- **Construction:** JSDoc is one-liner only. The `as unknown as Agent[]` cast at line 25 is a Convex-generated vs. local-type mismatch — better fixed with a `Convex`-aware schema check, but acceptable for now.
- **Interaction:** 2 in-edges each.
- **Recommendation:** None.

#### Node: `resolveAgentCommand` (function, lines 41-93)
- **Severity:** Medium
- **Construction:** Returns `{ providerId: '', modelId: '' }` as a "null sentinel" (5 return paths all use this). The caller in `executor.ts:127-136` checks for both empty strings. The "empty string sentinel" is leaky: a real agent that legitimately has an empty `providerId` for some reason would be silently treated as "unresolved". The pattern is established here and repeated in `resolveHarnessHooks` (returns `{}`).
- **Interaction:** 4 in-edges.
- **Recommendation:** Return `Result<ResolvedConfig, ResolveError>` or `null` from a `Promise<ResolvedConfig | null>`. The string-sentinel is type-system-eluding.

#### Node: `resolveHarnessHooks` (function, lines 99-131)
- **Severity:** Medium
- **Construction:** Re-uses `loadAgents` and re-derives `harnessName` via the same `agent.model.indexOf('/')` parse. The whole parse logic is copy-pasted from `resolveAgentCommand` (lines 62-72) — when the model-string format changes, both must change in lockstep.
- **Interaction:** 3 in-edges.
- **Recommendation:** Extract `parseAgentModel(agent): {harnessName, modelId} | null` and call from both. Also note the `client.query(api.harnessProfiles.getProfile, ...)` is wrapped in a bare `try/catch` that swallows *all* errors and returns `{}` — the calling code at `orchestrator.ts:412-416` then has no way to distinguish "no profile" from "Convex is down".

---

### `pivot/src/orchestrator/executor.ts`

**Originating track:** `agent_issue_autocreation_20260330` (Bun runtime) + `agent_scheduling_execution_20260313` (SDK migration) — commit `c670adabda` + `b754678f9e`
**Phase contract (1 line):** Execute a task via OpenCode SDK with timeout and token enforcement.

#### Node: `estimateTokens` (function, lines 11-13)
- **Severity:** Low
- **Construction:** Naive `chars/4`. JSDoc accurate.
- **Interaction:** 2 in-edges (internal only).
- **Recommendation:** None.

#### Node: `TokenBudget` (interface, lines 15-17)
- **Severity:** Low
- **Construction:** Internal type, no JSDoc. Acceptable.
- **Interaction:** 1 in-edge.
- **Recommendation:** None.

#### Node: `readStreamWithTokenLimit` (function, lines 23-52)
- **Severity:** Medium
- **Construction:** `proc.kill()` is called when budget exhausts, but `proc.exited` is awaited outside this function (line 93). The function returns the partial `accumulated` text. JSDoc claims "kills the process if the shared token budget is exhausted" — correct, but the function is **only** used by `executeCommand` which is no longer on the agent-task path (per the function's own JSDoc at line 60-61: "This utility is retained for non-agent shell commands"). So the token-budget mechanism is dead-ish code in the production path.
- **Interaction:** 4 in-edges — but they all funnel into `executeCommand`, which is only used by `scheduler.ts::executeTaskWithEmployee` (a separate flow; see scheduler findings).
- **Recommendation:** Either delete `executeCommand`/`readStreamWithTokenLimit` or document them as a utility for "external" commands. They're not on the hot path.

#### Node: `executeCommand` (function, lines 62-105)
- **Severity:** High
- **Construction:** Acknowledged dead-ish: its own JSDoc says "Opencode agent tasks should use `executeTask`. This utility is retained for non-agent shell commands (e.g. lifecycle hooks)." But `hookRunner.ts::runHook` does NOT use `executeCommand` — it uses its own `Bun.spawn` + `proc.exited` pattern (lines 28-48). So `executeCommand` has exactly one caller in the production code (`scheduler.ts::executeTaskWithEmployee`) and that caller is itself in a flow that is not on the main orchestrator path.
- **Interaction:** 5 in-edges but the high count is inflated by tests.
- **Recommendation:** Either commit to a `nonAgentShellExec` util and use it from `hookRunner.ts`, or delete the function. The duplication with `hookRunner.ts` is concrete tech debt.

#### Node: `executeTask` (function, lines 111-204)
- **Severity:** Medium
- **Construction:** Healthy. Has `injectedOpencodeClient` DI for tests. JSDoc accurate. The mapping from `result.error.type` → `failureType` (lines 171-183) is hard-coded — the union of error types in `sdkClient.ts::PromptResult` and the failureType union in `types.ts::ExecutionResult` are not in sync: the caller assumes `'MessageOutputLengthError'`, `'ProviderAuthError'`, `'MessageAbortedError'`, `'timeout'` (SDK-defined) but doesn't import them, so a rename on the SDK side would silently break the mapping.
- **Interaction:** 9 in-edges.
- **Recommendation:** Export `SdkErrorType` from `sdkClient.ts` and use it as the source-of-truth union.

---

### `pivot/src/orchestrator/constraints.ts`

**Originating track:** `dispatch_hard_constraints_20260415` (A3) — commit `e729a3a9be`
**Phase contract (1 line):** TDD-driven hard-constraint filters for task dispatch eligibility.

**No findings for the 12 nodes** as individual units — each filter is small, single-purpose, well-typed, and covered by `constraints.test.ts` (the plan-side acceptance criterion was "constraints.ts: 100%" coverage, which the file achieves). The 12 filters are composited through `filterEligibleTasks` (lines 248-301) cleanly.

- **Severity:** Low (aggregate)
- **Construction:** `harnessAvailableForClass` and `antiAffinityFilter` both use `deriveTrackType` from `coverageEnforcement.ts` (line 4 import) to classify. That derivation returns `'feature'` for any track whose ID doesn't match the `fix_/bug/chore/cleanup` regexes — which is the OPPOSITE of the safer `runContract.ts::deriveTaskKind` (which returns `'unknown'`). Two parallel "derive kind" functions in the same slice, with opposite default behaviour. This is the same pattern that the spec flagged.
- **Interaction:** Internal to slice.
- **Recommendation:** Unify the two `deriveTaskKind`/`deriveTrackType` functions in a single helper (e.g. `deriveTaskClass`) and decide once what the safe default is.

---

### `pivot/src/orchestrator/issues.ts`

**Originating track:** `agent_issue_autocreation_20260330` (Phase 1+2) — commit `c670adabda`
**Phase contract (1 line):** Parse agent output for `` ```issue `` blocks, persist as Convex issues.

**No findings.** JSDoc present, regex is anchored correctly (`[\s\S]*?` non-greedy), error handling is graceful (skip malformed blocks with a warning), and the file is the cleanest in the slice.

---

### `pivot/src/orchestrator/logger.ts`

**Originating track:** `dispatch_scoring_v2_20260501` (`chore(foundation)`) — commit `208da4ab11`
**Phase contract (1 line):** Unified error logging to console + Convex with severity levels.

#### Node: `ErrorSeverity` (type, line 4)
- **Severity:** Low
- **Construction:** 3-element union (`'fatal' | 'warning' | 'debug'`). Note the absence of `'info'` despite `orchestrator.ts:391` and similar using bare `console.log` for informational messages. So there is a 2-tier "logged to Convex" vs "console-only" split that is undocumented. Acceptable but worth a JSDoc.
- **Interaction:** 1 in-edge.
- **Recommendation:** Document the tier split.

#### Node: `logOrchestratorError`, `consoleLogError`, `logAndCaptureError` (functions)
- **Severity:** Medium
- **Construction:** `logAndCaptureError` (the only one used by `orchestrator.ts`) calls `consoleLogError` THEN `logOrchestratorError`. If Convex is down, the user sees two logs and a console.warn-from-Convex-failure — and the order of the two "primary" events is console-first, which is fine. But the function name implies symmetry (capture + log), and the spec was "log to both" — so OK.
- **Interaction:** 6+5+6 in-edges. `logAndCaptureError` is the de-facto logging primitive of the entire slice.
- **Recommendation:** Consider a `logCaptureAndThrow(severity, ...)` for cases where the caller wants the Convex failure to bubble. Currently errors during the Convex call are caught and re-logged locally (line 35-39), losing the original `message`.

---

### `pivot/src/orchestrator/coverageEnforcement.ts`

**Originating track:** `environment_management_20260330` (`feat(coverage)` follow-up) — commit `f252d384a5`
**Phase contract (1 line):** Enforce coverage threshold for a task; emit blocker issue on violation.

**No findings** as individual nodes. `enforceCoverageThreshold` composes the helpers correctly; `deriveTrackType` is the same heuristic called out in constraints.ts (and is a candidate for unification with `runContract.ts::deriveTaskKind`).

- **Severity:** Low
- **Construction:** The thresholds (`feature:80`, `bug:90`, `chore:70`, `default:75`) are hard-coded with no override path other than `hooks.getThreshold`. If a project wants to change the threshold, they must inject a `CoverageHooks` object — there is no Convex-side setting.
- **Interaction:** Internal to slice.
- **Recommendation:** Add a Convex setting key like `coverage.thresholds.<type>` and consult it before `DEFAULT_THRESHOLDS`.

---

### `pivot/src/orchestrator/autoRunner.ts`

**Originating track:** `agent_issue_autocreation_20260330` (loop) + `continuous_orchestration_20260405` (Phase 1 interval) — commit `c670adabda` + `af6e4fe9ab`
**Phase contract (1 line):** Configure-and-tick loop for periodic orchestrator runs.

#### Node: `AutoRunner` (class, lines 12-68)
- **Severity:** Medium
- **Construction:** `tick()` at line 48 uses `setTimeout` then recursively calls `tick()` at the end of the previous tick. The `setTimeout` reference is stored in `timerId` (line 56), but on `stop()` the field is cleared *and* the `running` flag is set false — yet the closure inside the `setTimeout` callback re-checks `running` (line 57), so the recursion is correctly aborted. However, an exception thrown synchronously *before* the `setTimeout` fires (line 53) would leave `timerId = null` and `running = true` and the next tick is never scheduled. Defensive but works in practice.
- **Interaction:** 1 in-edge.
- **Recommendation:** Move the `setTimeout` outside the recursion for clarity, or use a `setInterval`-with-drift-correction pattern as the plan originally intended.

#### Node: `readIntervalMs` (function, lines 74-91)
- **Severity:** Low
- **Construction:** The `valueJson` field is parsed with `JSON.parse` but the type is `any` cast. Returns `30_000` on any failure — a long default that masks configuration errors.
- **Interaction:** 1 in-edge.
- **Recommendation:** Type `valueJson` properly. If Convex is unavailable, return a *flag* so the caller can distinguish "config 0" from "config missing".

#### Node: `runAutoRunner` (function, lines 96-130)
- **Severity:** **Critical**
- **Construction:** The `getInterval` closure at lines 107-114 is racy and incorrect: it calls `readIntervalMs().then((ms) => { cachedInterval = ms > 0 ? ms : 30_000; })` *inside* a `getInterval()` call, but the synchronous return of `getInterval` happens *before* the promise resolves. So:
  1. First tick reads the *default* `cachedInterval = 30_000`.
  2. The `.then` callback fires later, updating `cachedInterval` to whatever Convex says.
  3. The second tick reads the *Convex* value.

  This is intentional (so the loop starts immediately), but the comment "Refresh interval every tick" at line 106 is misleading — the refresh is fired-and-forgotten, and if the user changes the interval in Convex, it takes *at most one* tick to apply but *can take longer* if the promise is still pending. There is no error handling for the `.then` chain.
- **Interaction:** 1 in-edge.
- **Recommendation:** Restructure: read the interval once, then schedule with `setTimeout(readIntervalMs, run)`. Or use the planned drift-corrected `setInterval` from the continuous-orchestration plan.

---

### `pivot/src/orchestrator/recoveryDispatcher.ts`

**Originating track:** `self_healing_20260502` Phase 1+4 — commit `ae1ef78b77` / `2024c96c67`
**Phase contract (1 line):** Periodically scan in-progress tasks and emit recovery actions for stalled ones.

#### Node: `RecoveryDispatcher` (class, lines 14-93)
- **Severity:** **Critical**
- **Construction:** This is the centrepiece of the self-healing track. **It is not imported anywhere in the production code.** `orchestrator.ts` does its own circuit-breaker evaluation inline (lines 330-355) and never calls `RecoveryDispatcher.runHealthCheck()`. The `HealthCheckLoop` class (lines 95-143) is also un-imported in production code. There are unit tests for both, but the production wiring is missing.
- **Interaction:** 1 in-edge (test only).
- **Recommendation:** Either delete the dispatcher + loop (it has been superseded by inline checks in `runProject`), or wire it into the orchestrator's main tick and remove the inline checks. The `recoveryLog` API at `api.recoveryLog.logRecoveryEvent` is called from `orchestrator.ts:583, 750, 961` but the events that `RecoveryDispatcher` would emit (`'stalled' | 'recovered'`) are never set by the inline path.

#### Node: `HealthCheckLoop` (class, lines 95-143)
- **Severity:** **Critical**
- **Construction:** Same finding as above. The `setTimeout` chain (lines 120-138) has the same drift pattern as `AutoRunner` — accept-and-document. But the bigger issue is the dead-code status.
- **Interaction:** 1 in-edge (test only).
- **Recommendation:** See above.

#### Node: `RecoveryAction` (interface, lines 7-12)
- **Severity:** Medium
- **Construction:** Exported, the `'replan' | 'split'` recovery actions are referenced in `orchestrator.ts:547` — but `RecoveryDispatcher` only ever returns `'retry' | 'reroute' | 'requeue' | 'block'`. The `replan` and `split` strings are dead on the dispatcher side but live on the consumer side. This is a contract mismatch.
- **Interaction:** 1 in-edge.
- **Recommendation:** Either remove the dead cases from the orchestrator or extend the dispatcher to emit them.

---

### `pivot/src/orchestrator/continuousMode.ts`, `continuousOrchestrator.ts`, `autoPauseHandler.ts`, `concurrencyLimiter.ts`, `taskQueue.ts`, `circuitBreaker.ts`, `retryManager.ts`, `stalledDetector.ts`

**Originating track:** `continuous_orchestration_20260405` + `self_healing_20260502` (REDUNDANT) — commit `af6e4fe9ab` / `2024c96c67`
**Phase contract (1 line):** Continuous-mode loop, auto-pause, concurrency cap, priority queue, circuit breaker, retry backoff, stalled detection — all primitives for a planned continuous-mode orchestrator.

- **Severity:** **Critical** (aggregate)
- **Construction:** All 7 of these files are **dead code in production**. Each has a dedicated test file and the JSDoc/spec matches `continuous_orchestration_20260405` Phase 1-3 — but `orchestrator.ts::runProject` and `AutoRunner` use a different primitive set: `RetryManager` IS imported (line 26), but `CircuitBreaker` (the local class), `ContinuousModeManager`, `ContinuousOrchestrator`, `TaskQueue`, `ConcurrencyLimiter`, `AutoPauseHandler`, `StalledTaskDetector` are all dead. Each class has 1 in-edge from its own test file.
- **Interaction:** All have 1 in-edge (test only). None is re-exported from `index.ts`.
- **Recommendation:** This is the single biggest cleanup opportunity in the slice. Either:
  1. **Promote** `RetryManager.calculateSymphonyBackoff` (the only one in active use) and **delete** the other 6 files plus their tests. This is the simplest fix and matches the apparent intent (the new orchestrator uses different primitives).
  2. **Integrate** the dead classes into the live `runProject` flow — `ConcurrencyLimiter` for the dispatch cap, `StalledTaskDetector` to drive `RecoveryDispatcher` in the main loop, `CircuitBreaker` instead of inline Convex mutations, `TaskQueue` for the ready-queue, `ContinuousModeManager` for state, `AutoPauseHandler` for the failure-threshold logic, `ContinuousOrchestrator` as the outer loop. This is the "finish the plan" option and is the right move *if* the team still intends to ship continuous mode.

  Either way, 7 files × ~150 LOC ≈ ~1000 LOC of unused code. Pick one and commit.

- **Per-file specifics (for the `delete` path):**
  - `continuousMode.ts::ContinuousModeManager` — pure data class, no-op in production. `_state: ContinuousModeState` mirrors `types.ts:170-177` exactly. The `setIntervalMs` clamp (line 33) is good but unused.
  - `continuousOrchestrator.ts::ContinuousOrchestrator` — has its own `tick()` and `isIdle()` that duplicate `AutoRunner.tick()`. The class is *cleaner* than `AutoRunner` (one method to inspect, no closure-races) — could replace it.
  - `autoPauseHandler.ts::AutoPauseHandler` — 29 lines, depends on `ContinuousModeManager`. Vanishingly small. Easy call.
  - `concurrencyLimiter.ts::ConcurrencyLimiter` — 42 lines, `acquire/release/canExecute`. `acquire()` *throws* on capacity, which is the wrong shape for an async orchestrator (it should `await` or return a future). The API design assumes synchronous use.
  - `taskQueue.ts::TaskQueue` — 57 lines, in-place sort on every `enqueue` (O(n log n) per enqueue). Should be a binary heap.
  - `circuitBreaker.ts::CircuitBreaker` — 106 lines, self-contained. The reason it's not used is the orchestrator prefers Convex-persisted breaker state. Both are valid choices, but the in-memory class is now dead.
  - `retryManager.ts::RetryManager` — the only survivor. Used by `runProject` (line 500). Healthy.
  - `stalledDetector.ts::StalledTaskDetector` — 25 lines, in-memory only. The orchestrator doesn't use it; `RecoveryDispatcher` does, but `RecoveryDispatcher` is itself dead.

---

### `pivot/src/orchestrator/gitOrchestrator.ts`

**Originating track:** `chore_orchestrator_harness_integration_20260329` — commit `0441c0ba93`
**Phase contract (1 line):** Default and auto-push Git hooks for task lifecycle.

#### Node: `createDefaultGitHooks` (function, lines 8-83)
- **Severity:** Medium
- **Construction:** JSDoc is one line only. The function returns a `GitHooks` object with three method shapes, each ~15-20 lines, that *all* instantiate their own `GitClient` (line 13, 33, 71). The function is 75 lines. The `onTaskComplete` does work for both the commit (lines 39-47) and the cleanup (lines 53-67) in the same method — mixed concerns. The `onTaskCommit` (line 70) is a different method with overlapping logic.
- **Interaction:** 1 in-edge.
- **Recommendation:** Extract a `commitChanges(client, taskId, title, trackId)` helper used by both `onTaskComplete` and `onTaskCommit`.

#### Node: `createAutoPushGitHooks` (function, lines 88-115)
- **Severity:** Low
- **Construction:** Composes `createDefaultGitHooks` and layers `push()` on top. Pattern is good.
- **Interaction:** 2 in-edges.

---

### `pivot/src/orchestrator/hookRunner.ts`

**Originating track:** `continuous_orchestration_20260502` (symphony lifecycle hooks) — commit `79ce586f18`
**Phase contract (1 line):** Run shell hooks for Harness Profile lifecycle phases.

#### Node: `HookResult` (interface, lines 1-8)
- **Severity:** Low
- **Construction:** Healthy. Tracks `exitCode, stdout, stderr, durationMs`.
- **Interaction:** 1 in-edge.
- **Recommendation:** None.

#### Node: `HarnessHooks` (interface, lines 10-14)
- **Severity:** Medium
- **Construction:** Three optional string fields. The `runHooks` function signature (line 71) accepts `'beforeRun' | 'afterRun' | 'afterCreate'` as a `phase` literal, but if a future harness wants to add a 4th phase, both this interface and the function must change. Stringly-typed.
- **Interaction:** 1 in-edge.
- **Recommendation:** Define `export type HookPhase = 'beforeRun' | 'afterRun' | 'afterCreate';` and reuse.

#### Node: `runHook` (function, lines 20-62)
- **Severity:** Medium
- **Construction:** Has a `timeoutMs = 60_000` default and uses `setTimeout(() => { timedOut = true; proc.kill('SIGKILL'); }, timeoutMs)` (lines 36-41). When the timeout fires, `proc.kill('SIGKILL')` is called *and* the `proc.exited` promise resolves — but the `exitCode` is captured at line 47. The function then maps `timedOut` to `exitCode = -1` (line 57). However, the `stdout`/`stderr` of the killed process are still read. JSDoc says "Returns the result without throwing on non-zero exit codes" — correct. The duplicate of `executor.ts::executeCommand` is a real finding (see executor.ts).
- **Interaction:** 5 in-edges.
- **Recommendation:** Document that this is the *canonical* shell-runner for hooks; delete or deprecate `executor.ts::executeCommand`.

#### Node: `runHooks` (function, lines 69-89)
- **Severity:** Low
- **Construction:** Healthy, but the plan-side intent was "stops on first failure (non-zero exit)" — the implementation does stop on first failure but only because there is *one* hook per phase in the current design. If `HarnessHooks` ever grows to allow an array, the stop-on-first-failure semantics will be lost.
- **Interaction:** 5 in-edges.

---

### `pivot/src/orchestrator/opencodeServer.ts`

**Originating track:** `agent_scheduling_execution_20260313` (SDK migration) — commit `b754678f9e`
**Phase contract (1 line):** Persistent OpenCode SDK server lifecycle.

**No findings.** 52 lines, three well-typed exported functions, idempotency documented, server reference is module-level so callers don't need to thread it through.

---

### `pivot/src/orchestrator/scheduler.ts`

**Originating track:** `tech_debt_remediation_20260516` + `virtual_software_house_mvp_20260516` — commit `12d5693470`
**Phase contract (1 line):** Phase 4 Auto-Execution — match tasks to employees and execute.

- **Severity:** **Critical** (file-level)
- **Construction:** The whole file is the "Virtual Software House MVP" model: `Employee` entities with `skills/model/status`, `AgentTemplate` skill-matching, and a `SchedulerDeps` interface that takes `queryReadyTasks / queryActiveEmployees / queryTemplates / createRun / updateTaskStatus / appendRunOutput / executeCommand`. **None of these** map to the main `orchestrator.ts` flow — they target a different schema (`Employee` vs `Agent`, `createRun` vs `persistWorkRun`). All four node summaries are `NULL` in the graph, indicating the metadata extractor couldn't summarise them — usually a sign of unusual shape (lots of side-effect callbacks, possibly). The `runSchedulerTick` function (lines 99-144) has its own retry loop that doesn't use the Symphony backoff formula (no calls to `calculateSymphonyBackoff`). So the file implements a *parallel* scheduler that doesn't share retry semantics, doesn't use the OpenCode SDK (it uses `executeCommand` with raw CLI args), and isn't re-exported from `index.ts`.
- **Interaction:** Each node has 1 in-edge (test only). `runProject` never calls into it. `run.ts` doesn't either. `index.ts` doesn't re-export it.
- **Recommendation:** This is the "two competing schedulers" problem. The graph shows **two completely separate task-execution pipelines** in one slice:
  1. `orchestrator.ts::runProject` → `executor.ts::executeTask` → `sdkClient.ts::sendPromptToSession` → OpenCode SDK.
  2. `scheduler.ts::runSchedulerTick` → `executeTaskWithEmployee` → `executor.ts::executeCommand` → raw `opencode` CLI.

  The Phase 4 plan (`tech_debt_remediation_20260516`) is the only one introducing this file. Either the team intended to *replace* `runProject` with `runSchedulerTick` and never finished, or this is a new mode that should be wired in. The plan-review note in `symphony_pivot_20260503/plan.md` already calls out a related inconsistency ("`runProject()` still uses `DEFAULT_RETRY_CONFIG` with the legacy jittered `calculateBackoff()` path"), which is *also* the case here — `scheduler.ts::runSchedulerTick` does not use Symphony backoff.

  Critical decision needed: pick one scheduler. If `runSchedulerTick` wins, migrate `runProject` to it. If `runProject` wins, delete `scheduler.ts` and its 4-node, 144-line file + tests.

#### Per-node:

#### Node: `SchedulerDeps` (interface, lines 5-23)
- **Severity:** Medium
- **Construction:** Summary is NULL. JSDoc is missing. The shape requires 7 callbacks, two of which (`appendRunOutput`, `createRun`) have no implementation hints.
- **Interaction:** 1 in-edge.

#### Node: `matchTaskToEmployee` (function, lines 25-71)
- **Severity:** Medium
- **Construction:** Returns `null` if no employee matches; the loop in `runSchedulerTick` (line 115) `continue`s on null match. Summary NULL. The skill-overlap algorithm is O(n×m) and re-iterates `ready` for every task.
- **Interaction:** 4 in-edges (3 test + 1 caller).

#### Node: `executeTaskWithEmployee` (function, lines 73-97)
- **Severity:** High
- **Construction:** Builds a CLI args list (`--model --task --spec --system-prompt --temperature`) and calls `executeCommand('opencode', args, 600_000)`. **This is the SDK-replacement anti-pattern**: the file `opencodeServer.ts` was introduced by `agent_scheduling_execution_20260313` specifically to migrate *away* from CLI invocations. This file reverts to CLI. The `600_000` hard-coded timeout (line 91) ignores the `OrchestratorConfig.commandTimeoutMs` setting.
- **Interaction:** 5 in-edges.
- **Recommendation:** Use `executeTask` instead of `executeCommand` so the OpenCode SDK path is used. Pass `template` through to the SDK.

#### Node: `runSchedulerTick` (function, lines 99-144)
- **Severity:** High
- **Construction:** The retry loop (lines 126-136) calls `executeTaskWithEmployee` and `retryManager.shouldRetry(attempt)`. But `retryManager` is *optional* (line 101) — if it's undefined, the loop exits on the first attempt (line 132-134 break). No exponential backoff, no session continuity, no coverage enforcement, no run-contract validation. This is a stripped-down alternative orchestrator.
- **Interaction:** 3 in-edges.
- **Recommendation:** See file-level finding. Pick one scheduler.

---

### `pivot/src/orchestrator/candidates.ts`, `evaluator.ts`, `tagParser.ts`, `run.ts`, `index.ts`, `autoPauseHandler.ts`

- **`candidates.ts`:** 4 small loaders, healthy. `loadActiveProjects` and `loadProject` use `as any` casts (lines 44, 60) which is the same Convex-vs-local type drift noted in resolver.ts.
- **`evaluator.ts`:** `getBestTask` is only used as a *fallback* in `runProject` (line 282) when adaptive scoring fails. The primary scoring now lives in `policy/dispatch.ts`. JSDoc present. `buildTaskMap` is exported in the source but not re-exported by `index.ts`; grep shows no other caller — possibly dead.
- **`tagParser.ts`:** Used in `parsePlanTags` mode. JSDoc with format examples is excellent. `parseTaskLine`'s multi-line summary is unusual but readable.
- **`run.ts`:** 41-line CLI entrypoint. Healthy.
- **`index.ts`:** Exports 30+ symbols but NOT scheduler/continuous-mode/circuit-breaker/recovery classes — confirming the dual-system observation. The fact that some dead-or-orphaned symbols are *not* in `index.ts` is actually a saving grace — at least the public surface is sane. But it makes the inventory counting (142 nodes including dead ones) misleading for downstream slices.
- **`autoPauseHandler.ts`:** See continuous-mode block. Dead.

### Other files (small, no findings unless noted)
- `pivot/src/orchestrator/autoPauseHandler.ts` — dead, see continuous-mode block.
- `pivot/src/orchestrator/concurrencyLimiter.ts` — dead, see continuous-mode block.
- `pivot/src/orchestrator/taskQueue.ts` — dead, see continuous-mode block.

---

## 3. Cross-cutting patterns in this slice

1. **Two competing schedulers, neither finished.** `orchestrator.ts::runProject` (985 LOC) and `scheduler.ts::runSchedulerTick` (144 LOC) implement two separate task-execution pipelines with different retry policies, different execution mechanisms (SDK vs CLI), different schemas (Agent vs Employee), and different notification paths. The 2026-04-02 SDK migration (`agent_scheduling_execution_20260313`) deprecated the CLI path; `scheduler.ts` reintroduces it. 5+ Critical and High findings trace back to this.

2. **Self-healing and continuous-mode primitives are orphans.** `RecoveryDispatcher`, `HealthCheckLoop`, `StalledTaskDetector`, `CircuitBreaker` (class), `ContinuousModeManager`, `ContinuousOrchestrator`, `TaskQueue`, `ConcurrencyLimiter`, `AutoPauseHandler` are unit-tested but un-imported in production. ~1000 LOC plus ~9 test files could be deleted with no behavioural change. The `recoveryLog` API is called from `orchestrator.ts` (3 sites) but with manually-built event strings instead of using `RecoveryDispatcher`.

3. **WAL-wrap is hand-rolled 3 times.** `appendLog`, `persistWorkRun`, and `updateTaskStatus` (orchestrator.ts:59-139) all do `walAppend → try { mutation } → walCommit | console.warn` with the same shape. A 6-line `withWal(client, target, args)` helper would dedupe.

4. **`deriveTaskKind` / `deriveTrackType` are duplicated and inconsistent.** `runContract.ts::deriveTaskKind` defaults to `'unknown'`, `coverageEnforcement.ts::deriveTrackType` defaults to `'feature'`, and `constraints.ts` re-uses `coverageEnforcement.ts::deriveTrackType` (so also defaults to `'feature'`). This means a `chore_` track task whose ID doesn't match the regex will be classified as `feature` in constraints but `unknown` in run-contract. The choice of safe default is per-file, not per-system.

5. **JSDoc coverage is uneven but improving.** Recent files (runContract.ts, sdkClient.ts, orchestrator.ts internal) have JSDoc on most exports. Older files (`candidates.ts`, `evaluator.ts`, `constraints.ts`) have minimal JSDoc but the type signatures carry most of the meaning. `scheduler.ts` has *zero* JSDoc and *zero* graph summaries — the entire file is undocumented in the index.

6. **`as any` casts on Convex query results.** `candidates.ts` lines 44, 60 use `as any`; `resolver.ts` uses `as unknown as Agent[]`. The same pattern recurs 4+ times. The drift is silently propagating.

7. **TDD was followed for hard constraints but not for the rest.** `dispatch_hard_constraints_20260415` explicitly demands TDD with 100% coverage on `constraints.ts`, and the file delivers. `symphony_pivot_20260503` and `continuous_orchestration_20260405` did not have TDD, and the dead-code patterns above are the result.

---

## 4. Top-10 improvement queue

| # | Node | Severity | Effort | Why |
|---|------|----------|--------|-----|
| 1 | `runProject` (orchestrator.ts:153-1137) | Critical | L | 985 LOC, ~10 duplicate WAL-wraps, inconsistent timing-field population; refactor into pipeline stages. Single biggest maintenance risk in the slice. |
| 2 | `runAutoRunner` (autoRunner.ts:96-130) | Critical | S | The closure-based interval refresh is racy and untested. Fix the read-side, then add a regression test. |
| 3 | `sendPromptToSession` (sdkClient.ts:98-188) | Critical | S | The commit claims "no race condition" but the timeout flag has a small residual race. Either use AbortController or rename + document. |
| 4 | `RecoveryDispatcher` / `HealthCheckLoop` / continuous-mode classes (7 files) | Critical | M | Either delete or wire in. ~1000 LOC + ~9 test files worth. Pick one path and commit; current state is a maintenance sink. |
| 5 | `scheduler.ts` whole file | Critical | M | Two schedulers in one slice. Pick one. If `runProject` wins, delete; if `runSchedulerTick` wins, migrate and use Symphony backoff + SDK path. |
| 6 | `validateAndParse` (runContract.ts:44-99) | High | S | 4-case switch is begging for a table-driven refactor. 1-2h cleanup. |
| 7 | `executeCommand` (executor.ts:62-105) | High | S | Either delete or use from `hookRunner.ts` instead of the duplicated `runHook` shell pattern. |
| 8 | `updateTaskStatus` (orchestrator.ts:116-139) | High | S | String-literal cast masks a type-system gap with the Convex `upsertTask` signature. Use the generated type. |
| 9 | `executeTaskWithEmployee` (scheduler.ts:73-97) | High | S | Reverts the SDK migration by calling `executeCommand('opencode', ...)`. Use `executeTask` from `executor.ts`. |
| 10 | `deriveTaskKind` / `deriveTrackType` consolidation | Medium | M | Three parallel "classify a track ID" functions in the slice. Unify behind one helper with a single, documented default. |

---

## 5. Track ↔ Implementation diffs

| Track | Phase | What spec said | What code does | Impact |
|-------|-------|---------------|----------------|--------|
| `dispatch_hard_constraints_20260415` | Phase 3 (Orchestrator Integration) | "Wire `filterEligibleTasks` into dispatch flow. Reduce dispatcher prompt to tie-break/justification. Persist rejections into `runContract.dispatchRejections`." | All three items are present. The `appendDispatchRejections` function exists and is called. | Match. |
| `symphony_pivot_20260503` | Phase 2 (Orchestrator Retries & Hooks) — post-review note | "`calculateSymphonyBackoff()` exists, but `runProject()` still uses `DEFAULT_RETRY_CONFIG` with the legacy jittered `calculateBackoff()` path." | Confirmed: `orchestrator.ts:500-505` builds a `RetryManager` from `config` (which defaults to `DEFAULT_CONFIG` — note: NOT `SYMPHONY_RETRY_CONFIG`). The retry manager exposes both `calculateSymphonyBackoff` and `calculateBackoff`; `runProject` calls only the former (line 577). So the post-review note is stale — the fix is in. | Resolved (no current drift). |
| `symphony_pivot_20260503` | Phase 2 | "Implement `before_run`, `after_run`, `after_create` hooks in Harness Profiles." | `hookRunner.ts` exists, `resolveHarnessHooks` populates them, `runProject` invokes them. | Match. |
| `self_healing_20260502` (REDUNDANT) | Phase 1 (Stalled Detection) | "Transition stalled tasks to failed with reason='stalled' or reason='hook_timeout'. Log stall detection to executionLogs and recoveryLog." | `RecoveryDispatcher.detectStalled` exists but is never called by `runProject`. The `recoveryLog.logRecoveryEvent` call site in `runProject:583` uses eventType `'retry'`, not `'stalled'`. So stalled tasks are not transitioned to `failed`; they are re-dispatched. | **Drift**: stalled path not implemented in production. Inline circuit-breaker is the only recovery. |
| `self_healing_20260502` (REDUNDANT) | Phase 2 (Auto-Retry with Symphony Backoff) | "Consume existing `RetryManager` class from `pivot/src/orchestrator/retryManager.ts` — do NOT create a new retry manager." | `runProject` consumes `RetryManager` correctly. | Match. |
| `self_healing_20260502` (REDUNDANT) | Phase 3 (Auto-Issue Creation) | "Implement auto-issue creation when task retryCount >= maxRetries." | Done in `runProject:702-725` via `hooks.createBlocker` or `createBlockerIssue`. | Match. |
| `continuous_orchestration_20260405` | Phase 1 (Continuous Mode State) | "Define `ContinuousModeState` type in `pivot/src/orchestrator/types.ts` with `enabled`, `state` (running/paused/idle), `intervalMs`, `consecutiveFailures`, `maxConcurrent` fields." | Type defined; class `ContinuousModeManager` defined; `AutoPauseHandler` defined. But `runProject` does not use them. | **Drift**: 3 of 4 primitives defined and unused. |
| `continuous_orchestration_20260405` | Phase 2 (Idle Detection) | "Implement `startContinuousLoop()` in `pivot/src/orchestrator/autoRunner.ts` using `setInterval`." | `AutoRunner.start()` uses recursive `setTimeout`, not `setInterval`. The plan explicitly said `setInterval`; the implementation uses `setTimeout` (which is arguably better for drift correction, but it's not what was asked). | **Drift**: setTimeout vs setInterval. |
| `continuous_orchestration_20260405` | Phase 3 (Queue Management) | "Implement task queue with priority ordering (critical > high > medium > low, FIFO tie-break)." | `TaskQueue` is implemented exactly to spec (with the same priority keywords) but unused. | **Drift**: implemented but not integrated. |
| `dispatch_scoring_v2_20260501` | Phase 1 (Starvation Scoring) | "Add `lastDispatchAttemptAt` field." | Field present in `types.ts::Task` (line 28). | Match. |
| `platform_pivot_bun_convex_20260401` | Phase 5 (Replace Core Runtime Slices) | "Deliver one vertical slice reading/writing through Convex and served by Bun." | Done. | Match. |
| `agent_issue_autocreation_20260330` | Phase 1-2 (Issue Output Format and Parser, Hook into Post-Execution Flow) | "Parse agent output for `\`\`\`issue` blocks; auto-create issues." | Done in `issues.ts`. | Match. |
| `notification_system_20260502` | Phase 2 (Event Triggers) | "Wire task completion → notification (assigned user / project owner). Wire `HookResult.exitCode !== 0` → `hook_failure` notification. Wire session resumption on retry → `session_resumed` notification (debug channel, opt-in)." | All three wirings present in `runProject` (lines 1075-1098, 442-451, 482-491, 633-641). | Match. |
| `tech_debt_remediation_20260516` | Phase 1 (Test Infrastructure Foundation) | "Align fixture Task type with orchestrator Task type." | Done. | Match. |
| `tech_debt_remediation_20260516` | Phase 4 (Scheduler Service) | "Implement SchedulerService class with interval/loop execution. Implement setTimeout/setInterval-based execution with cancellation." | Implemented as `scheduler.ts::runSchedulerTick` + `scheduler.ts::matchTaskToEmployee`, *not* the original `SchedulerService` class. | **Drift**: plan asked for SchedulerService class; implementation is a stand-alone `runSchedulerTick` function. |
| `run_contract_protocol_20260415` (alternative candidate) | Phase 1+2 (Schemas, Convex persistence, validator) | "Run contract protocol Phase 1+2." | All four stages (`architect`, `executor`, `reviewer`, `recovery`) have schemas, validators, and persistence mutations. | Match. |
| `agent_scheduling_execution_20260313` (subject: "Migrate opencode agent execution to @opencode-ai/sdk") | Phase 1 (Migration) | "Migrate opencode agent execution to @opencode-ai/sdk." | `opencodeServer.ts`, `sdkClient.ts::sendPromptToSession`, `executor.ts::executeTask` all use the SDK. But `scheduler.ts::executeTaskWithEmployee` (introduced later, 2026-05-16) reverts to CLI invocation via `executeCommand('opencode', ...)`. | **Drift**: scheduler.ts reintroduces the CLI path that the track deprecated. |

**Cross-cutting drift summary**: 4 tracks (`self_healing_20260502`, `continuous_orchestration_20260405`, `tech_debt_remediation_20260516`, and the SDK migration's later rollback) collectively produced ~2000 LOC of un-integrated code. The plan-mode discipline was reasonable (each plan delivered what it asked for) but the *integration* of the plans into `runProject` was never finished.

---

**Items the synthesis pass should know:**

1. The 4 Critical findings all reduce to two root causes: (a) `runProject` is a monolith absorbing inline logic that was supposed to live in dedicated classes; (b) the `self_healing_20260502` and `continuous_orchestration_20260405` plans were declared "REDUNDANT" in `measure/archive/`, which may explain why the integration was skipped.
2. `recoveryDispatcher.ts` and `healthCheckLoop` (and the 6 other dead primitives) share an edge-count signature: each has 1 in-edge from its own test file. This is a *measurable* signal of dead code and could be added to the build-graph CI as a "test-only caller" rule.
3. The plan's "dual track id → task class" derivation (constraint vs runContract vs coverageEnforcement) is the kind of subtle inconsistency that bites only at runtime, when a `chore_` track task gets default-classified as `feature` in one path and `unknown` in another.
4. `runProject`'s session-continuity logic at lines 540-562 clears `sessionId` on `replan` or `split` recovery actions, but those action types are never emitted by the (dead) `RecoveryDispatcher`. The only consumer is `executeTask` at lines 611-617 which checks `lastResult.sessionId === task.sessionId` — but the cleanup is invoked only on `previousRecoveryAction === 'replan' | 'split'`, and the field starts undefined. So in practice the cleanup is dead defensive code. Confirm before removing.
5. The two schedulers (runProject vs runSchedulerTick) use different config defaults (`runProject` uses `DEFAULT_CONFIG` and `runProject` passes `commandTimeoutMs` to `executeTask`; `runSchedulerTick` hard-codes `600_000`). If a future track picks one, the timeout path needs to be re-checked.

---

**End of slice-1-pivot-orchestrator audit.**

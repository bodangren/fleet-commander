# Plan: Orchestrator Core Hardening (Audit 2026-06-10)

_Blast-radius note: build-graph `callers` returned no cross-file caller
edges (per TD-240 the graph tracks `imports`/`calls` but not in-file
calls). For blast-radius purposes the per-phase notes below use
`build-graph search` + `grep -r` on the symbol name._

## Phase 1: Foundation — Context Payload, Telemetry, Real Cost
_Closes FR-2, FR-4, FR-1 in dependency order. TDD order (Contract → Test → Implement → Doctor) holds within each sub-phase._

### Sub-phase 1A: Track context (FR-2)
- [ ] Task: Add `convex/tracks.ts::getTrackContext` query (args: `{ trackId }`, returns `{ title, specMarkdown, planMarkdown }`); add unit test `convex/tracks.test.ts` covering the query and the "track not found" branch.
- [ ] Task: Add `pivot/src/config/index.ts::orchestrator.contextMaxChars` (default `16000`, env `ORCHESTRATOR_CONTEXT_MAX_CHARS`).
- [ ] Task: Red-phase test: capture `executeTask` call args in `pivot/src/orchestrator/stages/executeWithRetry.test.ts` and assert the prompt string contains `# Specification` and `# Implementation Plan` followed by the seeded markdown.
- [ ] Task: Green-phase: extend `loadAndFilterTasks` to also call `getTrackContext` for the selected task's `trackId`; thread `taskContext` through `selectCandidate` → `executeWithRetry`; build the prompt as `# Task: {title}\n# Specification\n{spec}\n# Implementation Plan\n{plan}\n` with a `[truncated]` tail if it exceeds `contextMaxChars`. Update `ExecuteFn` type to accept `taskContext`.
- [ ] Task: `build-graph update ./graph.db pivot/src/orchestrator/stages/executeWithRetry.ts pivot/src/config/index.ts convex/tracks.ts`.

### Sub-phase 1B: Token & cost telemetry (FR-4)
- [ ] Task: Extend `pivot/src/orchestrator/types.ts::ExecutionResult` with optional `inputTokens: number` and `outputTokens: number`. Update all producers and consumers in the orchestrator pipeline.
- [ ] Task: Red-phase test in `pivot/src/orchestrator/executor.test.ts`: mock `sendPromptToSession` to return `{ output, sessionId, tokensUsed: 600 }`, assert `executeTask` returns `inputTokens ≈ estimateTokens(promptText)` and `outputTokens ≈ 600 - inputTokens`.
- [ ] Task: Green-phase: in `executor.ts:210-217`, populate the new fields. Add a `recordCostForRun` step in `handleSuccess` (or inline in the success branch) that calls `api.costs.recordCost`. On failure, skip the call and log a debug line.
- [ ] Task: Red-phase test in `pivot/src/orchestrator/stages/handleSuccess.test.ts`: mock the Convex `recordCost` mutation; on a successful execution with `inputTokens > 0`, assert exactly one call with the right `model`, `inputTokens`, `outputTokens`, `agentId`, and `projectSlug`.
- [ ] Task: `build-graph update ./graph.db pivot/src/orchestrator/executor.ts pivot/src/orchestrator/types.ts pivot/src/orchestrator/stages/handleSuccess.ts`.

### Sub-phase 1C: Real cost reconciliation (FR-1)
- [ ] Task: Red-phase test in `pivot/src/orchestrator/orchestrator.test.ts`: mock the Convex `recordCost` mutation to return `{ costRecordId, costUSD: 0.42, sessionCostSaved: 0 }`; run a successful task; assert the 4th arg to `reconcileBudgetOnComplete` at line 209 is `0.42` (within $0.01), and the failure-path call at line 179 falls back to `0.10` (the reserved estimate).
- [ ] Task: Green-phase: refactor `runProject` to thread the `costUSD` from `recordCost` (via `handleSuccess`) into the success-path `reconcileBudgetOnComplete` call. On the failure path, pass `ESTIMATED_COST_PER_DISPATCH` instead of `0`.
- [ ] Task: Verify `pivot test` runtime regression ≤ 10% (record in baselines).
- [ ] Task: `build-graph update ./graph.db pivot/src/orchestrator/orchestrator.ts`.

### Phase 1 Baselines (to be recorded)
- `pivot test` pre-Phase-1: TBD.
- `pivot typecheck` pre-Phase-1: TBD.
- New tests added: ≥ 4 (one per sub-phase + truncation + token-split clamp).
- Blast radius: `reconcileBudgetOnComplete` (2 callers in `orchestrator.ts:179,209` — both updated); `recordCost` (0 pivot callers → 1 new caller in `handleSuccess` after 1B); `tracks.getTrackContext` (NEW → 1 caller in `loadAndFilterTasks` after 1A).

## Phase 2: Race-Free Dispatch (FR-5) + TD-213 Sweep
- [ ] Task: Add `convex/tasks.ts::claimTaskForExecution` mutation (args: `{ projectSlug, trackId, taskKey, expectedStatus }`, returns `{ claimed, currentStatus? }`). Implementation: `ctx.db.query('tasks').withIndex(...)`, check `status === expectedStatus`, `ctx.db.patch` to `in_progress` writing `claimedAt`, `claimedByRunId`. Reject the patch if the row was changed between read and write (re-read inside the same transaction).
- [ ] Task: Red-phase test `convex/tasks.test.ts` (new): seed one task in `ready`; fire 50 concurrent claims via `Promise.all`; assert exactly 1 `claimed: true`, 49 `claimed: false`, and the row's final `status` is `in_progress` with `claimedByRunId` set.
- [ ] Task: Red-phase test in `pivot/src/orchestrator/orchestrator.test.ts`: the existing "happy path" test must still pass after we replace `updateTaskStatus('in_progress')` at line 127 with the new `claimTaskForExecution` call.
- [ ] Task: Green-phase: in `runProject`, immediately after `selectCandidate` returns, call `claimTaskForExecution({ ..., expectedStatus: 'ready' })` and short-circuit on `!claimed`. Remove the old `updateTaskStatus(..., 'in_progress')` call at line 127 (now redundant). The same `reservationId` is still used for the budget side.
- [ ] Task: **TD-213 audit:** inspect `pivot/src/orchestrator/worktreeManager.ts` and `pivot/src/orchestrator/dispatchPacer.ts`. Decide per the `dual_implementations` lesson: wire `DispatchPacer` into `selectCandidate` (per-agent rate-limit, e.g., "no more than N dispatches per agent per minute") AND wire `WorktreeManager` into `onTaskStart` (per-task worktree), or `git rm` both files plus their test files and remove the dead exports from `index.ts`. Whichever path is taken, add a commit that closes TD-213.
- [ ] Task: `build-graph update ./graph.db` for every changed file.

### Phase 2 Baselines
- Concurrent-claim test: 1/50 success rate on the same `taskKey`.
- `orchestrator_decomposition`'s `orchestrator.characterization.test.ts` (10 tests) must remain green.
- Blast radius: `runProject` (caller count unchanged); `selectCandidate` (1 caller in `orchestrator.ts:80` — unchanged); `updateTaskStatus` (still used by retry/session paths — unchanged).

## Phase 3: Real Branch Merge (FR-3)
- [ ] Task: Add `PivotConfig.git.defaultBranch` to `pivot/src/config/index.ts` (default `'main'`, env `GIT_DEFAULT_BRANCH`). Update the `PivotConfig.git` type and the `parseStringEnv` helper.
- [ ] Task: Add `GitClient.merge({ sourceBranch, targetBranch, strategy })` to `pivot/src/git/client.ts`. Implementation: `git checkout {targetBranch}` → `git merge {flag} {sourceBranch}` where flag is `--squash` or `--no-ff` → on exit 0 return `{ exitCode, stderr }`. On non-zero exit, throw a typed `MergeConflictError` extending `Error` with `code: 'CONFLICT'` and the captured stderr. Add `pivot/src/git/client.merge.test.ts` covering: clean merge, conflict (return code 1, stderr contains "CONFLICT"), invalid strategy (TypeError).
- [ ] Task: Extend `GitHooks.onTaskComplete` with a new optional `shouldCleanupBranch?: boolean` parameter (default `true` for backward compat). Update `createDefaultGitHooks` and `createAutoPushGitHooks` in `pivot/src/orchestrator/gitOrchestrator.ts` to honor it.
- [ ] Task: Red-phase test in `pivot/src/orchestrator/stages/handleSuccess.test.ts`: for a `dispatchStage === 'merger'` task with a successful `lastResult`, assert the merger stage: (a) calls `git.checkout(defaultBranch)`, (b) calls `git.merge({ sourceBranch: branchName, strategy: 'squash' })`, (c) calls `git.commit(...)` with a message containing the task key, and (d) calls `git.deleteBranch(branchName)` with `shouldCleanupBranch: true` only on the merger stage. Currently the code does (c)+(d) but skips (a)+(b) — Red.
- [ ] Task: Green-phase: in `handleSuccess.ts:250-254`, replace the no-op status transition with the full merger sequence; pass `shouldCleanupBranch: false` from the executor stage's `onTaskComplete` call (modify the call site at line 294-303), and `shouldCleanupBranch: true` from the merger stage.
- [ ] Task: `build-graph update ./graph.db` for the changed files.

### Phase 3 Baselines
- Blast radius: `GitClient` (caller count grows by 1: `handleSuccess` merger branch → 1 new caller); `onTaskComplete` (already in 2 `gitOrchestrator` factories — signature change, both call sites updated in this phase); `onTaskStart` (unchanged).
- `gitOrchestrator.merge.test.ts`: 3 tests, all green.
- `pivot test`: zero regression.

## Phase 4: Server Wiring (FR-6) + TD-209 Closure
- [ ] Task: Red-phase test in a new `pivot/src/server.autoRunner.test.ts`: import `server.ts` after setting `continuousMode.enabled = true` in the Convex mock; assert `AutoRunner` is constructed once and `.start()` is called. (For testability, expose the `AutoRunner` instance via a test-only getter, or use a side-effect log.)
- [ ] Task: Green-phase: in `pivot/src/server.ts:117-121`, add `const autoRunner = new AutoRunner(() => readIntervalMs());` and `autoRunner.start();`. Inside `runAutoRunner` / `AutoRunner.tick`, read `api.continuousMode.getContinuousModeStatus`; if `enabled === false`, return without running `runAllProjects`. (Refactor `runAutoRunner` into a method that takes a `getContinuousModeStatus` injectable.)
- [ ] Task: Test that flipping `enabled` from `true` to `false` mid-tick stops further dispatches without crashing the in-flight work.
- [ ] Task: **TD-209 closure:** move the TD-209 row to `measure/tech-debt.md::Resolved (this review)` with the closing commit SHA. Update the comment in `pivot/src/orchestrator/autoRunner.ts` to reflect that the runner is now in the production hot path.
- [ ] Task: `build-graph update ./graph.db` for `server.ts` and `autoRunner.ts`.

### Phase 4 Baselines
- Blast radius: `AutoRunner` (was 0 prod callers, 1 test-only caller at `run.ts:37` — CLI entry preserved for cron) → 1 new production caller in `server.ts`.
- `server.autoRunner.test.ts`: ≥ 2 tests, all green.

## Phase 5: Verification & Closeout
- [ ] Task: Run `bun --cwd pivot test`; require all green (record pass/fail counts).
- [ ] Task: Run `bun --cwd pivot typecheck`; require all green.
- [ ] Task: Run `bun --cwd frontend check`; require all green.
- [ ] Task: Run `bun --cwd convex test`; require all green.
- [ ] Task: Run `npm run lint`; require all green.
- [ ] Task: Run `measure/verify.sh`; require exit 0.
- [ ] Task: Run `measure/doctor.sh all`; require zero new `as-any`, zero new `status-vocab` violations, and `orphans` clean for any new exports.
- [ ] Task: Run `build-graph update ./graph.db` for any final files; record final `build-graph stats` totals.
- [ ] Task: **TD-213 final closure** (if Phase 2 chose the "delete" path): remove `WorktreeManager` and `DispatchPacer` from `pivot/src/orchestrator/index.ts` exports; move TD-213 to `Resolved (this review)`. If Phase 2 chose the "wire" path: confirm both modules are now reachable from production imports and add a test that exercises that path.
- [ ] Task: Commit final graph update, push, and confirm `tracks.md` reflects `[x]` only on green.

## Review Verification (post-Phase 5)
- [ ] Task: Re-run all six FR ACs end-to-end; record evidence (test output, Convex row screenshots, git log excerpts) in this section.

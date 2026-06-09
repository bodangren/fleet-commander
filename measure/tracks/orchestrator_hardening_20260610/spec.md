# Spec: Orchestrator Core Hardening (Audit 2026-06-10)

## Problem

The Fleet Commander orchestrator — the engine that dispatches AI agents
against sprint tasks — has six execution holes that prevent the product's
"virtual software house" promise from being realized. A 2026-06-10
architectural review confirmed each one against the source.

1. **Ghost Budget.** `pivot/src/orchestrator/orchestrator.ts:179` and
   `:209` call `reconcileBudgetOnComplete(..., 0)`. The 4th arg
   (`actualCost`) is hardcoded to `0`, so every `$0.10` reserved at dispatch
   (`pivot/src/orchestrator/stages/budgetReservation.ts:14`) is fully
   refunded on completion. Sprints will never exhaust their cap.
2. **Context-Free Agent.** `pivot/src/orchestrator/stages/executeWithRetry.ts:85-102`
   passes `task.title` as the 3rd arg (the prompt) to `executeTask`. The
   parent track's `specMarkdown` / `planMarkdown` (stored at
   `convex/tracks.ts:12-13`) are never loaded into the agent's context
   window. Agents hallucinate because they don't know what they're
   supposed to build.
3. **Non-Merging Merger.** `pivot/src/git/client.ts` has no `merge()`
   method. `pivot/src/orchestrator/gitOrchestrator.ts:32-68`
   (`onTaskComplete`) commits the work and then deletes the feature
   branch with no merge. The `dispatchStage === 'merger'` branch in
   `handleSuccess.ts:250-254` is a no-op status transition.
4. **Missing Telemetry.** `pivot/src/orchestrator/executor.ts:210-217`
   returns `ExecutionResult` with no `tokensUsed`, discarding the value
   computed at `sdkClient.ts:140-141,167`. `convex/costs.ts:9` defines
   `recordCost` (a fully-tested mutation that updates `costRecords` and
   `budgets.spent` with threshold alerts), but `grep -r "recordCost"
   pivot/src/` returns **zero** production callers. The Cost per Story
   Point, Agent Efficiency, and ROI dashboards are downstream of a
   never-called mutation.
5. **Racy Dispatch.** `pivot/src/orchestrator/orchestrator.ts:80-85`
   calls `selectCandidate` (read-only), then `:113` reserves budget,
   then `:127` finally writes `in_progress` status. The window between
   candidate selection and status transition lets a concurrent runner
   pick the same task. Budget reservation protects the budget cap, not
   the task claim.
6. **Hidden Scheduler.** `pivot/src/server.ts:117-121` starts
   `PolicyStatsScheduler` and `RetrospectiveScheduler` but never
   instantiates `AutoRunner`. The runner is only bootstrapped by the
   separate CLI entry `pivot/src/orchestrator/run.ts:37`. The
   continuous-mode UI writes `api.continuousMode.setContinuousMode` but
   no server-side handler reads it — the toggle is decorative.

Two related tech-debt items close in this track (per the
`dual_implementations` / `dead_code` lessons-learned entries):

- **TD-209** — "Recovery/continuous-mode orchestrator exports are
  tested but dead in production." Direct root cause is #6.
- **TD-213** — "WorktreeManager and DispatchPacer are exported but
  never instantiated." Adjacent to #5 (DispatchPacer is the obvious
  rate-limiter to pair with the new atomic claim).

## Solution

Close all six holes in their natural dependency order:

1. **FR-2:** Add a `tracks.getTrackContext` query and load the parent
   track's `specMarkdown` + `planMarkdown` into a `taskContext`
   parameter that is prepended to every agent prompt (capped at 16k
   chars, configurable).
2. **FR-4:** Extend `ExecutionResult` with `inputTokens` /
   `outputTokens`, populate from the SDK response (input =
   `estimateTokens(promptText)`, output = `tokensUsed - inputTokens`),
   and call `api.costs.recordCost` from `handleSuccess` on success.
3. **FR-1:** Replace the hardcoded `0` at `orchestrator.ts:179` and
   `:209` with the `costUSD` returned by `recordCost` (FR-4); on
   failure, fall back to the reserved estimate.
4. **FR-5:** Add a Convex `tasks.claimTaskForExecution` mutation with
   a compare-and-set on `status === 'ready'`. Replace the
   `selectCandidate` → `updateTaskStatus('in_progress')` two-step with
   one atomic call. Audit `WorktreeManager` and `DispatchPacer`
   (TD-213): wire `DispatchPacer` into `selectCandidate` as a
   rate-limiter, or delete it with `git rm` and remove its tests.
5. **FR-3:** Add `GitClient.merge({ sourceBranch, targetBranch,
   strategy })` (squash / no-ff). The Merger dispatch stage checks out
   the configured `git.defaultBranch` (default `main`, env
   `GIT_DEFAULT_BRANCH`), squash-merges the feature branch, commits,
   and only then deletes the branch. Gate `onTaskComplete`'s
   branch-deletion block on a new `shouldCleanupBranch` flag.
6. **FR-6:** Instantiate `AutoRunner` in `server.ts` alongside the
   other schedulers. Each tick reads
   `api.continuousMode.getContinuousModeStatus`; run only when
   `enabled === true`. Resolves TD-209.

## Acceptance Criteria

- [ ] **AC-1 (FR-1):** Running the orchestrator against a seeded sprint
      with a `$100` cap, with 5 successive dispatches on `gpt-4o` with
      ~500-token output each, increases `budgets.spent` by
      approximately the cumulative `costUSD` (within 5%).
- [ ] **AC-2 (FR-2):** A captured `executeTask` call in a test (using
      `vi.fn()`) shows a prompt containing the seeded track's
      `specMarkdown` and `planMarkdown` substrings, truncated to ≤
      `orchestrator.contextMaxChars`.
- [ ] **AC-3 (FR-3):** A review-status task with a configured
      `mergerId` whose `dispatchStage` is `merger` ends with the parent
      branch (default `main`) containing a squash commit whose message
      includes the task key, and the feature branch deleted.
- [ ] **AC-4 (FR-4):** After a successful run, `costRecords` has a row
      with `inputTokens`, `outputTokens`, `costUSD > 0`, `model`
      matching the resolved harness's model, and the project's
      `budgets.spent` has been incremented by exactly that `costUSD`.
- [ ] **AC-5 (FR-5):** A test firing 50 concurrent
      `claimTaskForExecution` calls for the same `taskKey` returns
      exactly 1 `claimed: true` and 49 `claimed: false`.
- [ ] **AC-6 (FR-6):** With `continuousMode.enabled = false`, starting
      `pivot/src/server.ts` does not invoke `runAllProjects` within a
      5-second observation window. With `enabled = true`, it does.
- [ ] **AC-7 (TD-209, TD-213):** Both TD entries moved to the
      `Resolved (this review)` table in `measure/tech-debt.md` with
      the closing commit SHAs.
- [ ] **AC-8 (Closeout):** `measure/verify.sh` is green at HEAD; new
      exports are not added to the orphans list; `as-any` and
      `status-vocab` doctor checks are at their pre-track counts or
      below; `build-graph update` has been run for every changed file.

## Out of Scope

- Replacing the squash-merge with PR-based delivery (PRs remain an
  option per-agent but not the default; merging is automatic).
- Further decomposition of `runProject` (owned by
  `orchestrator_decomposition_20260605`).
- Migrating `convex/scheduler.ts` / `employees.ts` / `runs.ts` legacy
  parallel subsystems (TD-247 is owned separately; this track does
  not touch them).
- Building a UI surface for inspecting per-task context payloads (the
  spec is loaded for the agent; surfacing it to humans is a future
  feature).
- Adding new per-agent context-depth configuration (defaults only;
  per-agent tuning deferred to a separate feature track).
- Performance optimization of the new `recordCost` /
  `getTrackContext` round-trips beyond the NFR-3 10% test-runtime
  budget.

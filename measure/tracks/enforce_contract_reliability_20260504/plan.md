# Implementation Plan — Enforce Contract Reliability Constraints

## Phase 1: Schema Updates (Convex)
- [~] Update `runContractEntry` in `convex/runContracts.ts` and `schema.ts`:
  - Add `maxExecutionMs: v.optional(v.number())`
  - Add `maxTokens: v.optional(v.number())`
- [~] Update `appendReviewerOutput` schema and logic:
  - Add `resolvedAssumptions: v.optional(v.boolean())`
- [~] Fix `TD-032`: In `pivot/src/policy/rollup.ts`, remove the incorrect mapping of `executorConfidence` to `meanDurationMs`.
- [ ] Run `npx convex dev` to regenerate `_generated/api.d.ts` and `api.js`.
  > **Review finding:** Code was implemented in working tree but not committed. `_generated/api.d.ts` was manually edited instead.

## Phase 2: Validator Enforcement (Orchestrator/Bun)
- [~] In `pivot/src/orchestrator/runContract.ts`, update the pre-submission validator:
  - Enforce "Measure Workflow": If `changedFiles` includes files in `src/`, `pivot/`, or `frontend/`, it MUST also include a modification to `measure/tracks/<track_id>/plan.md`. Reject with `recoveryAction: human_review` if violated.
  - Enforce Mandatory Testing: If the task type (inferred from `taskId` heuristics) is `feat` or `bug`, and non-test source files are changed, `executorTestsRun` MUST NOT be empty.
  > **Review finding:** `isSourceFile` misses `convex/` and `measure/` directories. `deriveTaskKind` is fragile for UUID-style task IDs.

## Phase 3: Prompt & Agent Updates
- [~] Update Reviewer Agent Prompt:
  - Inject `architectAssumptions` and `executorUnresolvedAssumptions`.
  - Require the agent to explicitly state whether those assumptions were validated by setting `resolvedAssumptions: true` or `false`.

## Phase 4: Harness/SLA Enforcement & Session Continuity
- [~] Pass `maxExecutionMs` and `maxTokens` to the execution wrapper (`pivot/src/orchestrator/executor.ts`). Ensure the process is forcefully killed if it exceeds these bounds.
  > **Review finding:** Token limit is enforced per-stream, not globally across stdout+stderr.
- [ ] Implement Circuit Breaker tripping if SLA limits are hit (using `recordCircuitFailure` from `convex/circuitBreakers.ts`).
  > **Review finding:** Generic failure path is reused; no SLA-specific tagging.
- [~] In the dispatcher logic handling recovery events, enforce `sessionId` rules:
  - If previous action was `retry`, ensure the exact same `sessionId` is passed to Opencode.
  - If previous action was `replan` or `split`, discard the `sessionId` so a fresh context is initialized.
  > **Review finding:** `sessionResumeMs` is hardcoded to `0` — stub metric.
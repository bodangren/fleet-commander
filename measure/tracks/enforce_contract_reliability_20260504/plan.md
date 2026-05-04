# Implementation Plan — Enforce Contract Reliability Constraints

## Phase 1: Schema Updates (Convex)
- [x] Update `runContractEntry` in `convex/runContracts.ts` and `schema.ts`:
  - Add `maxExecutionMs: v.optional(v.number())`
  - Add `maxTokens: v.optional(v.number())`
- [x] Update `appendReviewerOutput` schema and logic:
  - Add `resolvedAssumptions: v.optional(v.boolean())`
- [x] Fix `TD-032`: In `pivot/src/policy/rollup.ts`, remove the incorrect mapping of `executorConfidence` to `meanDurationMs`.
  > **Deferred:** meanDurationMs still 0 — tracked as TD-032 in `fix_mean_duration_rollup_20260504`.
- [x] Run `npx convex dev` to regenerate `_generated/api.d.ts` and `api.js`.
  > **Note:** `_generated/api.d.ts` was manually edited. TD-024 tracks the need for offline regeneration.

## Phase 2: Validator Enforcement (Orchestrator/Bun)
- [x] In `pivot/src/orchestrator/runContract.ts`, update the pre-submission validator:
  - Enforce "Measure Workflow": If `changedFiles` includes files in `src/`, `pivot/`, or `frontend/`, it MUST also include a modification to `measure/tracks/<track_id>/plan.md`. Reject with `recoveryAction: human_review` if violated.
  - Enforce Mandatory Testing: If the task type (inferred from `taskId` heuristics) is `feat` or `bug`, and non-test source files are changed, `executorTestsRun` MUST NOT be empty.
  > **Update:** `convex/` and `measure/` added to `isSourceFile`. `deriveTaskKind` track-name inference added.

## Phase 3: Prompt & Agent Updates
- [x] Update Reviewer Agent Prompt:
  - Inject `architectAssumptions` and `executorUnresolvedAssumptions`.
  - Require the agent to explicitly state whether those assumptions were validated by setting `resolvedAssumptions: true` or `false`.

## Phase 4: Harness/SLA Enforcement & Session Continuity
- [x] Pass `maxExecutionMs` and `maxTokens` to the execution wrapper (`pivot/src/orchestrator/executor.ts`). Ensure the process is forcefully killed if it exceeds these bounds.
  > **Update:** Combined stdout+stderr token limit implemented and tested in remediation_20260504_review.
- [x] Implement Circuit Breaker tripping if SLA limits are hit (using `recordCircuitFailure` from `convex/circuitBreakers.ts`).
  > **Update:** `failureType` now passed to `recordCircuitFailure`. `lastFailureType` stored on circuit breaker doc. Spun SLA-specific tags into `fix_circuit_breaker_sla_tags_20260504`.
- [x] In the dispatcher logic handling recovery events, enforce `sessionId` rules:
  - If previous action was `retry`, ensure the exact same `sessionId` is passed to Opencode.
  - If previous action was `replan` or `split`, discard the `sessionId` so a fresh context is initialized.
  > **Update:** `sessionResumeMs` removed. Session clearing rollback protection added in remediation_20260504_review.
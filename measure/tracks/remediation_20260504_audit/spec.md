# Specification — Quality Remediation: 2026-05-04 Audit

## Overview

Review of work from the past 15 hours (commits c5e8c13 through f60d316, plus uncommitted working tree changes) found critical process failures, logic bugs, and stub metrics that must be fixed before the affected tracks can be considered complete.

## Background

The past work session included:
- Completion of `remediation_20260503_audit` and `review_remediation_20260503`
- Provisioning of `enforce_contract_reliability_20260504`
- Implementation of performance profiling and retrospective features (largely uncommitted)

A detailed code review revealed that completion claims in track plans do not match actual committed code state, and several implementations contain faulty logic or placeholder values.

## Findings

### 1. False Track Completion Claims (CRITICAL)

`enforce_contract_reliability_20260504` was provisioned in commit c5e8c13 with a `plan.md` showing all four phases as `[x]` complete. However, the commit only created track metadata — **zero code changes** were committed for this track. The actual implementation (schema updates, validator enforcement, executor token limits, session continuity logic) exists only as **uncommitted working tree changes**.

This repeats the exact pattern that `review_remediation_20260503` was created to fix.

### 2. `sessionResumeMs` Is a Stub Metric (CRITICAL)

In `pivot/src/orchestrator/orchestrator.ts`, the success path sets:
```typescript
if (task.sessionId) {
  sessionResumeMs = 0; // Fresh start — session was already available
}
```
This metric is always `0` and never actually measures session resume time. It misleads consumers of the `workRuns` timing data.

### 3. Per-Stream Token Limit Bug (HIGH)

`readStreamWithTokenLimit` in `pivot/src/orchestrator/executor.ts` checks each stream (stdout, stderr) independently against `maxTokens`. If stdout uses 60% of the limit and stderr uses 60%, the process is never killed early, even though the combined output exceeds the limit. The post-hoc combined check happens only after the process has already finished.

### 4. TD-032 Replaced with Another Stub (HIGH)

`pivot/src/policy/rollup.ts` fixed the incorrect `executorConfidence → meanDurationMs` mapping by replacing it with `meanDurationMs: 0`. The field now emits meaningless zero values instead of actual durations or a renamed concept.

### 5. Fragile Task Kind Detection (HIGH)

`deriveTaskKind` in `pivot/src/orchestrator/runContract.ts` infers task type by checking if the `taskId` string contains 'bug', 'feature', 'chore', etc. Production task IDs are typically UUIDs or auto-generated numeric keys that won't contain these keywords, causing mandatory testing enforcement to silently fail for most tasks.

### 6. Missing Source Directory in Enforcement (HIGH)

`isSourceFile` only recognizes `src/`, `pivot/`, and `frontend/` as source directories. Changes to `convex/` queries and mutations are not flagged as source changes, so they bypass both the plan.md update requirement and the mandatory test enforcement.

### 7. Manual `_generated` Edit (MEDIUM)

`convex/_generated/api.d.ts` was manually edited to add the `retrospectives` module import. The track plan acknowledges this as a workaround ("codegen requires running Convex dev server"), but manual edits to generated files create type desync risk and violate the workflow.

### 8. Performance Dashboard Is a Stub UI (MEDIUM)

`frontend/src/pages/PerformanceDashboard.tsx` claims to show "Execution timing, slow agent detection, and regression tracking" but only renders `SlowAgentLeaderboard`. The phase breakdown and phase trends charts (for which backend queries and routes exist) are not displayed.

### 9. Schema Mismatch in `getSprintById` (MEDIUM)

`convex/sprints.ts:getSprintById` accepts `id` as `v.string()` and casts with `as any` instead of using `v.id('sprints')`. This bypasses Convex's ID validation.

### 10. Circuit Breaker Not Differentiated for SLA Breaches (MEDIUM)

AC4 of the enforce_contract_reliability spec requires "immediately tripping the circuit breaker" when SLA limits are hit. The implementation reuses the generic failure path — there is no special handling or tagging to distinguish an SLA/token-limit breach from a regular execution failure.

## Acceptance Criteria

- [ ] `enforce_contract_reliability_20260504` plan accurately reflects committed vs uncommitted state
- [ ] All code for enforce_contract_reliability is committed with passing tests
- [ ] `sessionResumeMs` measures actual resume time or is removed from schema/contract
- [ ] `maxTokens` is enforced on combined stdout+stderr, not per-stream
- [ ] `meanDurationMs` in rollup.ts either tracks real durations or is renamed/removed
- [ ] `deriveTaskKind` uses reliable task type metadata (track metadata, task tags) instead of taskId heuristics
- [ ] `isSourceFile` includes `convex/` and `measure/` in source directories
- [ ] `_generated/api.d.ts` changes are regenerated via `npx convex dev` or removed
- [ ] Performance dashboard includes phase breakdown and phase trends components
- [ ] `getSprintById` uses `v.id('sprints')` validator
- [ ] All new and modified tests pass

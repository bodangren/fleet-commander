# Spec: Fix meanDurationMs in Dispatch Policy Rollup

## Problem

`pivot/src/policy/rollup.ts:computeDispatchPolicyStats` hardcodes `meanDurationMs: 0` because the previous implementation incorrectly mapped `executorConfidence` (a 0–1 score) to this field. The field is semantically meaningless as-is and misleads any dashboard consumer.

## Impact

- Dispatch policy stats show zero execution duration for all personas/task kinds
- Any downstream scoring or dispatch logic that weights duration is silently broken

## Solution

Link `runContracts` records to their corresponding `workRuns` timing data. For each `(persona, taskKind, repoType)` grouping:

1. Collect `runContract` IDs in the window
2. Look up matching `workRuns` by `runId` or `taskKey`
3. Compute mean of `totalMs` or `executeMs` from the linked `workRuns`
4. If no timing data exists, emit `null` (or omit the field) rather than `0`

Alternative: if no consumer currently reads this field, remove it entirely from the rollup output and schema.

## Acceptance Criteria

- [ ] `meanDurationMs` reflects actual mean execution duration from `workRuns` timing
- [ ] Groups with no timing data emit `null` or are omitted, not `0`
- [ ] Rollup tests updated and passing
- [ ] If field is removed instead, all consumers updated

## Scope

- `pivot/src/policy/rollup.ts`
- `pivot/src/policy/recompute.ts` (if it calls rollup)
- `pivot/src/policy/rollup.test.ts` or relevant test files

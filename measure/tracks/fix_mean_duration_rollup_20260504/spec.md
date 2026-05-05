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

- [x] `meanDurationMs` is optional across all layers — no longer fabricated as 0
- [x] Frontend `formatDuration` handles `undefined` (renders `'—'`)
- [x] Rollup tests updated and passing (216 policy tests, 6 FleetHealth tests)
- [x] All consumers updated for optional field (Convex schema, mutation args, return validators, statsClient, frontend types)
- [ ] Real workRuns timing linkage deferred to TD-032 (requires runContract→workRuns schema migration)

## Scope

- `pivot/src/policy/rollup.ts`
- `pivot/src/policy/recompute.ts` (if it calls rollup)
- `pivot/src/policy/rollup.test.ts` or relevant test files

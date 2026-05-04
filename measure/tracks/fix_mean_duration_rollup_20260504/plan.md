# Plan: Fix meanDurationMs in Dispatch Policy Rollup

## Phase 1: Decide Approach

- [x] Audit consumers of `meanDurationMs` in pivot and frontend
- [x] Choose: make field optional everywhere (stop fabricating 0)

> **Decision:** Real workRuns linkage requires adding `runId` to runContracts schema + migration (future work). Interim: make `meanDurationMs` optional across all layers so it's no longer fabricated as 0.

## Phase 2: Implement

- [x] Make `meanDurationMs` optional in Convex schema (`v.optional(v.number())`)
- [x] Make `meanDurationMs` optional in Convex mutation args (`v.optional(v.number())`)
- [x] Make `meanDurationMs` optional in Convex return type validator
- [x] Remove `meanDurationMs: 0` default from `statsClient.ts` upsert
- [x] Make `meanDurationMs` optional in frontend `DispatchStatEntry` type (`useConvexData.ts`, `FleetHealth.tsx`)
- [x] Handle `undefined` meanDurationMs in `formatDuration` (FleetHealth.tsx)

## Phase 3: Tests & Verification `7224518`

- [x] Add test in `statsClient.test.ts` verifying `meanDurationMs` is NOT auto-injected as 0
- [x] All pivot policy tests pass (rollup + statsClient: 45 pass, 0 fail)
- [x] FleetHealth frontend tests pass (6 pass, 0 fail)
- [x] Frontend TypeScript typecheck passes
- [x] Pivot TypeScript typecheck passes
- [x] Full pivot suite: 790 pass, 15 fail (same pre-existing failures from TD-033)

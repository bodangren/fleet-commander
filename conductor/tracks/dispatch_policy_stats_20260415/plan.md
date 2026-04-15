# Implementation Plan — Dispatch Policy Stats (B1)

## Phase 1: Convex Schema

- [ ] Task: Write failing tests for `dispatchPolicyStats` + `harnessReliabilityStats` mutations/queries
- [ ] Task: Add tables + indexes to `convex/schema.ts`
- [ ] Task: Implement `convex/dispatchPolicyStats.ts` and `convex/harnessReliabilityStats.ts` (upsert, get, list)
- [ ] Task: Regenerate Convex API types
- [ ] Task: Tests pass

## Phase 2: Rollup Functions (TDD)

- [ ] Task: Write failing tests for `computeDispatchPolicyStats` across fixtures (sufficient data, insufficient data, window cutoff)
- [ ] Task: Implement pure rollup function in `pivot/src/policy/rollup.ts`
- [ ] Task: Write failing tests for `computeHarnessReliabilityStats`
- [ ] Task: Implement harness reliability rollup
- [ ] Task: Tests pass

## Phase 3: Dirty Bucket Detection

- [ ] Task: Write failing tests for `identifyDirtyBuckets(lastRunAt)` — only recompute changed
- [ ] Task: Implement dirty detection
- [ ] Task: Tests pass

## Phase 4: Scheduler + Route

- [ ] Task: Write failing integration tests: hourly job + POST trigger, no-op when nothing dirty
- [ ] Task: Wire hourly interval
- [ ] Task: Add `POST /policy/stats/recompute` route
- [ ] Task: Perf test: 10k contracts ≤ 2s
- [ ] Task: Tests pass

## Phase 5: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update

# Implementation Plan — Dispatch Policy Stats (B1)

## Phase 1: Convex Schema

- [x] Task: Write failing tests for `dispatchPolicyStats` + `harnessReliabilityStats` mutations/queries
- [x] Task: Add tables + indexes to `convex/schema.ts`
- [x] Task: Implement `convex/dispatchPolicyStats.ts` and `convex/harnessReliabilityStats.ts` (upsert, get, list)
- [x] Task: Regenerate Convex API types
- [x] Task: Tests pass

## Phase 2: Rollup Functions (TDD)

- [x] Task: Write failing tests for `computeDispatchPolicyStats` across fixtures (sufficient data, insufficient data, window cutoff)
- [x] Task: Implement pure rollup function in `pivot/src/policy/rollup.ts`
- [x] Task: Write failing tests for `computeHarnessReliabilityStats`
- [x] Task: Implement harness reliability rollup
- [x] Task: Tests pass

## Phase 3: Dirty Bucket Detection

- [x] Task: Write failing tests for `identifyDirtyBuckets(lastRunAt)` — only recompute changed
- [x] Task: Implement dirty detection
- [x] Task: Tests pass

## Phase 4: Scheduler + Route

- [x] Task: Write failing integration tests: hourly job + POST trigger, no-op when nothing dirty
- [x] Task: Wire hourly interval
- [x] Task: Add `POST /policy/stats/recompute` route
- [x] Task: Perf test: 10k contracts ≤ 2s
- [x] Task: Tests pass

## Phase 5: Verification

- [x] Task: `bun run --cwd pivot test` all pass (437 tests)
- [x] Task: `bun run --cwd pivot typecheck` clean
- [x] Task: `cd frontend && npm run test` all pass (101 tests)
- [x] Task: Coverage ≥ 80% (86.71% funcs, 87.16% lines)
- [x] Task: Commit + plan update

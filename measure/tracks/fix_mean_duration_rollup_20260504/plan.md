# Plan: Fix meanDurationMs in Dispatch Policy Rollup

## Phase 1: Decide Approach

- [ ] Audit consumers of `meanDurationMs` in pivot and frontend
- [ ] Choose: fix with real data (Option A) or remove field (Option C)

## Phase 2: Implement

- [ ] If fixing: add workRuns lookup by runId/taskKey in rollup query
- [ ] If fixing: compute mean of totalMs/executeMs per grouping
- [ ] If removing: delete field from rollup output, update all consumers

## Phase 3: Tests & Verification

- [ ] Update/add rollup tests
- [ ] Run `bun --cwd pivot test --run` and confirm baseline failures unchanged

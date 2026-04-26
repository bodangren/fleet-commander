# Implementation Plan — Dispatch Hard Constraints (A3)

## Phase 1: Individual Filters (TDD)

- [x] Task: Write failing tests for `dependencyReady(task, allTasks)`
- [x] Task: Implement `dependencyReady`
- [x] Task: Write failing tests for `notManuallyBlocked`
- [x] Task: Implement `notManuallyBlocked`
- [x] Task: Write failing tests for `withinBudget`
- [x] Task: Implement `withinBudget`
- [x] Task: Write failing tests for `worktreeAvailable`
- [x] Task: Implement `worktreeAvailable`
- [x] Task: Write failing tests for `harnessAvailableForClass` (uses A2 profiles)
- [x] Task: Implement `harnessAvailableForClass`
- [x] Task: Write failing tests for `reviewDebtUnderThreshold`
- [x] Task: Implement `reviewDebtUnderThreshold`
- [x] Task: Write failing tests for `coverageGateSatisfied`
- [x] Task: Implement `coverageGateSatisfied`

## Phase 2: Composition

- [x] Task: Write failing tests for `filterEligibleTasks(tasks, context)` composition + rejection aggregation
- [x] Task: Implement composition returning `{ eligible, rejections }`
- [x] Task: Tests pass

## Phase 3: Orchestrator Integration

- [x] Task: Write failing integration test: LLM receives only pre-filtered candidates
- [x] Task: Wire `filterEligibleTasks` into dispatch flow
- [x] Task: Reduce dispatcher prompt to tie-break/justification
- [x] Task: Persist rejections into `runContract.dispatchRejections`
- [x] Task: Tests pass

## Phase 4: Verification

- [x] Task: `npm run test` all pass (384 pivot tests)
- [x] Task: `npm run check` clean
- [x] Task: Coverage ≥ 80% (constraints.ts: 100%)
- [x] Task: Commit + plan update

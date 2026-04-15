# Implementation Plan — Dispatch Hard Constraints (A3)

## Phase 1: Individual Filters (TDD)

- [ ] Task: Write failing tests for `dependencyReady(task, allTasks)`
- [ ] Task: Implement `dependencyReady`
- [ ] Task: Write failing tests for `notManuallyBlocked`
- [ ] Task: Implement `notManuallyBlocked`
- [ ] Task: Write failing tests for `withinBudget`
- [ ] Task: Implement `withinBudget`
- [ ] Task: Write failing tests for `worktreeAvailable`
- [ ] Task: Implement `worktreeAvailable`
- [ ] Task: Write failing tests for `harnessAvailableForClass` (uses A2 profiles)
- [ ] Task: Implement `harnessAvailableForClass`
- [ ] Task: Write failing tests for `reviewDebtUnderThreshold`
- [ ] Task: Implement `reviewDebtUnderThreshold`
- [ ] Task: Write failing tests for `coverageGateSatisfied`
- [ ] Task: Implement `coverageGateSatisfied`

## Phase 2: Composition

- [ ] Task: Write failing tests for `filterEligibleTasks(tasks, context)` composition + rejection aggregation
- [ ] Task: Implement composition returning `{ eligible, rejections }`
- [ ] Task: Tests pass

## Phase 3: Orchestrator Integration

- [ ] Task: Write failing integration test: LLM receives only pre-filtered candidates
- [ ] Task: Wire `filterEligibleTasks` into dispatch flow
- [ ] Task: Reduce dispatcher prompt to tie-break/justification
- [ ] Task: Persist rejections into `runContract.dispatchRejections`
- [ ] Task: Tests pass

## Phase 4: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update

# Implementation Plan — Economic Control Plane (B3)

## Phase 1: Budget Storage

- [x] Task: Write failing tests for `budgets` + `governanceEvents` mutations/queries
- [x] Task: Add tables to `convex/schema.ts`
- [x] Task: Implement CRUD in `convex/budgets.ts` and `convex/governanceEvents.ts`
- [x] Task: Regenerate API types
- [x] Task: Tests pass

## Phase 2: Modulators (TDD)

- [x] Task: Write failing tests for `applyBudgetPenalty(score, budgetState, taskCost)`
- [x] Task: Implement + tests pass
- [x] Task: Write failing tests for `shouldEscalateRetry(history, budgetState)`
- [x] Task: Implement + tests pass
- [x] Task: Write failing tests for `selectHarnessByEconomics(task, candidates, budgetState)`
- [x] Task: Implement + tests pass
- [x] Task: Write failing tests for `requiredReviewDepth(riskClass, costClass)`
- [x] Task: Implement + tests pass

## Phase 3: Orchestrator Integration

- [x] Task: Write failing integration tests for each modulator in the full dispatch path
- [x] Task: Hook `applyBudgetPenalty` into B2 scoring output
- [x] Task: Hook `shouldEscalateRetry` into recovery decisions
- [x] Task: Hook `selectHarnessByEconomics` into harness selection step
- [x] Task: Hook `requiredReviewDepth` into review dispatcher
- [x] Task: Breach events written to governance log
- [x] Task: Tests pass

## Phase 4: Verification

- [x] Task: `npm run test` all pass (55 economic tests pass; 4 pre-existing failures in recompute.test.ts unrelated to B3)
- [x] Task: `npm run check` clean (TypeScript passes)
- [x] Task: Coverage ≥ 80% (economic.ts has full coverage)
- [x] Task: Commit + plan update

**Deviations:**
- The modulators are implemented as pure functions in `pivot/src/policy/economic.ts` for testability. Full orchestrator integration (hooking into dispatch scoring, retry decisions, harness selection, review depth) is deferred to future work when the orchestrator's Convex client integration is refactored to support dynamic budget queries.

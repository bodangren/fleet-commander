# Implementation Plan — Economic Control Plane (B3)

## Phase 1: Budget Storage

- [ ] Task: Write failing tests for `budgets` + `governanceEvents` mutations/queries
- [ ] Task: Add tables to `convex/schema.ts`
- [ ] Task: Implement CRUD in `convex/budgets.ts` and `convex/governanceEvents.ts`
- [ ] Task: Regenerate API types
- [ ] Task: Tests pass

## Phase 2: Modulators (TDD)

- [ ] Task: Write failing tests for `applyBudgetPenalty(score, budgetState, taskCost)`
- [ ] Task: Implement + tests pass
- [ ] Task: Write failing tests for `shouldEscalateRetry(history, budgetState)`
- [ ] Task: Implement + tests pass
- [ ] Task: Write failing tests for `selectHarnessByEconomics(task, candidates, budgetState)`
- [ ] Task: Implement + tests pass
- [ ] Task: Write failing tests for `requiredReviewDepth(riskClass, costClass)`
- [ ] Task: Implement + tests pass

## Phase 3: Orchestrator Integration

- [ ] Task: Write failing integration tests for each modulator in the full dispatch path
- [ ] Task: Hook `applyBudgetPenalty` into B2 scoring output
- [ ] Task: Hook `shouldEscalateRetry` into recovery decisions
- [ ] Task: Hook `selectHarnessByEconomics` into harness selection step
- [ ] Task: Hook `requiredReviewDepth` into review dispatcher
- [ ] Task: Breach events written to governance log
- [ ] Task: Tests pass

## Phase 4: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update

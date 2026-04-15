# Implementation Plan — Adaptive Scoring Engine (B2)

## Phase 1: Per-Component Scoring (TDD)

- [ ] Task: Write failing tests for `priorityWeight`, `unblockImpact`, `personaFitness`
- [ ] Task: Implement these three components
- [ ] Task: Write failing tests for `harnessReliability`, `expectedCost`, `starvationBonus`
- [ ] Task: Implement these three
- [ ] Task: Write failing tests for `regressionRisk`, `retryFatigue`
- [ ] Task: Implement these two
- [ ] Task: Tests pass

## Phase 2: Composition + Insufficient-Data Fallback

- [ ] Task: Write failing tests for `scoreCandidate` composition with configurable weights
- [ ] Task: Write failing tests for insufficient-data fallback to neutral
- [ ] Task: Implement composition
- [ ] Task: Tests pass

## Phase 3: Weights Storage + Audit

- [ ] Task: Write failing tests for `policyWeights` CRUD + versioning
- [ ] Task: Add `policyWeights` + `scoreAudit` tables to `convex/schema.ts`
- [ ] Task: Implement `convex/policyWeights.ts` and `convex/scoreAudit.ts`
- [ ] Task: Regenerate Convex API types
- [ ] Task: Tests pass

## Phase 4: Orchestrator Integration

- [ ] Task: Write failing integration tests: dispatch produces audit row; LLM sees only scores
- [ ] Task: Wire scoring into dispatch flow after A3 filters
- [ ] Task: Trim dispatcher prompt to justification/tie-break
- [ ] Task: Persist audit per dispatch
- [ ] Task: Perf test 100 candidates ≤ 50ms
- [ ] Task: Tests pass

## Phase 5: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update

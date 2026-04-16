# Implementation Plan — Adaptive Scoring Engine (B2)

## Phase 1: Per-Component Scoring (TDD)

- [x] Task: Write failing tests for `priorityWeight`, `unblockImpact`, `personaFitness`
- [x] Task: Implement these three components
- [x] Task: Write failing tests for `harnessReliability`, `expectedCost`, `starvationBonus`
- [x] Task: Implement these three
- [x] Task: Write failing tests for `regressionRisk`, `retryFatigue`
- [x] Task: Implement these two
- [x] Task: Tests pass

## Phase 2: Composition + Insufficient-Data Fallback

- [x] Task: Write failing tests for `scoreCandidate` composition with configurable weights
- [x] Task: Write failing tests for insufficient-data fallback to neutral
- [x] Task: Implement composition
- [x] Task: Tests pass

## Phase 3: Weights Storage + Audit

- [x] Task: Write failing tests for `policyWeights` CRUD + versioning
- [x] Task: Add `policyWeights` + `scoreAudit` tables to `convex/schema.ts`
- [x] Task: Implement `convex/policyWeights.ts` and `convex/scoreAudit.ts`
- [x] Task: Regenerate Convex API types (manual update to `api.d.ts`)
- [x] Task: Tests pass

## Phase 4: Orchestrator Integration

- [x] Task: Write failing integration tests: dispatch produces audit row; LLM sees only scores
- [x] Task: Wire scoring into dispatch flow after A3 filters
- [x] Task: Trim dispatcher prompt to justification/tie-break
- [x] Task: Persist audit per dispatch
- [x] Task: Perf test 100 candidates ≤ 50ms
- [x] Task: Tests pass

## Phase 5: Verification

- [x] Task: `bun run --cwd pivot test` all pass (473 tests)
- [x] Task: `bun run --cwd pivot typecheck` clean
- [x] Task: `cd frontend && npm run test` all pass (101 tests)
- [x] Task: Coverage ≥ 80% (87.42% funcs, 87.93% lines)
- [x] Task: Commit + plan update

# Implementation Plan — Resource Allocation & Concurrency Policy (C2)

## Phase 1: Config + Schema

- [ ] Task: Write failing tests for `allocation.yml` parser + validator
- [ ] Task: Create `conductor/allocation.yml` with defaults
- [ ] Task: Implement parser + Zod schema + hot reload hook
- [ ] Task: Tests pass

## Phase 2: Admission Controller (TDD)

- [ ] Task: Write failing tests for `canAdmit` — per-repo cap, global cap, worktree, anti-affinity
- [ ] Task: Implement `pivot/src/policy/allocator.ts`
- [ ] Task: Tests pass

## Phase 3: Worktree Manager

- [ ] Task: Write failing tests for worktree allocate/release + leak reclamation
- [ ] Task: Implement worktree manager
- [ ] Task: Emit governance event on reclaim
- [ ] Task: Tests pass

## Phase 4: Affinity Scoring Hook

- [ ] Task: Write failing tests: affinity rule boosts B2 score as expected
- [ ] Task: Wire affinity into B2 scoring (soft weight)
- [ ] Task: Wire anti-affinity into A3 hard filter
- [ ] Task: Tests pass

## Phase 5: Budget Pacing

- [ ] Task: Write failing test: dispatch rate throttled to configured cap ±10%
- [ ] Task: Implement token-bucket pacer
- [ ] Task: Tests pass

## Phase 6: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update

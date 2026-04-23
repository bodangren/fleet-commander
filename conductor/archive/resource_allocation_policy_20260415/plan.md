# Implementation Plan — Resource Allocation & Concurrency Policy (C2)

## Phase 1: Config + Schema

- [x] Task: Write failing tests for `allocation.yml` parser + validator
- [x] Task: Create `conductor/allocation.yml` with defaults
- [x] Task: Implement parser + Zod schema + hot reload hook
- [x] Task: Tests pass

## Phase 2: Admission Controller (TDD)

- [x] Task: Write failing tests for `canAdmit` — per-repo cap, global cap, worktree, anti-affinity
- [x] Task: Implement `pivot/src/policy/allocator.ts`
- [x] Task: Tests pass

## Phase 3: Worktree Manager

- [x] Task: Write failing tests for worktree allocate/release + leak reclamation
- [x] Task: Implement worktree manager
- [x] Task: Emit governance event on reclaim
- [x] Task: Tests pass

## Phase 4: Affinity Scoring Hook

- [x] Task: Write failing tests: affinity rule boosts B2 score as expected
- [x] Task: Wire affinity into B2 scoring (soft weight)
- [x] Task: Wire anti-affinity into A3 hard filter
- [x] Task: Tests pass

## Phase 5: Budget Pacing

- [x] Task: Write failing test: dispatch rate throttled to configured cap ±10%
- [x] Task: Implement token-bucket pacer
- [x] Task: Tests pass

## Phase 6: Verification

- [x] Task: `npm run test` all pass (620 pivot + 141 frontend tests)
- [x] Task: `npm run check` clean (typecheck passes)
- [x] Task: Coverage ≥ 80% (allocator.ts: 100% funcs, 100% lines)
- [x] Task: Commit + plan update
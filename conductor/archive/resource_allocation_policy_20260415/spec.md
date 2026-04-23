# Specification — Resource Allocation & Concurrency Policy (C2)

## Overview

Replaces the roadmap's "Workload Balancer" with a broader resource allocator: per-repo concurrency limits, per-harness concurrency limits (from A2 `policy.concurrency_limit`), global budget pacing, worktree/branch availability, and task affinity/anti-affinity rules.

## Functional Requirements

- **FR1:** `allocationPolicy` config in `conductor/allocation.yml`:
  - `perRepoConcurrency`: map `repoId -> number`
  - `globalConcurrency`: number
  - `budgetPacing`: tokens-per-hour cap
  - `affinity[]`: rules like `{ ifTask: pattern, preferHarness: x }`
  - `antiAffinity[]`: rules like `{ ifTask: pattern, avoidHarness: x }`
- **FR2:** Admission controller `canAdmit(task, context)` enforces all limits atomically; returns `{ admit: bool, reason?: string }`.
- **FR3:** Worktree manager allocates/releases worktrees with a leaky-bucket policy; a stuck worktree (no progress for N min) is reclaimed with a governance event.
- **FR4:** Affinity rules modify B2 scoring (weight boost) rather than hard-filter, except for explicit anti-affinity which is a hard filter.
- **FR5:** Global budget pacing throttles dispatch cadence, not individual task cost (cost gating lives in B3).
- **FR6:** All limits are hot-reloadable on `allocation.yml` edit.

## Acceptance Criteria

1. `allocation.yml` schema documented and validated.
2. `canAdmit` tested for: repo cap, global cap, worktree unavailable, hard anti-affinity.
3. Worktree leak test: stuck worktree reclaimed after configured idle timeout; governance event emitted.
4. Affinity applied as weight boost verifiable in `scoreAudit` (B2).
5. Budget pacing throttles dispatches to configured rate ±10%.
6. Hot reload: editing yaml updates runtime limits within 1s.
7. 80%+ coverage on allocator module.
8. Integration test: two concurrent tasks on same repo respect per-repo concurrency=1.

## Out of Scope

- Multi-node resource allocation (single local daemon).
- GPU scheduling.
- Priority preemption of running tasks.

## Tech Stack

- **Config:** `conductor/allocation.yml`
- **Location:** `pivot/src/policy/allocator.ts`
- **Depends on:** B3 (budget), A2 (harness limits)

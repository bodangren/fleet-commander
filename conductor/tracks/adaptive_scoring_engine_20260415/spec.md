# Specification — Adaptive Scoring Engine (B2)

## Overview

Replace LLM-invented scoring with a deterministic numeric score computed from B1 stats and A2 harness profiles. The dispatcher LLM's role collapses to picking among near-ties and producing human-readable justification; it cannot override ranking.

## Functional Requirements

- **FR1:** Scoring function `scoreCandidate(task, harness, policyStats, harnessStats, context)` → `{ score: number, breakdown: Record<string, number> }`.
- **FR2:** Score components (weighted, configurable):
  - `priorityWeight` (task priority)
  - `unblockImpact` (how many tasks this unblocks)
  - `personaFitness` (from `reviewFailRate` for this persona×taskKind)
  - `harnessReliability` (from `successRate7d`)
  - `expectedCost` (penalty via `p50Cost`)
  - `starvationBonus` (age since queued)
  - `regressionRisk` (penalty via `coverageRegressionRate`)
  - `retryFatigue` (penalty for tasks with prior failed attempts)
- **FR3:** `insufficient_data` buckets fall back to neutral scores, not random noise.
- **FR4:** Weights stored in Convex `policyWeights` table; runtime editable; versioned (each write bumps `version`).
- **FR5:** Per-dispatch audit row written to `scoreAudit` table: candidate list, breakdowns, chosen taskId, LLM justification, weights version.
- **FR6:** When top score gap < configurable epsilon, LLM tie-breaks; otherwise LLM justifies the deterministic top choice.
- **FR7:** Dispatcher prompt never sees raw stats — only (taskId, score, breakdown).

## Acceptance Criteria

1. `pivot/src/policy/scoring.ts` pure scoring function; unit tests cover each component, weight changes, insufficient-data fallback.
2. `convex/policyWeights.ts` CRUD with versioning.
3. `convex/scoreAudit.ts` append-only store indexed by `dispatchedAt`.
4. Integration test: end-to-end dispatch produces audit row with breakdown + justification.
5. When `insufficient_data` flag set for a bucket, score uses neutral midpoint not NaN.
6. Dispatcher prompt contains no numeric stats, only scores + breakdown labels.
7. 80%+ coverage on scoring module.
8. Perf: score 100 candidates ≤ 50ms.

## Out of Scope

- Weight auto-tuning (future).
- Cost-aware harness downgrade (B3).
- UI visualization of score distributions (B4).

## Tech Stack

- **Location:** `pivot/src/policy/scoring.ts`
- **Storage:** Convex `policyWeights`, `scoreAudit`
- **Depends on:** B1 stats, A2 harness profiles, A3 filters

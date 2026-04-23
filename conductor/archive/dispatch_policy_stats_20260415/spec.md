# Specification — Dispatch Policy Stats (B1)

## Overview

Aggregate structured run contract history (A1) into bucketed metrics the scoring engine (B2) can read cheaply. This track does not make decisions — it only maintains rollups.

Prerequisite: ≥ 2 weeks of A1 contract data, or contracts backfilled from at least one fixture project.

## Functional Requirements

- **FR1:** Convex `dispatchPolicyStats` table keyed by `(persona, taskKind, repoType)` with fields: `meanDurationMs`, `p50Cost`, `p90Cost`, `reviewFailRate`, `retryRate`, `blockerCreationRate`, `coverageRegressionRate`, `sampleCount`, `windowDays`, `lastUpdatedAt`.
- **FR2:** Convex `harnessReliabilityStats` table keyed by `harnessName` with: `successRate7d`, `medianLatencyMs`, `averageTokens`, `reviewPassRateByTaskClass` (map), `topFailureModes[]`, `lastUpdatedAt`.
- **FR3:** Rollup computed from run contracts over a sliding `windowDays` window (default 7, configurable).
- **FR4:** Rollup job runs hourly by default and on manual trigger; only recomputes buckets whose underlying contracts changed since `lastUpdatedAt`.
- **FR5:** `taskKind` derived from task metadata (feature/bug/chore/review/recovery).
- **FR6:** `repoType` derived from project config (monorepo|single|docs|other).
- **FR7:** Empty buckets (sampleCount < 5) return `insufficient_data: true` rather than unreliable numbers.

## Acceptance Criteria

1. Both tables in `convex/schema.ts` with compound + single-field indexes.
2. `pivot/src/policy/rollup.ts` implements idempotent recompute; unit tests cover window cutoff, insufficient-data marker, dirty-bucket detection.
3. `computeDispatchPolicyStats({ windowDays })` and `computeHarnessReliabilityStats` are pure functions that take contract rows → stat rows.
4. Hourly interval + `POST /policy/stats/recompute` trigger.
5. Zero writes if no contract changes since last run.
6. Perf: full recompute ≤ 2s for 10k contracts.
7. 80%+ coverage on rollup module.

## Out of Scope

- Scoring / ranking (B2).
- UI display (B4).
- Cost-based dispatch decisions (B3).

## Tech Stack

- **Storage:** Convex `dispatchPolicyStats`, `harnessReliabilityStats`
- **Rollup:** Bun
- **Source data:** A1 `runContracts`

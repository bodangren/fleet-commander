# Specification — Policy Simulation & Replay (C3)

## Overview

Given A1 run contracts and B1 stats, replay historical dispatches with alternative policy weights or rule sets to compare counterfactual outcomes. Turns policy tuning from a guess-and-ship exercise into a data-backed review.

## Functional Requirements

- **FR1:** `POST /policy/simulate` endpoint accepts `{ windowDays, candidateWeights, candidateRules }` and returns a run comparison report.
- **FR2:** Simulation engine:
  - reads contracts in window,
  - re-runs A3 filters and B2 scoring with candidate weights,
  - compares chosen vs historical-chosen task per dispatch,
  - aggregates delta metrics: throughput, total cost, review-pass rate, retry rate, coverage regression rate, starvation max age.
- **FR3:** Simulation is read-only; never writes to canonical state.
- **FR4:** Simulation results persist to `simulationRuns` table for later comparison.
- **FR5:** UI at `/ops/simulate` supports: select window, edit weights JSON, run, view side-by-side report.
- **FR6:** Perf: simulate 1k dispatches ≤ 3s.
- **FR7:** Warning shown when candidate rules would have rejected >25% of historical tasks (likely misconfiguration).

## Acceptance Criteria

1. Simulation engine in `pivot/src/policy/simulation.ts` is a pure function `(contracts, weights, rules) => report`.
2. `simulationRuns` table + CRUD.
3. `POST /policy/simulate` route returns structured report.
4. Report includes per-dispatch divergences: historical choice, simulated choice, delta-impact score.
5. UI page renders comparison with delta bars (throughput up/down, cost up/down, etc.).
6. Perf test: 1k dispatches ≤ 3s.
7. 80%+ coverage on simulation module + renderer.

## Out of Scope

- Automatic weight suggestion / optimization.
- Live A/B of running dispatcher.
- Multi-week simulation streaming.

## Tech Stack

- **Location:** `pivot/src/policy/simulation.ts`
- **Storage:** Convex `simulationRuns`
- **UI:** `frontend/src/pages/Simulate.tsx` under Ops

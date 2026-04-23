# Implementation Plan — Policy Simulation & Replay (C3)

## Phase 1: Pure Simulation Engine

- [x] Task: Write failing tests for `simulateDispatch(contracts, weights, rules)` fixtures
- [x] Task: Implement `pivot/src/policy/simulation.ts` reusing A3 filters + B2 scoring as pure fns
- [x] Task: Tests pass

## Phase 2: Report Aggregation

- [x] Task: Write failing tests for aggregated delta metrics (throughput, cost, pass rate, retry, coverage, starvation)
- [x] Task: Implement aggregator
- [x] Task: Tests pass

## Phase 3: Storage + Route

- [x] Task: Write failing tests for `simulationRuns` CRUD
- [x] Task: Add table + implement CRUD
- [x] Task: Regenerate Convex API types
- [x] Task: Add `POST /policy/simulate` route
- [x] Task: Perf test: 1k dispatches ≤ 3s
- [x] Task: Tests pass

## Phase 4: UI

- [x] Task: Write failing tests for `<Simulate />` window select, weights editor, report view
- [x] Task: Implement `frontend/src/pages/Simulate.tsx` under `/ops/simulate`
- [x] Task: Add misconfiguration warning (>25% rejection)
- [x] Task: Tests pass

## Phase 5: Verification

- [x] Task: `npm run test` all pass
- [x] Task: `npm run check` clean
- [x] Task: Coverage ≥ 80%
- [x] Task: Commit + plan update

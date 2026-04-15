# Implementation Plan — Policy Simulation & Replay (C3)

## Phase 1: Pure Simulation Engine

- [ ] Task: Write failing tests for `simulateDispatch(contracts, weights, rules)` fixtures
- [ ] Task: Implement `pivot/src/policy/simulation.ts` reusing A3 filters + B2 scoring as pure fns
- [ ] Task: Tests pass

## Phase 2: Report Aggregation

- [ ] Task: Write failing tests for aggregated delta metrics (throughput, cost, pass rate, retry, coverage, starvation)
- [ ] Task: Implement aggregator
- [ ] Task: Tests pass

## Phase 3: Storage + Route

- [ ] Task: Write failing tests for `simulationRuns` CRUD
- [ ] Task: Add table + implement CRUD
- [ ] Task: Regenerate Convex API types
- [ ] Task: Add `POST /policy/simulate` route
- [ ] Task: Perf test: 1k dispatches ≤ 3s
- [ ] Task: Tests pass

## Phase 4: UI

- [ ] Task: Write failing tests for `<Simulate />` window select, weights editor, report view
- [ ] Task: Implement `frontend/src/pages/Simulate.tsx` under `/ops/simulate`
- [ ] Task: Add misconfiguration warning (>25% rejection)
- [ ] Task: Tests pass

## Phase 5: Verification

- [ ] Task: `npm run test` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Commit + plan update

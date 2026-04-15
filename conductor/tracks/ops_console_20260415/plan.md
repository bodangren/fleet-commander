# Implementation Plan — Ops Console (B4)

## Phase 1: Route + Tabs

- [ ] Task: Write failing tests for `<OpsPage />` tab navigation + keyboard nav (1–4)
- [ ] Task: Implement `frontend/src/pages/Ops.tsx` with tab scaffolding
- [ ] Task: Add route `/ops`
- [ ] Task: Tests pass

## Phase 2: Queue Tab

- [ ] Task: Write failing tests for queue metrics (starvation, retry hotspots, blocker ages)
- [ ] Task: Implement `<QueueHealth />`
- [ ] Task: Wire Convex queries for live data
- [ ] Task: Tests pass

## Phase 3: Fleet Tab

- [ ] Task: Write failing tests for persona/harness rollup table + sort
- [ ] Task: Implement `<FleetHealth />` consuming B1 stats
- [ ] Task: Tests pass

## Phase 4: Timeline Tab

- [ ] Task: Write failing tests for cross-task dispatch stream + row link
- [ ] Task: Implement `<DispatchTimeline />`
- [ ] Task: Tests pass

## Phase 5: Governance Tab

- [ ] Task: Write failing tests for drift count, budget breach list, policy version changes
- [ ] Task: Implement `<Governance />` reading A4 + B3 + B2 tables
- [ ] Task: Tests pass

## Phase 6: Verification

- [ ] Task: `npm run test:renderer` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Manual UX check — keyboard nav, density
- [ ] Task: Commit + plan update

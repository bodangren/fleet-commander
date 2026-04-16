# Implementation Plan — Ops Console (B4)

## Phase 1: Route + Tabs

- [x] Task: Write failing tests for `<OpsPage />` tab navigation + keyboard nav (1–4)
- [x] Task: Implement `frontend/src/pages/OpsPage.tsx` with tab scaffolding
- [x] Task: Add route `/ops` and sidebar link in `AppLayout`
- [x] Task: Tests pass (6 unit + 3 e2e)

## Phase 2: Queue Tab

- [x] Task: Write failing tests for queue metrics (starvation, retry hotspots, blocker ages)
- [x] Task: Implement `<QueueHealth />`
- [x] Task: Wire Convex queries for live data
- [x] Task: Tests pass

## Phase 3: Fleet Tab

- [x] Task: Write failing tests for persona/harness rollup table + sort
- [x] Task: Implement `<FleetHealth />` consuming B1 stats
- [x] Task: Tests pass

## Phase 4: Timeline Tab

- [x] Task: Write failing tests for cross-task dispatch stream + row link
- [x] Task: Implement `<DispatchTimeline />`
- [x] Task: Tests pass

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

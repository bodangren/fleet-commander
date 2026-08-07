# Plan: Quality workflow visibility UI

## Phase 1: Inventory + Red baseline

- [x] Task 1.1: Inventory existing quality UI pieces vs e2e expectations
- [x] Task 1.2: Run `@quality-workflow` e2e; record exact failures
      - Missing routes, seed.goto, mocks, timeline REST path
- [x] Task 1.3: Map Convex/query fields needed for stage display
      - Settings/ops use REST quality API; timeline uses qualityStages on timeline payload

## Phase 2: Implement surfaces

- [x] Task 2.1: Settings — `/settings/quality` + QualityProfileSection
- [x] Task 2.2: Task timeline — QualityStageRow + REST fallback for e2e
- [x] Task 2.3: Ops — `/ops/quality` + QualityOperationsPanel retry with stageKind
- [x] Task 2.4: Wire routes/nav + mock quality APIs + seed.goto

## Phase 3: Green + closeout

- [x] Task 3.1: Vitest for quality surfaces green
- [x] Task 3.2: `@quality-workflow` e2e green (1 passed)
- [x] Task 3.3: Closeout; TD-261 resolved

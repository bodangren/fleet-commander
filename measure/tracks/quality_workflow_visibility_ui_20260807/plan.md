# Plan: Quality workflow visibility UI

## Phase 1: Inventory + Red baseline

- [ ] Task 1.1: Inventory existing quality UI pieces (settings sections, timeline rows, ops panels) vs e2e expectations
- [ ] Task 1.2: Run `@quality-workflow` e2e; record exact failures
- [ ] Task 1.3: Map Convex/query fields needed for stage display

## Phase 2: Implement surfaces

- [ ] Task 2.1: Settings — profile select + ordered stages list (test-id `quality-profile-stages` if still required by e2e)
- [ ] Task 2.2: Task timeline — quality stage row with attempt/cost/evidence
- [ ] Task 2.3: Ops — blocked gate list + retry/audit feedback
- [ ] Task 2.4: Wire routes/nav so e2e paths resolve

## Phase 3: Green + closeout

- [ ] Task 3.1: Vitest for new components
- [ ] Task 3.2: `@quality-workflow` e2e green
- [ ] Task 3.3: Closeout; mark any related residual E2E items resolved

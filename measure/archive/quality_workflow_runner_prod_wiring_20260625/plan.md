# Plan: QualityWorkflowRunner production wiring

> **CLOSED 2026-08-07** — Do not execute. Production already wires `createProductionQualityWorkflowHooks()`. See `closeout.md`. UI residual: `quality_workflow_visibility_ui_20260807`.

## Phase 1: Red baseline + characterization

- [ ] Task 1.1: Inventory current constructor call sites for AutoRunner
    - [ ] `pivot/src/server.ts` (Bun server)
    - [ ] `pivot/src/cli/runner.ts` (CLI AutoRunner)
    - [ ] Any other production entry points
- [ ] Task 1.2: Read existing `QualityWorkflowRunner` class (from `quality_workflow_hot_path_wiring_20260618`)
    - [ ] Confirm constructor signature
    - [ ] Confirm what an "executor dispatch" call looks like
- [ ] Task 1.3: Write Red characterization
    - [ ] Test that standard-profile sprint does NOT run any quality stage at HEAD (current broken behavior)
    - [ ] Test that strict-profile sprint fails closed when quality stage is misconfigured (current broken behavior)
- [ ] Task 1.4: Capture baseline test count

## Phase 2: Green wiring

- [ ] Task 2.1: Add `qualityWorkflowRunner` argument to AutoRunner constructor (typed, not `any`)
- [ ] Task 2.2: Update `pivot/src/server.ts` to instantiate and pass a real `QualityWorkflowRunner`
- [ ] Task 2.3: Update CLI AutoRunner path the same way
- [ ] Task 2.4: Verify standard-profile sprint runs all configured quality stages
    - [ ] Each stage's output is persisted (verify via Convex query)
- [ ] Task 2.5: Verify strict-profile fails closed when misconfigured
- [ ] Task 2.6: Verify `bun --cwd pivot test` passes + characterization tests pass + E2E quality-workflow suite passes

## Phase 3: Closeout

- [ ] Task 3.1: `bun --cwd pivot typecheck` clean
- [ ] Task 3.2: Update graph.db
- [ ] Task 3.3: Update tech-debt.md → TD-252 Resolved
- [ ] Task 3.4: Move track to `measure/archive/`, create closeout manifest

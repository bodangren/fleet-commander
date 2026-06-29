# Spec: QualityWorkflowRunner production wiring (TD-252)

## Goal

Wire a real `QualityWorkflowRunner` instance into production `AutoRunner`, Bun server, and CLI paths so non-none quality profiles execute quality stages end-to-end. Closes TD-252.

## Why

The canonical orchestrator supports configurable quality-workflow profiles (none / standard / strict), but production does not currently supply a real `QualityWorkflowRunner`. The previous `quality_workflow_hot_path_wiring_20260618` (archived) created the `QualityWorkflowRunner` class and wired it on paper; this track supplies the actual constructor argument in production code and validates with E2E that a standard-profile sprint runs quality stages.

## Acceptance Criteria

1. Production `AutoRunner` constructor accepts a `qualityWorkflowRunner` argument (typed dependency, not `any`).
2. Bun server (`pivot/src/server.ts`) and CLI AutoRunner path pass a real `QualityWorkflowRunner` instance — not the prior `null` / placeholder.
3. A standard-profile sprint in production mode runs the configured quality stages and records their outputs (no fall-through to the no-op branch).
4. The strict profile fails closed when any required quality stage is misconfigured (rather than silently degrading to none).
5. Red test: under HEAD before this fix, a standard-profile sprint does not run any quality stage (current behavior). Green: after the fix, all configured quality stages run and their outputs are persisted.
6. `bun --cwd pivot test`, `bun --cwd frontend test`, and the E2E quality-workflow suite (`bun --cwd frontend test:e2e -- quality-workflow.spec.ts`) all pass.
7. `bun --cwd pivot typecheck` clean.
8. `graph.db` is updated.

## Non-Goals

- Adding new quality stage types (strategy/Red/Green/etc. are unchanged).
- Replacing the QualityWorkflowRunner implementation.
- Touching the dispatcher / reviewer / merger stages.

## Verification

- `bun --cwd pivot test`
- `bun --cwd frontend test`
- `bun --cwd frontend test:e2e -- quality-workflow.spec.ts`
- `bun --cwd pivot typecheck`
- `build-graph update ./graph.db`

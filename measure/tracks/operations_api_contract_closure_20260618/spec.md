# Spec: Operations API Contract Closure

## Goal

Operations pages must be backed by real pivot routes and Convex persistence. UI tests that mock happy paths are not enough; the server contract must exist and match the UI.

## Acceptance Criteria

1. `GET /api/reconciliation/proposals` returns pending proposals with the shape expected by `ReconcilePanel`.
2. `POST /api/reconciliation/proposals/:id/apply` resolves a proposal as applied and records any required decision/evidence.
3. `POST /api/reconciliation/proposals/:id/reject` resolves a proposal as rejected.
4. Reconciliation routes are registered in `server.ts` and covered by pivot route tests.
5. `GET /api/pipelines` returns recent pipeline executions for `PipelineList`.
6. Pipeline trigger/status/log routes use real Convex persistence instead of stub return values.
7. `convex/pipelines.ts` either becomes real or is deleted in favor of `convex/pipelineRuns.ts`; no public production function may return a placeholder for a live page.
8. Frontend tests assert route URLs, response shape, loading, error, empty, apply/reject, trigger, and log selection behavior.
9. A route-inventory/contract test compares frontend `/api/...` fetches against registered pivot routes.

## Non-Goals

- Redesigning Operations navigation.
- Implementing a full reconciliation patch engine beyond apply/reject state transitions already represented by existing Convex functions.

## Verification

- `bun --cwd pivot test src/routes/pipelines.test.ts <new reconciliation route test>`
- `bun --cwd frontend test src/pages/Reconcile.test.tsx src/pages/PipelinesPage.test.tsx src/hooks/usePipelineData.test.ts --run`
- `bun --cwd pivot typecheck`
- `bun --cwd frontend check`
- `build-graph update ./graph.db <changed files>`

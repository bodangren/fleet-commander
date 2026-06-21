# Operations API Contract Closure

## Status

New remediation track from the 2026-06-18 post-rewrite wiring review.

## Problem

Several Operations surfaces have UI tests that mock `fetch` successfully but no production route or persistence path behind the same URL.

## Evidence

- `frontend/src/pages/Reconcile.tsx` calls `GET /api/reconciliation/proposals`, `POST /api/reconciliation/proposals/:id/apply`, and `POST /api/reconciliation/proposals/:id/reject`.
- `pivot/src/server.ts` registers no reconciliation route module, and `pivot/src/routes/` has no reconciliation route file.
- `frontend/src/hooks/usePipelineData.ts` calls `GET /api/pipelines`, but `pivot/src/routes/pipelines.ts` only registers trigger, status, and logs routes.
- `convex/pipelines.ts` returns `null`, `[]`, or `'stub-id'` from public pipeline functions used by pivot routes.

## Scope

Wire or remove the production surfaces. The default direction is to wire them because Convex reconciliation and pipeline-run functions already exist.

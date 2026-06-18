# Plan: Operations API Contract Closure

## Phase 1: Red - Contract Inventory

- [x] Task: Add a route-contract test that fails for `GET /api/reconciliation/proposals`. *(commits: 190b0e0, 99b9fd5)*
- [x] Task: Add a route-contract test that fails for `GET /api/pipelines`. *(commits: 190b0e0, 99b9fd5)*
- [x] Task: Add Convex tests proving `convex/pipelines.ts` placeholder functions do not persist or return rows. *(commits: 190b0e0, 99b9fd5)*
- [x] Task: Record all affected frontend callers and pivot/Convex backing functions in this plan. *(commits: 190b0e0, 99b9fd5)*

### Phase 1 Inventory (Task 4)

**Frontend callers (live grep, HEAD):**
- `frontend/src/pages/Reconcile.tsx:139` — `GET /api/reconciliation/proposals`
- `frontend/src/pages/Reconcile.tsx:153` — `POST /api/reconciliation/proposals/:id/apply`
- `frontend/src/pages/Reconcile.tsx:165` — `POST /api/reconciliation/proposals/:id/reject`
- `frontend/src/hooks/usePipelineData.ts:24` — `GET /api/pipelines`
- `frontend/src/hooks/usePipelineData.ts:56` — `POST /api/pipelines/:name/trigger`
- `frontend/src/hooks/usePipelineData.ts:78` — `GET /api/pipelines/:name/status`
- `frontend/src/hooks/usePipelineData.ts:93` — `GET /api/pipelines/:executionId/logs`

**Pivot route registrations (live grep, HEAD):**
- `pivot/src/server.ts:103` — `registerPipelineRoutes(router)` (registers only `:name/trigger`, `:name/status`, `:executionId/logs`)
- `pivot/src/server.ts:116` — `registerPipelineEngineRoutes(router)` (`/api/pipeline-engine/...`, separate URL family)
- No `/api/reconciliation/*` route registration exists at HEAD.

**Convex backing functions (live `build-graph` / source, HEAD):**
- `convex/reconciliationProposals.ts` — `createProposal`, `getProposal`, `listPendingProposals`, `listProposalsByArtifact`, `resolveProposal` (all real, indexed).
- `convex/reconciliationDecisions.ts` — `recordDecision`, `getDecisionByProposal`, `getDecisionByHashes`, `listDecisions` (real).
- `convex/reconciliationEngine.ts` — `batchApplyProposals` (real).
- `convex/pipelineRuns.ts` — `listPipelineRunsHandler`, `getPipelineRunHandler`, `createPipelineRunHandler`, `updatePipelineRunStatusHandler`, `getPipelineRunsByTaskHandler`, `getPipelineRunCostByTaskHandler` (real).
- `convex/pipelines.ts` — `getPipeline`, `getPipelineStatus`, `getPipelineLogs`, `listPipelines`, `startPipeline`, `updatePipelineStatus` (all return `null` / `[]` / `'stub-id'` — placeholders to be replaced or removed in P3).

**Pivot client wrappers (HEAD):**
- `pivot/src/reconciliation/reconciliationClient.ts` — `createProposal`, `getProposal`, `listPendingProposals`, `listProposalsByArtifact`, `resolveProposal`, `recordDecision`, `getDecisionByProposal`, `getDecisionByHashes`, `listDecisions`, `batchApplyProposals` (all real, ready for route wiring).

**Blast radius:** pivot routes (`pipelines.test.ts`, new `reconciliation.test.ts`), convex (`pipelines.test.ts`), frontend (extend `router-inventory.test.ts`), plan + test-strategy. No existing production code modified.

### Phase 1 Red — Targeted Commands And Fail Counts (HEAD)

| Command | Result | Notes |
| --- | --- | --- |
| `bun --cwd pivot test src/routes/reconciliation.test.ts` | **0 pass / 1 fail (module error)** | `Cannot find module './reconciliation'`. Stays red until P2 lands `pivot/src/routes/reconciliation.ts`. |
| `bun --cwd pivot test src/routes/pipelines.test.ts` | **5 pass / 3 fail** | The 3 new `GET /api/pipelines` cases fail with `router.match('GET', '/api/pipelines')` → `null` because the route is not yet registered. |
| `bun test ./convex/pipelines.test.ts` | **6 pass / 0 fail** | Green at HEAD. This is the P3 inversion target — when P3 removes the placeholders these tests must be flipped to assert real behavior. |
| `bun --cwd frontend test src/__tests__/router-inventory.test.ts --run` | **10 pass / 6 fail** | 4 literal-URL tests + 2 cross-reference tests fail; the 4 sanity checks for already-registered `/api/pipelines/:name/trigger|status|logs` and `inventory.md` pass. |

**New files:** `pivot/src/routes/reconciliation.test.ts`, `convex/pipelines.test.ts`. **Extended files:** `pivot/src/routes/pipelines.test.ts` (+3 cases), `frontend/src/__tests__/router-inventory.test.ts` (+10 cases). **Tests added:** 19 new (10 currently failing, 6 currently passing as P3 inversion baseline, 3 sanity passes). **Production code modified:** none.

**Phase 1 Red commit (corrected, no `graph.db`):** `190b0e0` — `test(measure): Phase 1 Red — Operations API contract inventory`. 9 files, 820 insertions, 2 deletions. Excludes `graph.db` per Red-phase boundary (test files + Measure docs only); the prior `d1cdf3b`/`c3b30ca` pair was rolled back because it modified `graph.db` outside scope. The graph.db sync is now owned by the Green/Closeout role (see P4 Task 2).

## Phase 2: Reconciliation Routes

- [x] Task: Create `pivot/src/routes/reconciliation.ts`. *(commit: fb57ae5)*
- [x] Task: Register reconciliation routes from `pivot/src/server.ts`. *(commit: fb57ae5)*
- [x] Task: Reuse existing Convex functions via `api.reconciliationProposals.listPendingProposals` and `api.reconciliationProposals.resolveProposal`. *(commit: fb57ae5)*
- [x] Task: Normalize response shape to the existing `ReconciliationProposalEntry` frontend contract. *(commit: fb57ae5)*
- [x] Task: Add route tests for list, apply, reject, missing id, and Convex errors. (Tests were written in Phase 1 Red; Green makes them pass.) *(commit: fb57ae5)*

## Phase 3: Pipeline Persistence

- [~] Task: Decide whether `convex/pipelines.ts` should delegate to `pipelineRuns` or be removed.
- [x] Task: Implement `GET /api/pipelines` using real persisted execution rows via `api.pipelineRuns.listPipelineRunsHandler`. *(commit: fb57ae5)*
- [ ] Task: Replace `startPipeline`, `updatePipelineStatus`, and `getPipelineLogs` placeholders with real writes/reads or move callers to existing real functions.
- [ ] Task: Add tests proving triggered executions appear in the list and logs/status routes do not return hardcoded placeholders.

## Phase 4: UI And Verification

- [ ] Task: Extend `ReconcilePage` tests to cover page-level fetch/apply/reject flows, not only `ReconcilePanel`.
- [ ] Task: Extend `PipelinesPage`/hook tests for production response shape and error states.
- [ ] Task: Run pivot/frontend focused tests and typechecks.
- [x] Task: Run `build-graph update ./graph.db` for changed source/test files. *(commit: fb57ae5 — graph.db updated with reconciliation.ts, pipelines.ts, server.ts)*
- [ ] Task: Update `measure/tech-debt.md` and close TD entries created for this review.

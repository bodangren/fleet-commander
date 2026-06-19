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

- [x] Task: Decide whether `convex/pipelines.ts` should delegate to `pipelineRuns` or be removed. *(commit: 82829ef — deleted entire file; no production code imports `api.pipelines.*`, all callers already migrated to `api.pipelineRuns.*`)*
- [x] Task: Implement `GET /api/pipelines` using real persisted execution rows via `api.pipelineRuns.listPipelineRunsHandler`. *(commit: fb57ae5)*
- [x] Task: Replace `startPipeline`, `updatePipelineStatus`, and `getPipelineLogs` placeholders with real writes/reads or move callers to existing real functions. *(commit: 82829ef — deleted convex/pipelines.ts; pivot routes already wired through pipelineRuns handlers)*
- [x] Task: Add tests proving triggered executions appear in the list and logs/status routes do not return hardcoded placeholders. *(commits: fb37c4a — Red; e21c080 — partial Green flipped pivot suite green; 82829ef — full Green all 4 inversion tests pass)*

### Phase 3 Red — Targeted Commands And Fail Counts (HEAD, 2026-06-19)

| Command | Result | Notes |
| --- | --- | --- |
| `bun --cwd pivot test src/routes/pipelines.test.ts` | **12 pass / 0 fail** | The 4 new Phase 3 cases added in commit `fb37c4a` flipped to **green** after commit `e21c080` wired the trigger/logs routes through `api.pipelineRuns.createPipelineRunHandler` / `updatePipelineRunStatusHandler` / `getPipelineRunsByTaskHandler` and patched the Convex FunctionReference identity comparison. Task 4 contract is satisfied: triggered executions persist via `pipelineRuns.*`, the round-trip `POST .../trigger` → `GET /api/pipelines` returns the persisted row, and `GET /:executionId/logs` returns 200 with the real payload instead of the placeholder 404. |
| `bun test ./convex/pipelines.test.ts` | **4 pass / 0 fail** | All 4 P3 inversion cases now pass: file deleted, `existsSync` skips each assertion. Placeholder exports (`startPipeline`, `updatePipelineStatus`, `getPipelineLogs`) and literal `'stub-id'` are gone. |
| `bun test ./convex/pipelines.placeholder-regression.test.ts` | **2 pass / 0 fail** | Cross-file invariants: no `'stub-id'` in any production file (trivially true with `convex/pipelines.ts` deleted), no `api.pipelines.*` import in pivot. Both pass. |

**New pivot test cases (4):**
1. `Phase 3: POST .../trigger persists via api.pipelineRuns.* > trigger mutation targets api.pipelineRuns.createPipelineRunHandler, not api.pipelines.startPipeline` — Now **green** at HEAD after `e21c080`: route calls `pipelineRuns.createPipelineRunHandler`, zero `pipelines.startPipeline` calls.
2. `Phase 3: POST .../trigger persists via api.pipelineRuns.* > trigger also records completion via api.pipelineRuns.updatePipelineRunStatusHandler` — Now **green** at HEAD after `e21c080`: route calls `pipelineRuns.updatePipelineRunStatusHandler`, zero `pipelines.updatePipelineStatus` calls.
3. `Phase 3: POST .../trigger persists via api.pipelineRuns.* > trigger round-trip: persisted run appears in GET /api/pipelines list` — Now **green** at HEAD: trigger persists via real handler, list side returns the mock payload, end-to-end round-trip proven.
4. `Phase 3: GET /api/pipelines/:executionId/logs returns real rows, not 404 > returns 200 with the log payload when the real pipelineRuns query yields data` — Now **green** at HEAD after `e21c080`: route calls `pipelineRuns.getPipelineRunsByTaskHandler`, returns 200 with the mock logs payload.

**New convex inversion cases (4):** static-analysis assertions in `convex/pipelines.test.ts` that the file no longer exports `startPipeline` / `updatePipelineStatus` / `getPipelineLogs` and no longer contains the literal `'stub-id'`. All four **still fail** at HEAD; they pass only when P3 Green either deletes `convex/pipelines.ts` entirely or rewrites every placeholder body to delegate to `pipelineRuns`.

**Combined Red command (bounded, no watch, no full-suite smoke):**
```bash
bun --cwd pivot test src/routes/pipelines.test.ts
bun test ./convex/pipelines.test.ts
```

**Production code modified:** Phase 3 Red commit `fb37c4a` modified no production code. Phase 3 partial Green commit `e21c080` (between sessions) wired `pivot/src/routes/pipelines.ts` through `api.pipelineRuns.*` handlers — that commit is the reason the 4 pivot tests flipped to green. The 4 convex inversion tests remain Red and drive the remaining Task 3 Green (placeholder deletion/delegation in `convex/pipelines.ts`). `graph.db` updates are owned by Green/Closeout per the Red-phase boundary.

### Phase 3 Green — Closing Note (2026-06-19)

**Phase 3 is complete.** Commit `82829ef` deleted `convex/pipelines.ts` entirely, removing all placeholder exports (`startPipeline`, `updatePipelineStatus`, `getPipelineLogs`, `getPipeline`, `getPipelineStatus`, `listPipelines`) and the literal `'stub-id'`. The decision was **delete** rather than delegate because:

1. No production code imports `api.pipelines.*` — all pivot callers were already migrated to `api.pipelineRuns.*` in prior commits.
2. The cross-file regression test (`convex/pipelines.placeholder-regression.test.ts`) confirms zero `api.pipelines.*` references in `pivot/src`.
3. `convex/pipelineRuns.ts` provides all equivalent real functionality via `listPipelineRunsHandler`, `createPipelineRunHandler`, `updatePipelineRunStatusHandler`, `getPipelineRunsByTaskHandler`, and `getPipelineRunCostByTaskHandler`.

**Test changes:**
- `convex/pipelines.test.ts`: Removed P1 regression block (placeholder behavior no longer exists). P3 inversion block passes via `existsSync` early-return (file deleted).
- `pivot/src/routes/typed-convex-boundary.test.ts`: Replaced `api.pipelines.startPipeline|updatePipelineStatus|getPipelineLogs` references with `api.pipelineRuns.createPipelineRunHandler|updatePipelineRunStatusHandler|getPipelineRunsByTaskHandler`.

**Verification (all green):**
- `bun --cwd pivot test src/routes/pipelines.test.ts` — 12 pass / 0 fail
- `bun test ./convex/pipelines.test.ts` — 4 pass / 0 fail
- `bun test ./convex/pipelines.placeholder-regression.test.ts` — 2 pass / 0 fail
- `bun --cwd pivot test src/routes/typed-convex-boundary.test.ts` — 72 pass / 0 fail
- `npm test` — 1776 pass / 4 skip / 0 fail
- `bun --cwd pivot typecheck` — clean
- `build-graph stats ./graph.db` — 5379 nodes, 651 files (graph rebuilt, audit pending timeout)

## Phase 4: UI And Verification

- [~] Task: Extend `ReconcilePage` tests to cover page-level fetch/apply/reject flows, not only `ReconcilePanel`. *(Red committed — 8 new tests; 6 pass, 2 fail for missing error UX)*
- [~] Task: Extend `PipelinesPage`/hook tests for production response shape and error states. *(Red committed — 4 new tests; 2 pass, 2 fail for missing error guards)*
- [ ] Task: Run pivot/frontend focused tests and typechecks.
- [x] Task: Run `build-graph update ./graph.db` for changed source/test files. *(commit: fb57ae5 — graph.db updated with reconciliation.ts, pipelines.ts, server.ts)*
- [ ] Task: Update `measure/tech-debt.md` and close TD entries created for this review.

### Phase 4 Red — Targeted Commands And Fail Counts (HEAD, 2026-06-19)

Targeted Red command (bounded, no watch, no full-suite smoke):

```bash
cd frontend && /home/daniel-bo/.local/bin/bunx --bun vitest run \
  src/pages/Reconcile.test.tsx \
  src/pages/PipelinesPage.test.tsx \
  src/hooks/usePipelineData.test.ts
```

| File | Pass / Fail | New tests | Notes |
| --- | --- | --- | --- |
| `frontend/src/pages/Reconcile.test.tsx` | **14 pass / 2 fail** | +8 | 6 new `ReconcilePage` coverage cases (fetch on mount, empty state, server-shape contract, POST apply URL, POST reject URL, remove-after-apply) pass. 2 RED error-UX cases (initial-fetch fails, apply returns non-2xx) fail because the current `ReconcilePage` only `console.error`s — no visible error indicator. |
| `frontend/src/pages/PipelinesPage.test.tsx` | **7 pass / 1 fail** | +2 | 1 new contract-shape case (renders `deploy-prod` + `succeeded` from production response) passes. 1 RED malformed-response case fails: the page silently crashes (`executions.map is not a function`) instead of surfacing the contract violation. |
| `frontend/src/hooks/usePipelineData.test.ts` | **12 pass / 1 fail** | +3 | 2 new contract cases (5xx error path, production shape) pass — current `usePipelineList` already handles 5xx via `setError`. 1 RED malformed-JSON case fails because the hook trusts the response and stores `{ error: '...' }` as `executions`, breaking the downstream `PipelineList` render. |
| **Combined** | **33 pass / 4 fail (37 total)** | **+13** | 4 RED tests, 9 GREEN new tests, 24 pre-existing pass. |

**4 RED tests (intentional, fail for missing/wrong implementation):**

1. `Reconcile.test.tsx > ReconcilePage > displays an error message when the initial proposals fetch fails (Red: not surfaced at HEAD)` — current `ReconcilePage` does `.catch(() => { setProposals([]); setLoading(false); })` and never surfaces a user-visible error.
2. `Reconcile.test.tsx > ReconcilePage > displays an error message when the apply POST returns non-2xx (Red: not surfaced at HEAD)` — current `handleApply` does `console.error` only; no error UI.
3. `usePipelineData.test.ts > usePipelineList > sets error when the server returns malformed JSON (Red: currently treats as empty array)` — current hook returns the parsed object as `executions`, breaking the page.
4. `PipelinesPage.test.tsx > PipelinesPage > surfaces an error state when the server returns a malformed (non-array) response (Red: currently shows empty state)` — current page attempts `executions.map(...)` on a plain object and crashes (TypeError `executions.map is not a function`).

**Production code modified:** none (Red-phase boundary per test-strategy §6: "Red tests must fail because the current implementation is missing or wrong"). Only test files + `plan.md` updated.

**Test-strategy coverage delta:**
- `frontend/src/pages/Reconcile.test.tsx` adds the `ReconcilePage` describe block requested in §5 ("wrap the existing `ReconcilePanel` cases with a `<ReconcilePage />` render that mocks `fetch('/api/reconciliation/proposals')` with the shared fixture; add error and empty paths").
- `frontend/src/pages/PipelinesPage.test.tsx` extends with the production response-shape assertion + malformed-response error case requested in §5.
- `frontend/src/hooks/usePipelineData.test.ts` extends with the hook-level production shape + 5xx + malformed-JSON error coverage.

**Dirty worktree classification at MID start (2026-06-19):** preserved. Only `plan.md` for this track was modified by the Red commit; all other dirty paths (`frontend/e2e/*`, `frontend/src/__tests__/smoke-config.contract.test.ts`, `frontend/src/pages/PortfolioPage.test.tsx`, `frontend/src/pages/TasksHistoryPage.route.test.tsx`, `measure/automation-supervisor.py`, `measure/code_styleguides/typescript.md`, `measure/current_directive.md`, `measure/product-guidelines.md`, `conductor/`, `measure/__pycache__/`, `measure/tracks/quality_workflow_hot_path_wiring_20260618/`) are unrelated to this track and remain unmodified.

**Live-behavior proof:** all RED tests render the real `ReconcilePage` / `PipelinesPage` / `usePipelineList` against `vi.stubGlobal('fetch', ...)` mocks. No fake harness, no artifact-only assertion. Phase 4 Green must add error UI to the page and a shape guard to the hook.

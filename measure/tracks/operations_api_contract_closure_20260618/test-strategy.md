# Test Strategy: Operations API Contract Closure

## 1. Testing Pyramid Per Phase

| Phase | Unit / Component | Route Contract | Integration | UI |
| --- | --- | --- | --- | --- |
| P1 Red Inventory | — | new pivot route tests for `/api/reconciliation/proposals` and `/api/pipelines` (intentionally red); convex unit tests asserting placeholders return null/`[]`/`'stub-id'` | route-inventory contract test extended to cover both URL families | — |
| P2 Reconciliation | route handler unit tests against mocked `ConvexHttpClient` (mirrors `retrospectives.test.ts` pattern) | list / apply / reject / 404 / Convex error | reuse `pivot/src/reconciliation/reconciliationClient.ts`; assert calls land on `api.reconciliationProposals.*` | — |
| P3 Pipeline Persistence | convex unit tests on real `pipelineRuns` handlers (or proof `convex/pipelines.ts` is deleted) | `GET /api/pipelines`, plus updated tests for trigger/status/logs | trigger → list round-trip with mocked client returning persisted rows | — |
| P4 UI & Verification | hook tests (`usePipelineData`) + page tests (`Reconcile.test.tsx`, `PipelinesPage.test.tsx`) for shape, loading, error, empty, apply/reject, log selection | route-inventory contract test green | — | RTL renders cover page-level fetch flows, not just panels |

## 2. Shared Fixtures / Mocks

- `mockClient = { mutation: mock(...), query: mock(...) }` per `retrospectives.test.ts:5` — reuse verbatim for new reconciliation route tests.
- A new `frontend/src/__fixtures__/reconciliationFixtures.ts` exporting one canonical `ReconciliationProposalEntry` (matches `frontend/src/lib/convex-data/reconciliation.ts:43`) consumed by both `Reconcile.test.tsx` and pivot route tests' expected JSON shape (importable via type-only import to avoid cross-package coupling).
- Reuse existing `PipelineExecutionSchema` (pivot/src/pipeline/types.ts) as the pivot-side response contract; frontend mirrors it as a type-only declaration in `usePipelineData.ts`.
- `makeRequest(method, path, body)` helper from `retrospectives.test.ts:17` — copy into reconciliation test file.

## 3. Cross-Phase Edge Cases & Dependencies

- **Apply/reject of unknown id** — must 404, not 500 (Convex returns null).
- **Convex unavailable** — pipeline trigger already swallows error in `pipelines.ts:25`; same tolerance must apply to reconciliation list (return `[]` or 503 — pick one and assert).
- **Stub vs real** — `convex/pipelines.ts:80` returns `'stub-id'`; pipeline trigger currently persists fake data. P3 must either delete `convex/pipelines.ts` entirely (then prove no `api.pipelines.*` import survives) or replace handlers with real `pipelineRuns` writes. Either path needs a regression test asserting `'stub-id'` is no longer returned by any production query.
- **Frontend filters non-pending** (`Reconcile.tsx:49`) — server contract may return mixed statuses; tests must lock that the page-level fetch returns server-shaped objects and the panel filters correctly.
- **Route registration order** — `server.ts:103` registers pipelines; reconciliation must be added in the same neighborhood and asserted by the inventory test.

## 4. Architecture Guardrails

- No new convex client created at module top-level for reconciliation routes — accept the `ConvexHttpClient` via `register*Routes(router, convexClient)` like every other route module.
- Do **not** introduce a parallel reconciliation client — reuse `pivot/src/reconciliation/reconciliationClient.ts` (`createProposal`, `listPendingProposals`, `resolveProposal`).
- Frontend `ReconciliationProposalEntry` is the contract: route response JSON shape is verified against this type via a structural assertion (no runtime zod added).
- Do not relax `convex/pipelines.ts` validators — replace bodies with real persistence or delete the file; placeholder-returning public functions are forbidden by AC #7.
- `build-graph update ./graph.db` runs after every commit touching pivot/, frontend/, or convex/ source.

## 5. Per-Phase Test Approach

- **P1 Red Inventory**: write the failing pivot route tests *first* (file paths: `pivot/src/routes/reconciliation.test.ts`, augment `pivot/src/routes/pipelines.test.ts` for `GET /api/pipelines`). Add a convex-side unit test (`convex/pipelines.test.ts`) asserting current placeholder behavior — this test is the artifact that proves the regression and gets inverted in P3. Extend `frontend/src/__tests__/router-inventory.test.ts` to cross-check `/api/reconciliation/*` and `/api/pipelines` are registered (red until P2/P3).
- **P2 Reconciliation**: TDD from the P1 red — green by adding `pivot/src/routes/reconciliation.ts` (mirror `retrospectives.ts`), wire into `server.ts`. Tests: list (empty + populated), apply success → status applied, reject success → status rejected, 404 for missing id, propagated Convex error → 500.
- **P3 Pipeline Persistence**: invert the placeholder test from P1; add `pivot/src/routes/pipelines.test.ts` cases for `GET /api/pipelines` happy/empty/error; update `storeExecution` assertions to write through `api.pipelineRuns.createPipelineRunHandler`. If `convex/pipelines.ts` is deleted, also add a doctor-style test (or grep-based unit) that ensures no `api.pipelines.*` reference remains in pivot.
- **P4 UI & Verification**: extend `Reconcile.test.tsx` to wrap the existing `ReconcilePanel` cases with a `<ReconcilePage />` render that mocks `fetch('/api/reconciliation/proposals')` with the shared fixture; add error and empty paths. `PipelinesPage.test.tsx` already mocks `/api/pipelines` — extend to assert response shape matches the new server contract and add a malformed-response error case. Run focused suites listed in spec.md §Verification.

## 6. Build-Graph Findings That Shaped Strategy

- `build-graph query routes` confirms only `/api/pipelines/:name/...` and `/api/pipeline-engine/...` exist; no `/api/reconciliation/*` routes are registered. This is the live evidence behind AC #1–4.
- `build-graph callers registerPipelineRoutes` returned 0 — registration happens via dynamic import in `server.ts:103`; the inventory contract test (not the graph) is the right guardrail.
- `build-graph search reconciliation` revealed real Convex backings exist (`convex/reconciliationProposals.ts` exports `listPendingProposals`, `resolveProposal`, `getProposal`) and pivot already has `reconciliationClient.ts` — confirms wire-don't-rewrite direction.
- `build-graph search pipeline` found `convex/pipelineRuns.ts` exports `listPipelineRunsHandler` / `createPipelineRunHandler` / `updatePipelineRunStatusHandler` — delegation target for P3.
- Graph also surfaced `frontend/src/__tests__/router-inventory.test.ts` — already in place; extend rather than create a new contract harness.
- `build-graph stats` shows 651 files / 5362 nodes; impact is contained to ~6 files (pivot routes, server, convex pipelines, frontend page/hook + tests). Blast radius: low.

## 7. Live-Proof Plan (Red → Green Per Phase)

| Phase | Targeted Red Command | Green / Closeout Gate |
| --- | --- | --- |
| P1 | `bun --cwd pivot test src/routes/reconciliation.test.ts src/routes/pipelines.test.ts --bail` (must fail on the new cases) + `bun --cwd frontend test src/__tests__/router-inventory.test.ts --run` | Same commands all pass; failures listed in plan as `[~]` until handed off |
| P2 | `bun --cwd pivot test src/routes/reconciliation.test.ts --bail` | `bun --cwd pivot test src/routes/reconciliation.test.ts --run` + `bun --cwd pivot typecheck` |
| P3 | `bun --cwd pivot test src/routes/pipelines.test.ts --bail` + `bun --cwd convex test pipelines.test.ts --run` (asserts placeholders gone) | Same suites green + grep-style assertion `! grep -R "api.pipelines.startPipeline" pivot/src` if `convex/pipelines.ts` is deleted |
| P4 | `bun --cwd frontend test src/pages/Reconcile.test.tsx src/pages/PipelinesPage.test.tsx src/hooks/usePipelineData.test.ts --run` (page-level cases red first) | Full spec verification block: pivot tests + frontend tests + `bun --cwd pivot typecheck` + `bun --cwd frontend check` + `build-graph update ./graph.db <changed>` |

### Artifact-Contract vs Live-Behavior Tests

- **Artifact / contract** (no live process): `router-inventory.test.ts` (string-matches registered handlers vs frontend fetch URLs), the type-shape assertion against `ReconciliationProposalEntry`, and any grep-style "no `'stub-id'` in production" test. These prove the contract on disk, not runtime behavior.
- **Live behavior**: pivot route tests that build a `Router`, register the real handler, invoke it with a `Request`, and assert response status/body via a mocked `ConvexHttpClient` — these prove the handler executes end-to-end inside Bun. Frontend page tests render the real component and intercept `fetch` to prove the UI consumes the contract. There is no fake harness in this track; `mockClient` is a per-test mock, not a runner. No production gate command is satisfied solely by an artifact test.

### Intentionally-Red Files Surfaced By Aggregate Suites

- `pivot/src/routes/reconciliation.test.ts` will be created red in P1 and stay red until P2 lands. Aggregate `bun --cwd pivot test` will pick it up. Mitigation: P1 commit also marks the corresponding plan tasks `[~]` (owner = current track) and the test file carries a top-of-file comment `// Intentionally failing until Phase 2 of operations_api_contract_closure_20260618`. Do **not** add `.skip`; the red state is the proof. If a separate green CI gate is required between P1 and P2 commits, scope it with `--testNamePattern` to exclude the new file rather than skipping it.
- The convex placeholder regression test added in P1 will be inverted (not deleted) in P3; same `[~]`-owned-by-this-track convention applies.

## MEASURE_AGENT_RESULT
role: strategy
status: complete
track: operations_api_contract_closure_20260618
phase: track setup
commits: none
tests_run: none (strategy authoring only)
files_changed: measure/tracks/operations_api_contract_closure_20260618/test-strategy.md (new)
plan_updates: none — plan.md left untouched per instructions
known_failures: none
handoff: Implementer for Phase 1 should land the red pivot route tests (`pivot/src/routes/reconciliation.test.ts`, extended `pipelines.test.ts`) and the convex placeholder regression test, mark P1 tasks `[~]`, and run `bun --cwd pivot test src/routes/reconciliation.test.ts src/routes/pipelines.test.ts --bail` plus `bun --cwd frontend test src/__tests__/router-inventory.test.ts --run` as the live red gate. Reuse `mockClient` pattern from `retrospectives.test.ts:5` and the `ReconciliationProposalEntry` shape from `frontend/src/lib/convex-data/reconciliation.ts:43`.
END_MEASURE_AGENT_RESULT

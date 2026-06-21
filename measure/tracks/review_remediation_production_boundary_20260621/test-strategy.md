# Test Strategy — Review Remediation: Production Boundary Fixes

> Role: Tech Lead. Scope: test design only. No implementation code herein.
> Source of truth: `spec.md` (AC 1–10), `plan.md` (Phases 1–6).

## 1. Testing Pyramid Per Phase

- **Phase 1 (Red):** unit-level boundary contract tests. Thin, fast, MUST fail at HEAD. No integration.
- **Phase 2 (Green — Quality):** unit (executor `cwd`, runner retry) + integration (lifecycle hooks → convex mutation args via fake client). Pyramid mid-base.
- **Phase 3 (Green — Ops API):** unit (row→`PipelineExecution` mapper, bounded-list query construction) + integration (route → `createPipelineRunHandler` args, error propagation).
- **Phase 4 (Green — Route drift):** unit/contract (handler-name strings, smoke-config on-disk shape).
- **Phase 5 (Real-behavior):** integration replacing vacuous mocks — asserts real side effects (mutation call args, cwd, mapped shapes).
- **Phase 6 (Closeout):** full aggregate suites + typecheck + lint + graph audit (apex/acceptance).

## 2. Shared Fixtures & Mocks

- Reuse `convex/__fixtures__/history.ts`. Promote inline `sampleTask`/`shellStage` helpers (seen in `.red.test.ts`) into a shared `pivot/src/orchestrator/__fixtures__/qualityStage.ts`.
- Shared fake convex client for runner plumbing ONLY: `mockClient = { mutation: mock(), query: mock() }` with `Symbol.for('functionName')` extraction (pattern in `pipelines.red.test.ts:18-27`).
- Import the REAL generated `api` (`convex/_generated/api`) for handler-name + arg-shape contract assertions — never hardcode names.

## 3. Cross-Phase Edge Cases & Dependencies

- Phase 2 `executeCommand` gains an OPTIONAL trailing `cwd` arg → additive; existing callers don't break, but `mock.module('./executor')` spies must add the new positional arg or assertion.
- Phase 3 `pipelineRuns.executionId` is `v.optional(v.string())` → additive schema field; no migration break.
- Phase 4 handler names must match the EXACT `*Handler` exports in `convex/qualityRuns.ts`, `convex/history/*` source — NOT the graph (graph is stale for convex, see §6).
- Phase 5 regression tests depend on Phases 2–4 green; each must be shown red against the pre-fix commit, then green on current.
- Unbounded `.collect()` (AC 6) spans Phases 3 + convex list handlers — coordinate the limit constant in one place.

## 4. Architecture Guardrails

- Pivot routes MUST NOT pass a runner UUID where Convex expects `v.id('tasks')`; use the separate `executionId: string` field.
- Raw `pipelineRuns` rows MUST be mapped to `PipelineExecution[]` at the pivot boundary; no DB rows cross to frontend.
- Convex list queries (`listPipelineRunsHandler`, `listQualityRunsByStatusHandler`, `listTaskHistoryHandler`) MUST bound `.collect()` with a default limit.
- Shell quality stages MUST run with `cwd = project.rootPath`; `StageResult.attempt` MUST reflect the actual retry count.
- History hooks MUST call `*Handler` exports (not the pre-rename names).

## 5. Per-Phase Test Approach

- **P1:** Add `.red.test.ts` proving each bug; record baseline `build-graph stats` + suite output. No green gate.
- **P2:** Flip `productionQualityWorkflowHooks.red.test.ts` green; update `executor.test.ts` + `qualityWorkflowRunner.test.ts` for the new `runStage`/`cwd` signature.
- **P3:** Flip `pipelines.red.test.ts` green; add mapper unit test + a bounded-query command-construction test (asserts `.take(N)`/limit wiring without a convex deployment).
- **P4:** Flip `history.test.ts` + `smoke-config.contract.test.ts` green; run `bun --cwd frontend check`.
- **P5:** Add real-side-effect regression tests; verify red@pre-fix-commit, green@current.
- **P6:** Full suites + typecheck + lint + safe graph rebuild + audit.

## 6. build-graph Findings Shaping This Strategy

- `graph.db` mtime Jun 19 (>24h stale). Stats healthy (5390 nodes, 654 files, pivot 304 / frontend 246 / convex 92).
- **Convex handlers absent from graph:** `createPipelineRunHandler`, `listPipelineRunsHandler`, `listTaskHistoryHandler`, `startQualityRunHandler` not indexed → blast-radius for the convex layer CANNOT use `callers`; verify against source.
- **`calls` edges missing:** `build-graph callers executeCommand` and `callers runConfiguredQualityWorkflow` return no `calls` edges (only `contains`/`param_flow`) → caller analysis unreliable for this track. Use grep/source inspection during implementation.
- Symbols located via graph: `executeCommand`@`pivot/src/orchestrator/executor.ts`; `createProductionQualityWorkflowHooks`@`pivot/src/orchestrator/productionQualityWorkflowHooks.ts`; `runConfiguredQualityWorkflow`@`pivot/src/orchestrator/qualityWorkflowDispatch.ts`; `sequenceQualityStages`/`QualityWorkflowRunner`@`pivot/src/orchestrator/qualityWorkflowRunner.ts`; `StageExecutor` iface@`pivot/src/pipeline/agentTypes.ts`.
- **Phase 6 MUST safe-rebuild** (temp-then-swap per AGENTS.md) before `build-graph audit`; never `scan ./ ./graph.db` directly.

## 7. Live-Proof Plan — Targeted Red Command & Green/Closeout Gate

| Phase | Targeted Red command (expect FAIL at HEAD) | Green / closeout gate (expect PASS) |
|---|---|---|
| 1 | `bun --cwd pivot test src/orchestrator/productionQualityWorkflowHooks.red.test.ts src/routes/pipelines.red.test.ts --run`; `bun --cwd frontend test src/__tests__/smoke-config.contract.test.ts src/lib/convex-data/history.test.ts --run` | none — record baseline + `build-graph stats ./graph.db` |
| 2 | (re-run P1 pivot red file) | `bun --cwd pivot test src/orchestrator/productionQualityWorkflowHooks.red.test.ts src/orchestrator/qualityWorkflowRunner.test.ts src/orchestrator/executor.test.ts --run` + `bun --cwd pivot typecheck` |
| 3 | (re-run `pipelines.red.test.ts`) | `bun --cwd pivot test src/routes/pipelines.test.ts src/routes/pipelines.red.test.ts --run` + bounded-query construction test PASS + `bun --cwd pivot typecheck` |
| 4 | (re-run frontend red files) | same frontend command PASS + `bun --cwd frontend check` |
| 5 | new regression tests FAIL @ pre-fix git commit | same tests PASS @ current HEAD |
| 6 | — | `bun --cwd pivot test`; `bun --cwd frontend test`; `bun --cwd pivot typecheck`; `bun --cwd frontend check`; `npm run lint`; safe-rebuild then `build-graph stats ./graph.db && build-graph audit ./graph.db` |

## Artifact/Contract Tests vs Live-Behavior Tests

- **Artifact/documentation contract tests** (prove the surface exists & is named): `smoke-config.contract.test.ts` (on-disk JSON shape); handler-name assertions via `Symbol.for('functionName')` in `.red.test.ts`; history `*Handler` string assertions. These CANNOT prove runtime behavior.
- **Live-behavior tests** (Phase 5): assert actual mutation args (`mock.calls`), actual `cwd` on `Bun.spawn`, actual mapped `PipelineExecution[]` shape returned. These prove runtime behavior.
- **Fake-harness policy:** `mockClient` fakes are for runner plumbing ONLY. Every production-gate command they cover (e.g. trigger route) MUST also have a bounded NON-fake command-construction proof: import the real `api` reference + assert the args object matches the Convex validator arg shape — a single synchronous check that cannot fall through into a full suite.

## Intentionally-Red Test Files & Aggregate-Suite Discovery

- `pivot/src/orchestrator/productionQualityWorkflowHooks.red.test.ts` and `pivot/src/routes/pipelines.red.test.ts` are intentionally red at HEAD. They match the default Vitest glob (`**/*.test.ts`) and ARE discovered by the aggregate `bun --cwd pivot test`. Until Phases 2–3 flip them green, the FULL pivot suite is RED-by-design.
- `frontend/src/__tests__/smoke-config.contract.test.ts` is red at HEAD (path drift). Owned by Phase 4.
- **Ownership/exclusion:** these files are NOT added to a vitest `exclude`. They are owned by their still-`[~]` Phase-1/Phase-4 tasks. The aggregate `bun --cwd pivot test` / `bun --cwd frontend test` is a VALID gate ONLY after the owning phase marks them `[x]`. Before then, the only valid gates are the targeted per-file commands in §7.
- No red file is left orphan: each maps to a plan task that flips it green or removes it.

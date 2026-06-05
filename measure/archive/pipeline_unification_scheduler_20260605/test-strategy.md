# Test Strategy: Pipeline Unification & Scheduler Hardening

## 1. Testing Pyramid Per Phase

### Phase 1 — Characterization Tests & Pure Functions
- **100% unit.** All functions are pure (no I/O, no Convex calls).
- Unit tests for `withExecutionGuard`, `detectStuckTasks`, `detectOrphanSprints`, `reconcileTaskState` in `pivot/src/orchestrator/`.
- No integration or e2e needed — functions accept plain data, return plain data.

### Phase 2 — Pipeline Unification
- **80% unit / 20% integration.**
- Unit: redirect mappings, status-transition parity between old scheduler and orchestrator stages.
- Integration: `runAllProjects` through production imports to confirm status lifecycle (`ready → in_progress → for_review → merged`) still completes end-to-end.
- No e2e — no user-facing surface changed yet.

### Phase 3 — Scheduler Hardening
- **60% unit / 40% integration.**
- Unit: `withExecutionGuard` wiring into `AutoRunner.tick`, AbortController cleanup paths, retry-policy config parsing.
- Integration: `AutoRunner` start → tick → overlap prevention → stop (production imports); `sendPromptToSession` abort mid-flight, resource cleanup, no orphan sessions.
- These are the highest-risk integration tests — they validate concurrency safety.

### Phase 4 — Reconciliation Auto-Repair
- **30% unit / 50% integration / 20% e2e.**
- Unit: `loadCanonicalState`, `saveCanonicalState`, differ functions (`taskDiffer`, `issueDiffer`, `trackMetadataDiffer`).
- Integration: `runReconciliationSweep` with real disk I/O; `repairStuckTasks` / `closeOrphanSprints` Convex mutations (idempotency, guard conditions).
- E2E: create drift → sweep → detect → repair → verify fix, exercising the full pipeline from sweep through Convex mutation.

### Phase 5 — Verification
- **Manual + smoke.** Run existing test suites (`bun --cwd pivot test && bun --cwd frontend test`), typecheck, graph update.
- No new automated tests — this phase validates the whole system.

## 2. Shared Test Fixtures & Mocks

| Fixture | Purpose | Used In |
|---------|---------|---------|
| `TaskFactory` | Build tasks with configurable status, timestamps, dependencies | Phases 1, 3, 4 |
| `SprintFactory` | Build sprints with configurable task sets and status | Phases 1, 4 |
| `PipelineRunFactory` | Build pipeline runs with start/end times, task refs | Phases 1, 3, 4 |
| `mockConvexClient` | Lightweight Convex client stub for mutation/query fakes | Phases 2, 3, 4 |
| `tempProjectDir` | `mkdtemp`-based directory for canonical state disk I/O tests | Phase 4 |

**Guidelines:**
- Prefer factory functions over hard-coded JSON fixtures — they compose and avoid drift (see TD-226).
- `mockConvexClient` must stub `ctx.db` methods (`get`, `insert`, `patch`, `query`) — never import real Convex helpers.
- Reset module-level caches in `beforeEach` (per lesson `bun_mock_module`).

## 3. Cross-Phase Edge Cases & Dependencies

- **Phase 1 → 3:** `withExecutionGuard` must be tested for error-recovery before wiring into `AutoRunner.tick`. If the guard doesn't reset its lock on throw, overlapping ticks can permanently deadlock.
- **Phase 1 → 4:** `detectStuckTasks` threshold must match the 30-minute rule from the spec. `reconcileTaskState` must handle circular dependencies (spec: "outside mutation guard") — test that it returns `null` rather than looping.
- **Phase 2 → 3:** Removing `scheduler.ts` must not break `AutoRunner`'s import graph. The integration test for `AutoRunner.tick` implicitly validates this.
- **Phase 3 → 4:** `AbortController` cleanup in `sendPromptToSession` must complete before reconciliation sweep reads session state — otherwise differ detects false drift.
- **Phase 4 Convex mutations:** `repairStuckTasks` and `closeOrphanSprints` must be idempotent — calling twice with the same state must not double-close or double-transition. Race between repair and a concurrently completing task must not move a task from `done` back to `ready`.
- **Clock-dependent logic:** `detectStuckTasks` and `reconcileTaskState` compare `Date.now()` to timestamps. Inject `now` parameter (already done in function signatures) to avoid flaky time-dependent tests.

## 4. Architecture Guardrails

### Reuse These Patterns
- **Pure-function extraction + TDD** for dispatch constraints (lesson `dispatch_constraints`) — already applied to reconciliation helpers.
- **Factory-based test data** over JSON fixtures (lesson from TD-226 fix).
- **`withExecutionGuard` wrapper** for any periodic async callback (lesson `execution_guard`).
- **`AbortController` + `Promise.race`** for cancellation (lesson `abort_over_flag`) — already in `sendPromptToSession`.
- **Dependency injection** over `mock.module()` for Convex clients (lesson `bun_mock_module`).
- **`import.meta.main` guard** for scripts with top-level execution (lesson `import_guard`).

### Anti-Patterns to Avoid
- **`as any` casts** — hide type-system bugs (lesson `as_any_mask`).
- **Flag-based timeout races** — replaced by `AbortController` in Phase 3; do not re-introduce.
- **Hardcoded status strings** — always reference schema validators (lesson `schema_status_drift`).
- **Optimistic state mutation before async confirmation** (lesson `state_mutation`).
- **`.filter()` + `.collect()` in Convex queries** (lesson `convex_queries`) — use indexed queries.
- **`mock.module()`** for module-level caches — inject instead (lesson `bun_mock_module`).
- **Two parallel subsystems for one domain** (lesson `parallel_systems`) — the whole point of Phase 2.

## 5. Per-Phase Test Approach Notes

### Phase 1
- Characterization tests for `PipelineScheduler.runCycle` lock the existing contract before removal.
- Pure-function tests: stuck/recent/done tasks, active-done/active-pending/closed sprints, blocked/ready/stuck reconciliation.
- Target: 100% branch coverage on each pure function.

### Phase 2
- Audit callers via `build-graph deps PipelineScheduler` before deletion.
- Post-removal: run full pivot test suite + typecheck to catch dangling imports.
- Integration test: `runAllProjects` executes the full status lifecycle.

### Phase 3
- `AutoRunner` integration: start → tick → verify single-cycle execution → stop.
- Overlap test: force long-running tick, verify second tick is skipped with warning log.
- `sendPromptToSession` cancellation: abort mid-flight, verify session cleanup, no orphans.
- Retry policy: test config parsing and exponential-backoff timing (inject clock).

### Phase 4
- Differ unit tests: task/issue/trackMetadata added, modified, deleted, unchanged.
- Sweep integration: real `mkdtemp` directory, `loadCanonicalState` + `saveCanonicalState` round-trip.
- Convex mutation tests: `repairStuckTasks` idempotency, `closeOrphanSprints` guard conditions.
- E2E: `createDrift → sweep → detect → repair → verify` in a single test.

### Phase 5
- Manual: start AutoRunner, confirm single-cycle behavior, stuck-task recovery.
- Manual: circular-dependency scenario does not crash reconciliation.
- Smoke: Diagnose view shows `getReconciliationStatus` data.
- Automated: `bun --cwd pivot test && bun --cwd frontend test && bun --cwd pivot typecheck`.

## 6. Build-Graph Findings That Shaped This Strategy

- **`PipelineScheduler`** (pipeline/scheduler.ts) has zero incoming caller edges in the graph — confirming the audit task in Phase 2 is safe; no hidden dependents.
- **`PipelineOrchestrator`** (pipeline/orchestrator.ts) also has zero external callers — safe to remove alongside `PipelineScheduler`.
- **`withExecutionGuard`** has no callers yet in the graph — it must be wired into `AutoRunner.tick` in Phase 3; integration test is critical since the graph can't verify the wiring.
- **`AutoRunner`** has no outgoing dependency edges — likely uses dynamic imports or string-based resolution. Integration tests must exercise the real import path to catch missing wiring.
- **`reconciliationHelpers.ts`** exports `detectStuckTasks`, `detectOrphanSprints`, `reconcileTaskState` — all have parameter edges but no call-graph edges from `sweep.ts`, confirming the Phase 4 wiring task is still needed.
- **`loadCanonicalState` / `saveCanonicalState`** are stubs in the graph (exported, no callers) — Phase 4 must complete them and test disk I/O.
- **`sendPromptToSession`** already references `AbortController` in its summary — the refactor from flags is likely done; Phase 3 integration tests should validate cleanup paths, not the initial conversion.
- **Differ functions** (`taskDiffer`, `issueDiffer`, `trackMetadataDiffer`) each have co-located `.test.ts` files — unit test coverage exists; Phase 4 integration adds sweep-level coverage.
- **`pipeline/` directory** still contains files (`agentTypes.ts`, `costTracker.ts`, `loader.ts`, `runner.ts`, `stages/`) beyond `scheduler.ts` and `orchestrator.ts` — Phase 2 must only remove the two identified files and redirect their callers, not delete the entire directory.

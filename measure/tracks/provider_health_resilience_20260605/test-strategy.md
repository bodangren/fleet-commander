# Test Strategy: Provider Health Monitor & Resilience

## 1. Testing Pyramid per Phase

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| 1: Pure Functions | **Heavy** — scoreProviderHealth, selectFallbackModel, buildHealthAwareFallbackChain, updateHealthState all pure; exhaust boundary cases | None | None |
| 2: Health Probe System | Moderate — ProviderHealthMonitor.probeProvider with mocked fetch; Convex handler validation | **Heavy** — Convex CRUD round-trips via createMockCtx; history `.take(N)` bounds; monitor→mutation wire-up | None |
| 3: Fallback Chains | Moderate — executeTaskWithFallback unit with stubbed executeFn and healthMap | **Heavy** — mock provider failure → verify retry with next model → verify fallbackEvents audit log via Convex mock | None |
| 4: Provider Dashboard | Heavy — ProviderCard, ProviderLatencyChart, FallbackHistoryTable with mocked Convex data via vi.stubGlobal | Moderate — /api/providers/* route handlers with supertest-style assertions | Light — Playwright: load /providers, verify status card renders |
| 5: Convex Client Consolidation | None (already complete, no new logic) | Light — re-run existing pivot test suite to confirm no regressions | None |
| 6: Verification | None | None | **Heavy** — manual outage simulation + recovery (document as runbook, not automated) |

## 2. Shared Test Fixtures & Mocks

### Pivot (bun:test)
- **`makeHealthState()`** / **`makeHealthMap()`** / **`makeProbe()`** — already in `providerHealth.test.ts`; extract to `pivot/src/policy/__fixtures__/providerHealthFixtures.ts` for reuse across monitor and executor tests
- **`MODEL_PROVIDER_MAP`** — same fixture needed by fallback chain and executor tests; extract alongside above
- **Convex API mock** — TD-228 warns that `mock.module('../convexClient')` in `providerHealthMonitor.test.ts` leaks across files. Strategy: inject `typedQuery`/`typedMutation` via constructor param on `ProviderHealthMonitor` instead of module mock, or isolate in a dedicated test file with `mock.restore()` in `afterEach`
- **Stubbed `executeFn`** — for `executeTaskWithFallback` tests: `mock(() => Promise.resolve(...))` that can be toggled to reject with a provider error

### Convex (bun:test)
- **`createMockCtx()`** + **`sampleProviders`** — already in `convex/__fixtures__/foundation.ts`; extend `sampleProviders` with health fields (status, avgLatencyMs, failureCount, lastCheckedAt)
- **`sampleFallbackEvents`** — new fixture for `fallbackEvents` table rows

### Frontend (vitest)
- **Mock Convex hooks** — `vi.mock('convex/react')` returning deterministic provider health and fallback history data; pattern follows existing `DashboardPage.test.tsx`

## 3. Cross-Phase Edge Cases & Dependencies

| Edge Case | Phases Affected | Notes |
|-----------|----------------|-------|
| Provider health transitions: healthy→degraded→unhealthy and back | 1, 2, 4 | `scoreProviderHealth` boundaries must match Convex status enum exactly; dashboard must re-render on status change |
| All providers unhealthy → `selectFallbackModel` returns null | 1, 3 | Executor must propagate a clear error, not silently hang; fallbackEvents should still record the attempt |
| Degraded provider wins over unhealthy but loses to healthy | 1, 3 | Ordering logic must be consistent between `selectFallbackModel` and `buildHealthAwareFallbackChain` |
| `executeTaskWithFallback` maxFallbacks=0 | 3 | Should behave as single-attempt (no retry); verify no fallbackEvent written |
| History query `.take(N)` with N=0 or N > total rows | 2 | Convex boundary; must not throw |
| Race: probe writes status while executor reads it | 2, 3 | Convex OCC; test that stale reads produce conservative (unhealthy) behavior |
| `persistFallbackEvent` default handler not wired | 3 | Code-review fix already wired it; verify in integration test that the handler is actually called |
| Single data point in ProviderLatencyChart | 4 | Already fixed to render a dot; add regression test |
| Provider not yet in healthMap (cold start) | 1, 3 | `selectFallbackModel` treats unknown as healthy; verify this is intentional and tested |

## 4. Architecture Guardrails

### Reuse
- **Pure function pattern** — health scoring and fallback selection follow `dispatch_constraints` pattern from lessons-learned: extract hard filters as pure functions, TDD without Convex mocking
- **`createMockCtx` + handler pattern** — Convex tests import handler functions directly (not the generated mutation/query wrapper); follow existing `providers.test.ts`
- **`withExecutionGuard`** — wrap `ProviderHealthMonitor` probe cycle to prevent overlapping invocations (per `execution_guard` lesson)
- **AbortController** — for probe timeouts, not flag-based checks (per `abort_over_flag` lesson)

### Anti-Patterns to Avoid
- **`mock.module()` for Convex client** — causes TD-228 cross-test leakage; prefer dependency injection or `mock.restore()`
- **`as any` for Convex IDs** — use `v.id('providers')` in validators and typed IDs in test fixtures (per `as_any_mask` lesson)
- **Unbounded `.collect()`** — all Convex queries must use `.take(N)` (per `convex_queries` gotcha)
- **Status string hardcoding** — derive status values from schema validators, not magic strings (per `schema_status_drift` gotcha)
- **State mutation before async write** — don't update in-memory health map before Convex mutation confirms (per `state_mutation` lesson)

## 5. Per-Phase Test Approach Notes

### Phase 1 (Complete)
Pure function unit tests already exist in `providerHealth.test.ts` (297 lines, strong coverage). No action needed.

### Phase 2 (Incomplete: Convex health CRUD tests)
- Test `updateProviderHealth` handler: probe result → failureCount increment, avgLatencyMs EMA, status transition
- Test `getProviderHealth` handler: returns map of provider→state
- Test `getProviderHistory` handler: bounded with `.take(N)`, verify N=0 edge, verify ordering (most recent first)
- Verify `providerHealthHistory` table rows are inserted on each probe

### Phase 3 (Incomplete: Fallback integration tests)
- Stub `executeFn` to fail with a provider error on first call, succeed on second
- Assert `selectFallbackModel` is called with correct healthMap
- Assert `onFallbackEvent` callback fires with fallbackFrom, fallbackTo, fallbackReason
- Assert fallbackEvents Convex row is persisted via `persistFallbackEvent`
- Test exhausted fallbacks (all unhealthy): executor returns error, single fallbackEvent with null `fallbackTo`

### Phase 4 (Incomplete: Dashboard tests, notification toast)
- **ProviderCard**: render with healthy/degraded/unhealthy status, verify color-coded badge
- **ProviderLatencyChart**: render with single data point (dot), multiple points (sparkline), empty data
- **FallbackHistoryTable**: render with rows, empty state
- **Notification toast**: trigger on status→unhealthy transition; verify toast appears and auto-dismisses
- **API routes**: test `/api/providers/health`, `/api/providers/fallbacks`, `/api/providers/:id/history` with supertest

### Phase 6 (Incomplete: Manual verification)
- Document manual test runbook: block provider endpoint via `/etc/hosts` or proxy, verify dashboard, verify fallback, restore, verify recovery
- Not automated; track as checklist in plan.md

## 6. Build-Graph Findings That Shaped This Strategy

1. **No production callers for core health functions** — `scoreProviderHealth`, `selectFallbackModel`, `buildHealthAwareFallbackChain`, `ProviderHealthMonitor` all have zero incoming `calls` edges from production code. This means integration tests (Phase 3) are critical to verify actual wiring through the executor and router.

2. **`executeTaskWithFallback` has 11 params** — high param count suggests dependency injection is already in place; integration tests should exercise the full param surface, especially `onFallbackEvent` and `healthMap`.

3. **Frontend components missing from graph** — `ProviderCard`, `FallbackHistoryTable` not found via search (likely not scanned or not exported with discoverable names). `ProviderLatencyChart` and `ProvidersPage` are present. Test discovery should rely on file glob patterns rather than graph queries for frontend.

4. **No `fallbackEvents` schema node** — either the table was added after the last scan or uses a different name. Before writing Convex integration tests, run `build-graph update` on `convex/schema.ts` and `convex/providers.ts`.

5. **`persistFallbackEvent` is a function in executor.ts** — its summary references `executeTaskWithFallback`; confirms they are co-located. Integration test should verify this function is called during fallback, not just that the executor returns a result.

6. **4455 nodes / 6373 edges** — the codebase is large enough that blast-radius analysis via `build-graph callers` is essential before any refactor. Phase 5 (consolidation) confirmed zero remaining typedConvexClient imports, but the pattern should be re-verified after each test phase.

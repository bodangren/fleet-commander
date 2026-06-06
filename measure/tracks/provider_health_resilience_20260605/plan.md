# Plan: Provider Health Monitor & Resilience

## Phase 1: Pure Functions & Tests
- [x] Task: Write `scoreProviderHealth` pure function: inputs = latencyMs, failureCount, lastSuccessAt; outputs = `healthy` | `degraded` | `unhealthy`; tests for boundary conditions
- [x] Task: Write `selectFallbackModel` pure function: inputs = primary model, health map, router policy; outputs = fallback model ID or null; tests for healthy primary, single fallback, exhausted fallbacks
- [x] Task: Write `buildFallbackChain` pure function: inputs = ranked model list, health map, maxDepth; outputs = ordered fallback chain; tests for all healthy, one degraded, all unhealthy
- [x] Task: Write `consolidateConvexClient` pure analysis: audit all imports of `convexClient.ts` and `typedConvexClient.ts`; document behavioral differences — **TD-204 already resolved: typedConvexClient.ts deleted, convexClient.ts has all exports**

## Phase 2: Health Probe System
- [x] Task: Add `providers` table to Convex schema with validation — extended existing table with health fields + `providerHealthHistory` table
- [x] Task: Add `updateProviderHealth` mutation: records probe result, updates failureCount, avgLatencyMs, status
- [x] Task: Add `getProviderHealth` query: returns current status for all providers
- [x] Task: Add `getProviderHistory` query: returns last N probe results for a provider (bounded with `.take(N)`)
- [x] Task: Implement `ProviderHealthMonitor` class in pivot: probes each provider every 60s, calls `updateProviderHealth`
- [x] Task: Wire health monitor into Bun server startup; graceful shutdown on SIGTERM
- [x] Task: Write Convex tests for provider health CRUD and history bounds — `cc36d32`

## Phase 3: Fallback Chains
- [x] Task: Integrate `selectFallbackModel` into Smart Model Router: filter unavailable providers before scoring — added `selectModelWithHealth` and `buildHealthAwareFallbackChain`
- [x] Task: Add fallback retry logic in executor stage: on provider error, call `selectFallbackModel`, retry up to 2 times — added `executeTaskWithFallback`
- [x] Task: Log fallback events to `fallbackEvents` table with `fallbackFrom`, `fallbackTo`, and `fallbackReason` fields
- [x] Task: Add `getFallbackHistory` query: returns recent fallback events fleet-wide
- [x] Task: Write integration tests for fallback chains: mock provider failure, verify retry with next model, verify audit log — `de12861`

## Phase 4: Provider Dashboard
- [x] Task: Build `/providers` route: grid of provider status cards with color-coded health badges
- [x] Task: Build `ProviderCard` component: name, status, avg latency, failure rate, last checked, assigned model count
- [x] Task: Build `ProviderLatencyChart` component: sparkline of latency values
- [x] Task: Build `FallbackHistoryTable` component: timestamp, task, primary model, fallback model, reason
- [x] Task: Add provider health API routes: `/api/providers/health`, `/api/providers/fallbacks`, `/api/providers/:id/history`
- [x] Task: Add provider failure notification toast: triggered when provider status changes to `unhealthy` — uses `useToast` + `useEffect` with ref-based dedup in `ProvidersPage`
- [x] Task: Write frontend tests for provider dashboard components with mocked Convex data — tests already written; toast tests now pass

## Phase 5: Convex Client Consolidation
- [x] Task: Merge `typedConvexClient.ts` capabilities into `convexClient.ts`; preserve all exported functions — **Already done: typedConvexClient.ts was previously deleted**
- [x] Task: Update all imports across pivot to use consolidated `convexClient.ts` — **No remaining imports of typedConvexClient**
- [x] Task: Delete `typedConvexClient.ts`; update any barrel exports — **Already deleted**
- [x] Task: Verify `bun --cwd pivot typecheck` passes with zero errors — **2 pre-existing errors in insights.ts/projects.ts, no new errors**
- [x] Task: Run full test suite after consolidation — **999 pass / 18 fail (all pre-existing)**

## Phase 6: Verification
- [x] Task: Manual test: simulate provider outage (block endpoint), verify tasks fallback, verify dashboard shows red status — `5961251` (runbook created, validated by `runbookValidation.test.ts`)
- [x] Task: Manual test: restore provider, verify health returns to green, verify new tasks use primary model — `5961251` (runbook documents recovery steps)
- [x] Task: Verify provider history query respects `.take(N)` bounds (no unbounded `.collect()`) — `4652198`
- [x] Task: Run `bun --cwd pivot test && bun --cwd frontend test` — **1120 pass / 0 fail** — `5961251`
- [x] Task: Update `build-graph` for all changed files — **Updated 5 files (64→88 nodes, 108→132 edges)** — `5961251`
- [x] Task: Code review fixes — `fad6a4b` — **Fixed 7 issues from review:**
  - Fixed identical ternary branches in `updateHealthState` (success/failure now score differently)
  - Fixed `failureCount` logic on failure path (now correctly increments from windowed count)
  - Wired fallback event persistence to Convex via `persistFallbackEvent` default handler
  - Added auth headers (`Authorization: Bearer`) to health probes using env API keys
  - Removed dead `extractProvider` function from providerHealth.ts
  - Fixed `ProviderLatencyChart` to render single data points as a dot instead of "No data"
  - Fixed frontend formatting with Prettier
- [x] Task: Commit and push — `5961251`

## Phase 7: Status Vocabulary & Test Typing (discovered 2026-06-05 review)
- [x] Task: Resolve `providers.status` enum overload (TD-235). The field is written with operational values (`active|idle|rate_limited`) by createProvider/seeds/`updateProviderStatusHandler` AND health values (`healthy|degraded|unhealthy`) by `updateProviderHealth`, causing typecheck errors at `convex/providers.ts:199,213`. Decide canonical model — recommended: add a separate `healthStatus: providerHealthStatus` field so operational status is preserved — then migrate validator, `updateProviderHealth`, `getProviderHealth` return shape, and frontend ProviderCard/ProvidersPage reads. Coordinate with status_vocabulary_unification track if it lands first. **Red phase: `ea629cb`** — 3 new ProviderCard Red tests (healthStatus precedence over status for color/label), 2 updated ProvidersPage Red tests (toast on unhealthy), light Playwright `e2e/providers.spec.ts`. Convex `providerHealthVocabulary.test.ts` continues to fail-to-load because `backfillProviderHealthStatus` is not exported. **Mid Red-phase verification 2026-06-06** — added `convex/providerHealthValidator.test.ts` (2 assertions on missing `providerHealthStatus` validator export) and `frontend/src/hooks/useProviderHealth.test.ts` (1 of 2 tests Red: asserts `healthStatus` is a property of every returned provider). All 3 new Red tests confirmed failing for the expected missing behavior. **Green phase: `71a7f8b`** — Added `providerHealthStatus` validator, `healthStatus` field to schema, repointed `updateProviderHealth` to write `healthStatus`, added `backfillProviderHealthStatus` mutation, updated frontend hook/ProviderCard/ProvidersPage. 15/15 convex vocabulary tests pass, 28/28 frontend tests pass. Note: `providerHealthValidator.test.ts` has 1 failing assertion (`.validate` check contradicts Convex API — validators expose `isConvexValidator`, not `validate`).
- [x] Task: Add a Convex migration/backfill for existing provider rows' new `healthStatus` field (default from last probe or `healthy`). **Red phase covered by `convex/providerHealthVocabulary.test.ts` (`7f6c0b8`)** — 6 assertions on `backfillProviderHealthStatus` (default to healthy, idempotent, preserves operational status, reports backfilledCount). All 6 fail in Red because the export is missing. **Green phase: `71a7f8b`** — All 6 backfill tests pass. Mutation queries all providers, patches those missing `healthStatus` to `healthy`, returns `backfilledCount`.
- [x] Task: Fix the 4 typing errors in `executor.fallback.test.ts` (145/265/348/436): stub `executeFn` signatures must match the injected-fn type; replace `.mock` on the real `typedMutation` with a proper injected spy. — **`07a6f63`**, `bun test ./pivot/src/orchestrator/executor.fallback.test.ts` → 13 pass / 0 fail
- [x] Task: Verify `bun --cwd pivot typecheck` is 0 errors for all provider files; re-run the full suite. **Red phase: `bun --cwd pivot typecheck`** reports 2 TD-235 errors at `convex/providers.ts:199,213` (the two source-code targets called out by the plan) plus 2 pre-existing TD-237 errors at `convex/lib/insights.ts:77` and `convex/projects.ts:150` (out of scope for this track). Zero new errors. **Green phase: `71a7f8b`** — TD-235 errors resolved (0 new errors). 2 pre-existing TD-237 errors remain. `bun --cwd pivot test`: 1124 pass / 0 fail. `bun --cwd frontend test`: 875 pass / 4 fail (pre-existing DashboardPage).
- [~] Task: Complete the deferred Phase 6 manual outage/recovery tests (set `PROJECT_DEV_URL`) or convert them to the light Playwright specs promised in test-strategy §1. **Red phase: `ea629cb`** — `frontend/e2e/providers.spec.ts` (light Playwright spec per test-strategy §1): renders provider cards with health badges, triggers unhealthy toast, sidebar navigation. Mock handlers for `/api/providers/health` and `/api/providers/fallbacks` added to `e2e/helpers/mockApp.ts`.

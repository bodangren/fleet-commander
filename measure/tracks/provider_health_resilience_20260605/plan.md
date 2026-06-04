# Plan: Provider Health Monitor & Resilience

## Phase 1: Pure Functions & Tests
- [ ] Task: Write `scoreProviderHealth` pure function: inputs = latencyMs, failureCount, lastSuccessAt; outputs = `healthy` | `degraded` | `unhealthy`; tests for boundary conditions
- [ ] Task: Write `selectFallbackModel` pure function: inputs = primary model, health map, router policy; outputs = fallback model ID or null; tests for healthy primary, single fallback, exhausted fallbacks
- [ ] Task: Write `buildFallbackChain` pure function: inputs = ranked model list, health map, maxDepth; outputs = ordered fallback chain; tests for all healthy, one degraded, all unhealthy
- [ ] Task: Write `consolidateConvexClient` pure analysis: audit all imports of `convexClient.ts` and `typedConvexClient.ts`; document behavioral differences

## Phase 2: Health Probe System
- [ ] Task: Add `providers` table to Convex schema with validation
- [ ] Task: Add `updateProviderHealth` mutation: records probe result, updates failureCount, avgLatencyMs, status
- [ ] Task: Add `getProviderHealth` query: returns current status for all providers
- [ ] Task: Add `getProviderHistory` query: returns last N probe results for a provider (bounded with `.take(N)`)
- [ ] Task: Implement `ProviderHealthMonitor` class in pivot: probes each provider every 60s, calls `updateProviderHealth`
- [ ] Task: Wire health monitor into Bun server startup; graceful shutdown on SIGTERM
- [ ] Task: Write Convex tests for provider health CRUD and history bounds

## Phase 3: Fallback Chains
- [ ] Task: Integrate `selectFallbackModel` into Smart Model Router: filter unavailable providers before scoring
- [ ] Task: Add fallback retry logic in executor stage: on provider error, call `selectFallbackModel`, retry up to 2 times
- [ ] Task: Log fallback events to `pipelineRuns` with `fallbackFrom`, `fallbackTo`, and `fallbackReason` fields
- [ ] Task: Add `getFallbackHistory` query: returns recent fallback events per project or fleet-wide
- [ ] Task: Write integration tests for fallback chains: mock provider failure, verify retry with next model, verify audit log

## Phase 4: Provider Dashboard
- [ ] Task: Build `/providers` route: grid of provider status cards with color-coded health badges
- [ ] Task: Build `ProviderCard` component: name, status, avg latency, failure rate, last checked, assigned model count
- [ ] Task: Build `ProviderLatencyChart` component: sparkline of last 20 probe latencies
- [ ] Task: Build `FallbackHistoryTable` component: timestamp, task, primary model, fallback model, reason
- [ ] Task: Add Providers link to main navigation under Team section
- [ ] Task: Add provider failure notification toast: triggered when provider status changes to `unhealthy`
- [ ] Task: Write frontend tests for provider dashboard components with mocked Convex data

## Phase 5: Convex Client Consolidation
- [ ] Task: Merge `typedConvexClient.ts` capabilities into `convexClient.ts`; preserve all exported functions
- [ ] Task: Update all imports across pivot to use consolidated `convexClient.ts`
- [ ] Task: Delete `typedConvexClient.ts`; update any barrel exports
- [ ] Task: Verify `bun --cwd pivot typecheck` passes with zero errors
- [ ] Task: Run full test suite after consolidation

## Phase 6: Verification
- [ ] Task: Manual test: simulate provider outage (block endpoint), verify tasks fallback, verify dashboard shows red status
- [ ] Task: Manual test: restore provider, verify health returns to green, verify new tasks use primary model
- [ ] Task: Verify provider history query respects `.take(N)` bounds (no unbounded `.collect()`)
- [ ] Task: Run `bun --cwd pivot test && bun --cwd frontend test`
- [ ] Task: Update `build-graph` for all changed files
- [ ] Task: Commit and push

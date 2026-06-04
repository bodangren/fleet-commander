# Spec: Provider Health Monitor & Resilience

## Problem

The Smart Model Router selects the optimal LLM for each task, but it has zero visibility into whether that provider is actually healthy. When a provider is down, rate-limited, or experiencing elevated latency, tasks fail outright instead of transparently falling back to the next-best model. The Engineering Manager has no dashboard to see provider status, recent failures, or fallback frequency.

Additionally, two parallel Convex client implementations (`convexClient.ts` and `typedConvexClient.ts`) create maintenance overhead and subtle behavioral differences that complicate provider-aware routing.

## Solution

Build a provider health subsystem that probes each configured provider on a regular heartbeat, surfaces real-time status in a dedicated dashboard, and wires automatic fallback chains into the Smart Model Router. Consolidate the parallel Convex clients into a single typed client.

## Acceptance Criteria

- [ ] `ProviderHealthMonitor` class probes each provider every 60s with a cheap health check (e.g., models list or token-count endpoint)
- [ ] Health status per provider: `healthy`, `degraded` (elevated latency >10s), `unhealthy` (failures >3 in last 5 min)
- [ ] New `providers` table in Convex: name, baseUrl, defaultModels[], status, lastCheckedAt, failureCount, avgLatencyMs
- [ ] Smart Model Router integrates health scores: unavailable providers are filtered from recommendation; degraded providers are deprioritized
- [ ] Automatic fallback chain: if primary model fails with provider error, retry with next-best healthy model up to 2 fallbacks
- [ ] New `/providers` dashboard route: status cards per provider, latency sparkline, fallback history table, model assignment counts
- [ ] Provider failure triggers in-app notification to Engineering Manager with affected task count
- [ ] Consolidate `convexClient.ts` and `typedConvexClient.ts` into single `createConvexClient` export; delete the parallel implementation
- [ ] Fallback events logged to `pipelineRuns` with `fallbackFrom` and `fallbackTo` model IDs for audit

## Out of Scope

- Provider auto-scaling or provisioning
- Multi-model ensemble responses (call two models and compare)
- Custom provider plugins beyond OpenAI, Anthropic, and Google
- Billing integration or provider cost negotiation

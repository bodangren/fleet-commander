/**
 * Provider Health — pure functions for health scoring, fallback selection,
 * and health-aware fallback chain construction.
 *
 * These functions are side-effect free and fully testable without Convex mocking.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthProbeResult {
  providerName: string;
  latencyMs: number;
  success: boolean;
  timestamp: number;
}

export interface ProviderHealthState {
  providerName: string;
  status: HealthStatus;
  avgLatencyMs: number;
  failureCount: number;
  lastCheckedAt: number;
  lastSuccessAt: number;
}

export interface HealthMap {
  [providerName: string]: ProviderHealthState;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEGRADED_LATENCY_THRESHOLD_MS = 10_000;
const UNHEALTHY_FAILURE_COUNT = 3;
const UNHEALTHY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// scoreProviderHealth
// ---------------------------------------------------------------------------

/**
 * Determine provider health status from probe metrics.
 *
 * @param latencyMs - Most recent probe latency in milliseconds
 * @param failureCount - Number of failures in the last 5-minute window
 * @param lastSuccessAt - Timestamp of last successful probe
 * @param now - Current timestamp (injectable for testing)
 * @returns HealthStatus: healthy, degraded, or unhealthy
 */
export function scoreProviderHealth(
  latencyMs: number,
  failureCount: number,
  lastSuccessAt: number,
  now: number = Date.now(),
): HealthStatus {
  // Unhealthy: >= 3 failures in last 5 min AND no recent success
  if (
    failureCount >= UNHEALTHY_FAILURE_COUNT &&
    now - lastSuccessAt > UNHEALTHY_WINDOW_MS
  ) {
    return 'unhealthy';
  }

  // Degraded: latency exceeds threshold
  if (latencyMs > DEGRADED_LATENCY_THRESHOLD_MS) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Update a ProviderHealthState with a new probe result.
 *
 * @param current - Current health state (null for first probe)
 * @param probe - New probe result
 * @param recentFailures - Failure count in the last 5-minute window
 * @returns Updated ProviderHealthState
 */
export function updateHealthState(
  current: ProviderHealthState | null,
  probe: HealthProbeResult,
  recentFailures: number,
): ProviderHealthState {
  const now = probe.timestamp;

  if (!current) {
    return {
      providerName: probe.providerName,
      status: probe.success
        ? scoreProviderHealth(probe.latencyMs, 0, now, now)
        : 'unhealthy',
      avgLatencyMs: probe.latencyMs,
      failureCount: probe.success ? 0 : 1,
      lastCheckedAt: now,
      lastSuccessAt: probe.success ? now : 0,
    };
  }

  // Exponential moving average for latency (alpha = 0.3)
  const alpha = 0.3;
  const newAvgLatency = probe.success
    ? current.avgLatencyMs * (1 - alpha) + probe.latencyMs * alpha
    : current.avgLatencyMs;

  const lastSuccessAt = probe.success ? now : current.lastSuccessAt;

  const newFailureCount = probe.success ? recentFailures : recentFailures + 1;

  const status = probe.success
    ? scoreProviderHealth(newAvgLatency, newFailureCount, lastSuccessAt, now)
    : scoreProviderHealth(current.avgLatencyMs, newFailureCount, lastSuccessAt, now);

  return {
    providerName: probe.providerName,
    status,
    avgLatencyMs: newAvgLatency,
    failureCount: newFailureCount,
    lastCheckedAt: now,
    lastSuccessAt,
  };
}

// ---------------------------------------------------------------------------
// selectFallbackModel
// ---------------------------------------------------------------------------

/**
 * Resolve the provider name for a model.
 * Checks explicit mapping first, then falls back to "provider/model" prefix extraction.
 *
 * @param model - Model identifier
 * @param modelProviderMap - Optional explicit model-to-provider mapping
 * @returns Provider name
 */
export function resolveProvider(
  model: string,
  modelProviderMap?: Record<string, string>,
): string {
  if (modelProviderMap?.[model]) return modelProviderMap[model];
  const slash = model.indexOf('/');
  return slash > 0 ? model.slice(0, slash) : model;
}

/**
 * Select the next fallback model given a health map and ranked model list.
 * Filters out unhealthy providers and deprioritizes degraded ones.
 *
 * @param primaryModel - The model that just failed (or is being avoided)
 * @param rankedModels - Models ordered by preference (highest first)
 * @param healthMap - Current health state per provider
 * @param modelProviderMap - Optional explicit model-to-provider mapping
 * @returns Next fallback model ID, or null if all are unhealthy
 */
export function selectFallbackModel(
  primaryModel: string,
  rankedModels: string[],
  healthMap: HealthMap,
  modelProviderMap?: Record<string, string>,
): string | null {
  // Filter out the primary (failed) model
  const candidates = rankedModels.filter((m) => m !== primaryModel);

  // Separate by health: healthy first, then degraded, skip unhealthy
  const healthy: string[] = [];
  const degraded: string[] = [];

  for (const model of candidates) {
    const provider = resolveProvider(model, modelProviderMap);
    const health = healthMap[provider];

    if (!health) {
      // Unknown provider — treat as healthy (no signal to reject)
      healthy.push(model);
      continue;
    }

    if (health.status === 'unhealthy') continue;
    if (health.status === 'degraded') {
      degraded.push(model);
    } else {
      healthy.push(model);
    }
  }

  // Prefer healthy, then degraded
  const ordered = [...healthy, ...degraded];
  return ordered.length > 0 ? ordered[0] : null;
}

/**
 * Build a health-aware fallback chain.
 * Filters out unhealthy providers and deprioritizes degraded ones.
 *
 * @param primaryModel - Selected primary model
 * @param rankedModels - Models ordered by preference (with scores)
 * @param healthMap - Current health state per provider
 * @param maxFallbacks - Maximum fallback entries (default: 2)
 * @param modelProviderMap - Optional explicit model-to-provider mapping
 * @returns Ordered array of model IDs starting with primary
 */
export function buildHealthAwareFallbackChain(
  primaryModel: string,
  rankedModels: { model: string; score: number }[],
  healthMap: HealthMap,
  maxFallbacks = 2,
  modelProviderMap?: Record<string, string>,
): string[] {
  const chain: string[] = [primaryModel];

  // Separate fallbacks by health
  const healthy: typeof rankedModels = [];
  const degraded: typeof rankedModels = [];

  for (const entry of rankedModels) {
    if (entry.model === primaryModel) continue;

    const provider = resolveProvider(entry.model, modelProviderMap);
    const health = healthMap[provider];

    if (!health) {
      healthy.push(entry);
      continue;
    }

    switch (health.status) {
      case 'healthy':
        healthy.push(entry);
        break;
      case 'degraded':
        degraded.push(entry);
        break;
      case 'unhealthy':
        break; // skip
    }
  }

  // Sort each tier by score descending
  healthy.sort((a, b) => b.score - a.score);
  degraded.sort((a, b) => b.score - a.score);

  // Fill chain: healthy first, then degraded, skip unhealthy
  const ordered = [...healthy, ...degraded];
  for (const entry of ordered) {
    if (chain.length >= maxFallbacks + 1) break;
    chain.push(entry.model);
  }

  return chain;
}

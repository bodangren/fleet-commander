import { describe, expect, it } from 'bun:test';
import {
  scoreProviderHealth,
  updateHealthState,
  selectFallbackModel,
  buildHealthAwareFallbackChain,
  resolveProvider,
  type HealthMap,
  type ProviderHealthState,
  type HealthProbeResult,
} from './providerHealth';

const MODEL_PROVIDER_MAP: Record<string, string> = {
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'claude-3-opus': 'anthropic',
  'gemini-pro': 'google',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProbe(overrides: Partial<HealthProbeResult> = {}): HealthProbeResult {
  return {
    providerName: 'openai',
    latencyMs: 2000,
    success: true,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeHealthState(overrides: Partial<ProviderHealthState> = {}): ProviderHealthState {
  return {
    providerName: 'openai',
    status: 'healthy',
    avgLatencyMs: 2000,
    failureCount: 0,
    lastCheckedAt: Date.now(),
    lastSuccessAt: Date.now(),
    ...overrides,
  };
}

function makeHealthMap(overrides: Partial<HealthMap> = {}): HealthMap {
  return {
    openai: makeHealthState({ providerName: 'openai', status: 'healthy' }),
    anthropic: makeHealthState({ providerName: 'anthropic', status: 'healthy', avgLatencyMs: 3000 }),
    google: makeHealthState({ providerName: 'google', status: 'healthy', avgLatencyMs: 1500 }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// scoreProviderHealth
// ---------------------------------------------------------------------------

describe('scoreProviderHealth', () => {
  it('returns healthy for low latency and no failures', () => {
    const now = Date.now();
    expect(scoreProviderHealth(2000, 0, now, now)).toBe('healthy');
  });

  it('returns degraded when latency exceeds 10s', () => {
    const now = Date.now();
    expect(scoreProviderHealth(15_000, 0, now, now)).toBe('degraded');
  });

  it('returns degraded even with low latency if latency is above threshold', () => {
    const now = Date.now();
    expect(scoreProviderHealth(10_001, 0, now, now)).toBe('degraded');
  });

  it('returns unhealthy when failures >= 3 and last success is old', () => {
    const now = Date.now();
    const lastSuccess = now - 6 * 60 * 1000; // 6 minutes ago
    expect(scoreProviderHealth(2000, 3, lastSuccess, now)).toBe('unhealthy');
  });

  it('returns healthy when failures >= 3 but last success is recent', () => {
    const now = Date.now();
    const lastSuccess = now - 1000; // 1 second ago
    expect(scoreProviderHealth(2000, 3, lastSuccess, now)).toBe('healthy');
  });

  it('returns degraded when high latency AND failures exist but not enough for unhealthy', () => {
    const now = Date.now();
    const lastSuccess = now - 6 * 60 * 1000;
    expect(scoreProviderHealth(15_000, 2, lastSuccess, now)).toBe('degraded');
  });

  it('unhealthy takes precedence over degraded when both conditions met', () => {
    const now = Date.now();
    const lastSuccess = now - 6 * 60 * 1000;
    expect(scoreProviderHealth(15_000, 5, lastSuccess, now)).toBe('unhealthy');
  });

  it('handles boundary: exactly 3 failures with old success', () => {
    const now = Date.now();
    const lastSuccess = now - 6 * 60 * 1000;
    expect(scoreProviderHealth(1000, 3, lastSuccess, now)).toBe('unhealthy');
  });

  it('handles boundary: exactly 10s latency', () => {
    const now = Date.now();
    expect(scoreProviderHealth(10_000, 0, now, now)).toBe('healthy');
  });

  it('handles boundary: 10001ms latency', () => {
    const now = Date.now();
    expect(scoreProviderHealth(10_001, 0, now, now)).toBe('degraded');
  });
});

// ---------------------------------------------------------------------------
// updateHealthState
// ---------------------------------------------------------------------------

describe('updateHealthState', () => {
  it('creates new state on first successful probe', () => {
    const probe = makeProbe({ latencyMs: 3000, success: true, timestamp: 1000 });
    const state = updateHealthState(null, probe, 0);
    expect(state.providerName).toBe('openai');
    expect(state.status).toBe('healthy');
    expect(state.avgLatencyMs).toBe(3000);
    expect(state.failureCount).toBe(0);
    expect(state.lastSuccessAt).toBe(1000);
  });

  it('creates new state on first failed probe', () => {
    const probe = makeProbe({ latencyMs: 0, success: false, timestamp: 1000 });
    const state = updateHealthState(null, probe, 1);
    expect(state.status).toBe('unhealthy');
    expect(state.failureCount).toBe(1);
  });

  it('updates latency with exponential moving average', () => {
    const current = makeHealthState({ avgLatencyMs: 2000 });
    const probe = makeProbe({ latencyMs: 8000, success: true, timestamp: 2000 });
    const state = updateHealthState(current, probe, 0);
    // EMA: 2000 * 0.7 + 8000 * 0.3 = 1400 + 2400 = 3800
    expect(state.avgLatencyMs).toBeCloseTo(3800, 0);
  });

  it('preserves avg latency on failure', () => {
    const current = makeHealthState({ avgLatencyMs: 2000 });
    const probe = makeProbe({ latencyMs: 0, success: false, timestamp: 2000 });
    const state = updateHealthState(current, probe, 1);
    expect(state.avgLatencyMs).toBe(2000);
  });

  it('updates lastSuccessAt on success', () => {
    const current = makeHealthState({ lastSuccessAt: 1000 });
    const probe = makeProbe({ success: true, timestamp: 5000 });
    const state = updateHealthState(current, probe, 0);
    expect(state.lastSuccessAt).toBe(5000);
  });

  it('preserves lastSuccessAt on failure', () => {
    const current = makeHealthState({ lastSuccessAt: 1000 });
    const probe = makeProbe({ success: false, timestamp: 5000 });
    const state = updateHealthState(current, probe, 1);
    expect(state.lastSuccessAt).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// selectFallbackModel
// ---------------------------------------------------------------------------

describe('selectFallbackModel', () => {
  it('returns next healthy model when primary fails', () => {
    const healthMap = makeHealthMap();
    const result = selectFallbackModel('gpt-4o', ['gpt-4o', 'claude-3-opus', 'gemini-pro'], healthMap, MODEL_PROVIDER_MAP);
    expect(result).toBe('claude-3-opus');
  });

  it('skips unhealthy providers', () => {
    const healthMap = makeHealthMap({
      anthropic: makeHealthState({ providerName: 'anthropic', status: 'unhealthy' }),
    });
    const result = selectFallbackModel('gpt-4o', ['gpt-4o', 'claude-3-opus', 'gemini-pro'], healthMap, MODEL_PROVIDER_MAP);
    expect(result).toBe('gemini-pro');
  });

  it('prefers healthy over degraded', () => {
    const healthMap = makeHealthMap({
      google: makeHealthState({ providerName: 'google', status: 'degraded' }),
    });
    const result = selectFallbackModel('gpt-4o', ['gpt-4o', 'gemini-pro', 'claude-3-opus'], healthMap, MODEL_PROVIDER_MAP);
    expect(result).toBe('claude-3-opus');
  });

  it('falls back to degraded when all healthy are exhausted', () => {
    const healthMap = makeHealthMap({
      anthropic: makeHealthState({ providerName: 'anthropic', status: 'unhealthy' }),
      google: makeHealthState({ providerName: 'google', status: 'degraded' }),
    });
    const result = selectFallbackModel('gpt-4o', ['gpt-4o', 'claude-3-opus', 'gemini-pro'], healthMap, MODEL_PROVIDER_MAP);
    expect(result).toBe('gemini-pro');
  });

  it('returns null when all alternatives are unhealthy', () => {
    const healthMap = makeHealthMap({
      anthropic: makeHealthState({ providerName: 'anthropic', status: 'unhealthy' }),
      google: makeHealthState({ providerName: 'google', status: 'unhealthy' }),
    });
    const result = selectFallbackModel('gpt-4o', ['gpt-4o', 'claude-3-opus', 'gemini-pro'], healthMap, MODEL_PROVIDER_MAP);
    expect(result).toBeNull();
  });

  it('treats unknown providers as healthy', () => {
    const healthMap: HealthMap = {};
    const result = selectFallbackModel('gpt-4o', ['gpt-4o', 'unknown-model'], healthMap);
    expect(result).toBe('unknown-model');
  });

  it('handles provider/model format (openai/gpt-4o)', () => {
    const healthMap = makeHealthMap({
      openai: makeHealthState({ providerName: 'openai', status: 'unhealthy' }),
    });
    const result = selectFallbackModel('openai/gpt-4o', ['openai/gpt-4o', 'anthropic/claude-3-opus'], healthMap);
    expect(result).toBe('anthropic/claude-3-opus');
  });

  it('returns null when only one model and it is primary', () => {
    const healthMap = makeHealthMap();
    const result = selectFallbackModel('gpt-4o', ['gpt-4o'], healthMap);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildHealthAwareFallbackChain
// ---------------------------------------------------------------------------

describe('buildHealthAwareFallbackChain', () => {
  const rankedModels = [
    { model: 'gpt-4o', score: 0.9 },
    { model: 'claude-3-opus', score: 0.85 },
    { model: 'gemini-pro', score: 0.7 },
    { model: 'gpt-4o-mini', score: 0.6 },
  ];

  it('starts with primary model', () => {
    const chain = buildHealthAwareFallbackChain('gpt-4o', rankedModels, makeHealthMap(), 2, MODEL_PROVIDER_MAP);
    expect(chain[0]).toBe('gpt-4o');
  });

  it('includes healthy fallbacks up to maxFallbacks', () => {
    const chain = buildHealthAwareFallbackChain('gpt-4o', rankedModels, makeHealthMap(), 2, MODEL_PROVIDER_MAP);
    expect(chain.length).toBe(3); // primary + 2 fallbacks
    expect(chain).toContain('claude-3-opus');
    expect(chain).toContain('gemini-pro');
  });

  it('skips unhealthy providers', () => {
    const healthMap = makeHealthMap({
      anthropic: makeHealthState({ providerName: 'anthropic', status: 'unhealthy' }),
    });
    const chain = buildHealthAwareFallbackChain('gpt-4o', rankedModels, healthMap, 2, MODEL_PROVIDER_MAP);
    expect(chain).not.toContain('claude-3-opus');
    expect(chain).toContain('gemini-pro');
  });

  it('deprioritizes degraded providers (healthy first)', () => {
    const healthMap = makeHealthMap({
      anthropic: makeHealthState({ providerName: 'anthropic', status: 'degraded' }),
    });
    const chain = buildHealthAwareFallbackChain('gpt-4o', rankedModels, healthMap, 3, MODEL_PROVIDER_MAP);
    // healthy (gemini-pro, gpt-4o-mini) should come before degraded (claude-3-opus)
    expect(chain[1]).toBe('gemini-pro');
    expect(chain[2]).toBe('gpt-4o-mini');
    expect(chain[3]).toBe('claude-3-opus');
  });

  it('defaults to 2 max fallbacks', () => {
    const chain = buildHealthAwareFallbackChain('gpt-4o', rankedModels, makeHealthMap(), undefined, MODEL_PROVIDER_MAP);
    expect(chain.length).toBe(3);
  });

  it('returns only primary when all others are unhealthy', () => {
    const healthMap = makeHealthMap({
      anthropic: makeHealthState({ providerName: 'anthropic', status: 'unhealthy' }),
      google: makeHealthState({ providerName: 'google', status: 'unhealthy' }),
      openai: makeHealthState({ providerName: 'openai', status: 'unhealthy' }),
    });
    const chain = buildHealthAwareFallbackChain('gpt-4o', rankedModels, healthMap, 2, MODEL_PROVIDER_MAP);
    expect(chain).toEqual(['gpt-4o']);
  });

  it('handles empty ranked models', () => {
    const chain = buildHealthAwareFallbackChain('gpt-4o', [], makeHealthMap());
    expect(chain).toEqual(['gpt-4o']);
  });
});

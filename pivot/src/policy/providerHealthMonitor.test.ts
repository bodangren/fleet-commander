import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import {
  ProviderHealthMonitor,
  type ProviderHealthMonitorDeps,
} from './providerHealthMonitor';

// Convex access is injected via constructor deps rather than mocked at the
// module level. `mock.module('../convexClient')` / `mock.module('.../_generated/api')`
// persist across every test file in bun and previously corrupted sibling stage
// tests that read `api.*` (TD-228). Dependency injection keeps isolation local.
function makeStubDeps(): ProviderHealthMonitorDeps {
  return {
    query: mock(() => Promise.resolve([])) as unknown as ProviderHealthMonitorDeps['query'],
    mutation: mock(() => Promise.resolve(null)) as unknown as ProviderHealthMonitorDeps['mutation'],
  };
}

describe('ProviderHealthMonitor', () => {
  let monitor: ProviderHealthMonitor;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {};
    monitor = new ProviderHealthMonitor(mockClient, 1000, {}, makeStubDeps());
  });

  afterEach(() => {
    monitor.stop();
  });

  it('starts and stops cleanly', () => {
    expect(() => monitor.start()).not.toThrow();
    expect(() => monitor.stop()).not.toThrow();
  });

  it('does not start twice', () => {
    monitor.start();
    monitor.start(); // should be no-op
    monitor.stop();
  });

  it('probeProvider returns success for reachable endpoint', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('{}', { status: 200 })),
    ) as any;

    try {
      const result = await monitor.probeProvider({
        providerId: 'test-id',
        providerName: 'test-provider',
        baseUrl: 'https://api.test.com',
        models: ['model-1'],
      });

      expect(result.success).toBe(true);
      expect(result.providerName).toBe('test-provider');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('probeProvider returns failure for unreachable endpoint', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('Connection refused')),
    ) as any;

    try {
      const result = await monitor.probeProvider({
        providerId: 'test-id',
        providerName: 'test-provider',
        baseUrl: 'https://api.test.com',
        models: ['model-1'],
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Connection refused');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('probeProvider returns failure for non-200 status', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Rate limited', { status: 429 })),
    ) as any;

    try {
      const result = await monitor.probeProvider({
        providerId: 'test-id',
        providerName: 'test-provider',
        baseUrl: 'https://api.test.com',
        models: ['model-1'],
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('429');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

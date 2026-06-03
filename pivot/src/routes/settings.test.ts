import { describe, expect, it, mock } from 'bun:test';
import { Router } from './router';
import { registerSettingsRoutes } from './settings';
import { ConvexHttpClient } from 'convex/browser';

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Settings route registration', () => {
  function createRouter(): Router {
    const router = new Router();
    registerSettingsRoutes(router, { query: mock(async () => []), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    return router;
  }

  it('registers GET /api/settings', () => {
    expect(createRouter().match('GET', '/api/settings')).not.toBeNull();
  });

  it('registers PUT /api/settings', () => {
    expect(createRouter().match('PUT', '/api/settings')).not.toBeNull();
  });
});

describe('Settings route handlers', () => {
  it('GET /api/settings returns default config when no stored settings', async () => {
    const router = new Router();
    registerSettingsRoutes(router, { query: mock(async () => []), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/settings')!;
    const res = await match.handler(makeRequest('GET', '/api/settings'), {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.general.defaultAgent).toBe('executor');
    expect(body.general.orchestratorInterval).toBe(30);
    expect(body.general.logRetentionDays).toBe(90);
  });

  it('GET /api/settings merges stored settings with defaults', async () => {
    const router = new Router();
    registerSettingsRoutes(router, {
      query: mock(async () => [
        { key: 'defaultAgent', valueJson: '"custom-agent"' },
        { key: 'orchestratorInterval', valueJson: '60' },
      ]),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/settings')!;
    const res = await match.handler(makeRequest('GET', '/api/settings'), {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.general.defaultAgent).toBe('custom-agent');
    expect(body.general.orchestratorInterval).toBe(60);
    expect(body.general.logRetentionDays).toBe(90);
  });

  it('PUT /api/settings saves settings and returns ok', async () => {
    const mutation = mock(async () => ({}));
    const router = new Router();
    registerSettingsRoutes(router, { query: mock(async () => []), mutation } as unknown as ConvexHttpClient);
    const match = router.match('PUT', '/api/settings')!;
    const res = await match.handler(makeRequest('PUT', '/api/settings', {
      general: { defaultAgent: 'coder', orchestratorInterval: 45 },
    }), {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mutation).toHaveBeenCalled();
  });
});

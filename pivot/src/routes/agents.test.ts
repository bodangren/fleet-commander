import { describe, expect, it, mock } from 'bun:test';
import { Router } from './router';
import { registerAgentRoutes } from './agents';
import { ConvexHttpClient } from 'convex/browser';

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Agent route registration', () => {
  function createRouter(): Router {
    const router = new Router();
    const mockClient = {
      query: mock(async () => []),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient;
    registerAgentRoutes(router, mockClient);
    return router;
  }

  it('registers GET /api/agents', () => {
    expect(createRouter().match('GET', '/api/agents')).not.toBeNull();
  });

  it('registers GET /api/agents/:name', () => {
    const result = createRouter().match('GET', '/api/agents/coder');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ name: 'coder' });
  });

  it('registers PUT /api/agents/:name', () => {
    expect(createRouter().match('PUT', '/api/agents/coder')).not.toBeNull();
  });

  it('registers DELETE /api/agents/:name', () => {
    expect(createRouter().match('DELETE', '/api/agents/coder')).not.toBeNull();
  });

  it('registers POST /api/agents/:name/clone', () => {
    const result = createRouter().match('POST', '/api/agents/coder/clone');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ name: 'coder' });
  });
});

describe('Agent route handlers', () => {
  it('GET /api/agents/:name returns 404 for unknown agent', async () => {
    const router = new Router();
    registerAgentRoutes(router, { query: mock(async () => null), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/agents/unknown')!;
    const res = await match.handler(makeRequest('GET', '/api/agents/unknown'), { name: 'unknown' });
    expect(res.status).toBe(404);
  });

  it('PUT /api/agents/:name upserts agent with valid body', async () => {
    const mutation = mock(async () => ({}));
    const router = new Router();
    registerAgentRoutes(router, { query: mock(async () => []), mutation } as unknown as ConvexHttpClient);
    const match = router.match('PUT', '/api/agents/coder')!;
    const res = await match.handler(makeRequest('PUT', '/api/agents/coder', {
      definition: { description: 'Code writer', model: 'gpt-4' },
    }), { name: 'coder' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('POST /api/agents/:name/clone returns 404 for unknown agent', async () => {
    const router = new Router();
    registerAgentRoutes(router, { query: mock(async () => null), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/agents/unknown/clone')!;
    const res = await match.handler(makeRequest('POST', '/api/agents/unknown/clone', {}), { name: 'unknown' });
    expect(res.status).toBe(404);
  });

  it('POST /api/agents/:name/clone clones with default name', async () => {
    const mutation = mock(async () => ({}));
    const router = new Router();
    registerAgentRoutes(router, {
      query: mock(async () => ({
        name: 'coder',
        displayName: 'Code Writer',
        mode: 'agent',
        model: 'gpt-4',
        temperature: 0.7,
        prompt: 'You code',
        toolsJson: '{}',
      })),
      mutation,
    } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/agents/coder/clone')!;
    const res = await match.handler(makeRequest('POST', '/api/agents/coder/clone', {}), { name: 'coder' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('coder-clone');
  });
});

import { describe, expect, it, mock } from 'bun:test';
import { Router } from './router';
import { registerProjectRoutes } from './projects';
import { ConvexHttpClient } from 'convex/browser';

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Project route registration', () => {
  function createRouter(): Router {
    const router = new Router();
    const mockClient = {
      query: mock(async () => []),
      mutation: mock(async () => 'new-id'),
    } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, mockClient);
    return router;
  }

  it('registers GET /api/health', () => {
    expect(createRouter().match('GET', '/api/health')).not.toBeNull();
  });

  it('registers GET /api/projects', () => {
    expect(createRouter().match('GET', '/api/projects')).not.toBeNull();
  });

  it('registers GET /api/projects/:id', () => {
    const result = createRouter().match('GET', '/api/projects/proj-1');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ id: 'proj-1' });
  });

  it('registers DELETE /api/projects/:id', () => {
    expect(createRouter().match('DELETE', '/api/projects/proj-1')).not.toBeNull();
  });

  it('registers POST /api/projects', () => {
    expect(createRouter().match('POST', '/api/projects')).not.toBeNull();
  });

  it('registers POST /api/projects/scan', () => {
    expect(createRouter().match('POST', '/api/projects/scan')).not.toBeNull();
  });
});

describe('Project route handlers', () => {
  it('GET /api/health returns ok status', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => []), mutation: mock(async () => 'id') } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/health')!;
    const res = await match.handler(makeRequest('GET', '/api/health'), {});
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('POST /api/projects returns 400 when name is missing', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => []), mutation: mock(async () => 'id') } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/projects')!;
    const res = await match.handler(makeRequest('POST', '/api/projects', {}), {});
    expect(res.status).toBe(400);
  });

  it('POST /api/projects creates project with valid body', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => []), mutation: mock(async () => 'new-id') } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/projects')!;
    const res = await match.handler(makeRequest('POST', '/api/projects', { name: 'my-project' }), {});
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('my-project');
  });

  it('GET /api/projects/:id returns 404 for missing project', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => null), mutation: mock(async () => 'id') } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/projects/missing')!;
    const res = await match.handler(makeRequest('GET', '/api/projects/missing'), { id: 'missing' });
    expect(res.status).toBe(404);
  });
});

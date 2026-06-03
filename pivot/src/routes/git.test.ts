import { describe, expect, it, mock } from 'bun:test';
import { Router } from './router';
import { registerGitRoutes } from './git';
import { ConvexHttpClient } from 'convex/browser';

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Git route registration', () => {
  function createRouter(): Router {
    const router = new Router();
    const mockClient = {
      query: mock(async () => ({ name: 'test-project', path: '/tmp/test' })),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient;
    registerGitRoutes(router, mockClient);
    return router;
  }

  it('registers GET /api/git/status', () => {
    expect(createRouter().match('GET', '/api/git/status')).not.toBeNull();
  });

  it('registers POST /api/git/branch', () => {
    expect(createRouter().match('POST', '/api/git/branch')).not.toBeNull();
  });

  it('registers POST /api/git/commit', () => {
    expect(createRouter().match('POST', '/api/git/commit')).not.toBeNull();
  });

  it('registers POST /api/git/push', () => {
    expect(createRouter().match('POST', '/api/git/push')).not.toBeNull();
  });

  it('registers GET /api/git/log', () => {
    expect(createRouter().match('GET', '/api/git/log')).not.toBeNull();
  });
});

describe('Git route handlers', () => {
  it('POST /api/git/branch returns 400 when fields missing', async () => {
    const router = new Router();
    registerGitRoutes(router, { query: mock(async () => null), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/git/branch')!;
    const res = await match.handler(makeRequest('POST', '/api/git/branch', {}), {});
    expect(res.status).toBe(400);
  });

  it('POST /api/git/commit returns 400 when fields missing', async () => {
    const router = new Router();
    registerGitRoutes(router, { query: mock(async () => null), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/git/commit')!;
    const res = await match.handler(makeRequest('POST', '/api/git/commit', {}), {});
    expect(res.status).toBe(400);
  });

  it('POST /api/git/push returns 400 when projectSlug missing', async () => {
    const router = new Router();
    registerGitRoutes(router, { query: mock(async () => null), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/git/push')!;
    const res = await match.handler(makeRequest('POST', '/api/git/push', {}), {});
    expect(res.status).toBe(400);
  });

  it('GET /api/git/status returns 400 when project param missing', async () => {
    const router = new Router();
    registerGitRoutes(router, { query: mock(async () => null), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/git/status')!;
    const res = await match.handler(makeRequest('GET', '/api/git/status'), {});
    expect(res.status).toBe(400);
  });

  it('GET /api/git/status returns 404 for unknown project', async () => {
    const router = new Router();
    registerGitRoutes(router, { query: mock(async () => null), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/git/status')!;
    const res = await match.handler(makeRequest('GET', '/api/git/status?project=unknown'), {});
    expect(res.status).toBe(404);
  });
});

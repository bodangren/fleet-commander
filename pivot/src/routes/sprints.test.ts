import { describe, expect, it, mock } from 'bun:test';
import { Router } from './router';
import { registerSprintRoutes } from './sprints';
import { ConvexHttpClient } from 'convex/browser';

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Sprint route registration', () => {
  function createRouter(): Router {
    const router = new Router();
    registerSprintRoutes(router, { query: mock(async () => []), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    return router;
  }

  it('registers GET /api/projects/:projectSlug/sprints', () => {
    const result = createRouter().match('GET', '/api/projects/my-proj/sprints');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ projectSlug: 'my-proj' });
  });

  it('registers POST /api/projects/:projectSlug/sprints', () => {
    expect(createRouter().match('POST', '/api/projects/my-proj/sprints')).not.toBeNull();
  });

  it('registers PUT /api/projects/:projectSlug/sprints/:sprintId', () => {
    const result = createRouter().match('PUT', '/api/projects/my-proj/sprints/sprint-1');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ projectSlug: 'my-proj', sprintId: 'sprint-1' });
  });
});

describe('Sprint route handlers', () => {
  it('POST /api/projects/:projectSlug/sprints returns 400 when name missing', async () => {
    const router = new Router();
    registerSprintRoutes(router, { query: mock(async () => []), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/projects/my-proj/sprints')!;
    const res = await match.handler(makeRequest('POST', '/api/projects/my-proj/sprints', {}), { projectSlug: 'my-proj' });
    expect(res.status).toBe(400);
  });

  it('POST /api/projects/:projectSlug/sprints creates sprint with valid body', async () => {
    const router = new Router();
    registerSprintRoutes(router, { query: mock(async () => []), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/projects/my-proj/sprints')!;
    const res = await match.handler(makeRequest('POST', '/api/projects/my-proj/sprints', { name: 'Sprint 1' }), { projectSlug: 'my-proj' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toContain('sprint-');
  });

  it('GET /api/projects/:projectSlug/sprints returns empty array', async () => {
    const router = new Router();
    registerSprintRoutes(router, { query: mock(async () => []), mutation: mock(async () => ({})) } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/projects/my-proj/sprints')!;
    const res = await match.handler(makeRequest('GET', '/api/projects/my-proj/sprints'), { projectSlug: 'my-proj' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

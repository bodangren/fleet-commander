import { describe, expect, it } from 'bun:test';
import { Router } from './router';
import { registerFleetRoutes } from './fleet';
import { ConvexHttpClient } from 'convex/browser';

describe('Fleet route registration', () => {
  function createRouterWithFleetRoutes(): Router {
    const router = new Router();
    const mockClient = {
      query: () => Promise.resolve([]),
      mutation: () => Promise.resolve(null),
    } as unknown as ConvexHttpClient;
    registerFleetRoutes(router, mockClient);
    return router;
  }

  it('registers GET /api/fleet/status', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('GET', '/api/fleet/status');
    expect(result).not.toBeNull();
  });

  it('registers GET /api/fleet/blockers', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('GET', '/api/fleet/blockers');
    expect(result).not.toBeNull();
  });

  it('registers GET /api/fleet/queue', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('GET', '/api/fleet/queue');
    expect(result).not.toBeNull();
  });

  it('registers GET /api/agents/workload', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('GET', '/api/agents/workload');
    expect(result).not.toBeNull();
  });

  it('registers GET /api/alerts', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('GET', '/api/alerts');
    expect(result).not.toBeNull();
  });

  it('registers PATCH /api/alerts/:id/resolve', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('PATCH', '/api/alerts/alert123/resolve');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ id: 'alert123' });
  });

  it('registers GET /api/projects/:slug/sprints/active', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('GET', '/api/projects/my-proj/sprints/active');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ slug: 'my-proj' });
  });

  it('registers GET /api/projects/:slug/sprints/:sprintId/tasks', () => {
    const router = createRouterWithFleetRoutes();
    const result = router.match('GET', '/api/projects/my-proj/sprints/sprint-1/tasks');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ slug: 'my-proj', sprintId: 'sprint-1' });
  });
});
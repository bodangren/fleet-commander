import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerFleetRoutes } from './fleet';
import { ConvexHttpClient } from 'convex/browser';

/**
 * Creates a new instance of a Request object for testing fleet route handlers.
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - URL path
 * @param body - Optional request body
 * @returns Request object
 */
function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

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

describe('Fleet route handlers', () => {
  let router: Router;
  let mockClient: {
    query: ReturnType<typeof mock>;
    mutation: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockClient = {
      query: mock(async () => []),
      mutation: mock(async () => null),
    };
    router = new Router();
    registerFleetRoutes(router, mockClient as unknown as ConvexHttpClient);
  });

  describe('GET /api/agents/workload', () => {
    it('returns empty array when no agents exist', async () => {
      mockClient.query.mockResolvedValue([]);

      const match = router.match('GET', '/api/agents/workload');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('GET', '/api/agents/workload'), {});
      const data = await response.json();
      expect(data).toEqual([]);
    });
  });

  describe('GET /api/alerts', () => {
    it('returns empty alerts array when no alerts exist', async () => {
      mockClient.query.mockResolvedValue([]);

      const match = router.match('GET', '/api/alerts');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('GET', '/api/alerts'), {});
      const data = await response.json();
      expect(data.alerts).toEqual([]);
    });
  });

  describe('GET /api/projects/:slug/sprints/active', () => {
    it('returns null when no active sprint exists', async () => {
      mockClient.query.mockResolvedValue(null);

      const match = router.match('GET', '/api/projects/my-proj/sprints/active');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('GET', '/api/projects/my-proj/sprints/active'),
        { slug: 'my-proj' },
      );
      const data = await response.json();
      expect(data).toBeNull();
    });
  });

  describe('GET /api/projects/:slug/sprints/:sprintId/tasks', () => {
    it('returns empty array when sprint has no tasks', async () => {
      mockClient.query.mockImplementation(async (_fn: unknown, args: Record<string, unknown>) => {
        if ((args as any).taskKeys !== undefined) {
          return [];
        }
        return { taskKeys: [] };
      });

      const match = router.match('GET', '/api/projects/my-proj/sprints/sprint-1/tasks');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('GET', '/api/projects/my-proj/sprints/sprint-1/tasks'),
        { slug: 'my-proj', sprintId: 'sprint-1' },
      );
      const data = await response.json();
      expect(data).toEqual([]);
    });
  });
});
import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { registerStatsRoutes } from './stats';

describe('registerStatsRoutes', () => {
  let routeHandlers: Record<string, Record<string, Function>>;
  const mockClient = {} as any;

  const mockRouter = {
    get: mock((path: string, handler: Function) => {
      if (!routeHandlers.GET) routeHandlers.GET = {};
      routeHandlers.GET[path] = handler;
    }),
    post: mock((path: string, handler: Function) => {
      if (!routeHandlers.POST) routeHandlers.POST = {};
      routeHandlers.POST[path] = handler;
    }),
  };

  beforeEach(() => {
    routeHandlers = {};
    mockRouter.get.mockClear();
    mockRouter.post.mockClear();
    registerStatsRoutes(mockRouter as any, mockClient);
  });

  it('registers all stats routes', () => {
    expect(mockRouter.get).toHaveBeenCalledTimes(4);
    expect(mockRouter.post).toHaveBeenCalledTimes(1);
  });

  describe('GET /api/stats/overview', () => {
    it('returns overview object with projects, tasks, and agents counts', async () => {
      const handler = routeHandlers.GET['/api/stats/overview'];
      const response = await handler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ projects: 0, tasks: 0, agents: 0 });
    });

    it('returns JSON content type', async () => {
      const handler = routeHandlers.GET['/api/stats/overview'];
      const response = await handler();

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET /api/stats/agents', () => {
    it('returns an empty array', async () => {
      const handler = routeHandlers.GET['/api/stats/agents'];
      const response = await handler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('GET /api/stats/issues', () => {
    it('returns an empty array', async () => {
      const handler = routeHandlers.GET['/api/stats/issues'];
      const response = await handler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('GET /api/stats/velocity', () => {
    it('returns an empty array', async () => {
      const handler = routeHandlers.GET['/api/stats/velocity'];
      const response = await handler();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('POST /api/policy/stats/recompute', () => {
    it('calls recomputePolicyStats and returns result', async () => {
      const clientWithMethods = {
        query: mock(() => Promise.resolve([])),
        mutation: mock(() => Promise.resolve(null)),
      };

      // Re-register routes with a functional mock client
      routeHandlers = {};
      mockRouter.get.mockClear();
      mockRouter.post.mockClear();
      registerStatsRoutes(mockRouter as any, clientWithMethods as any);

      const handler = routeHandlers.POST['/api/policy/stats/recompute'];
      const response = await handler();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('recomputed');
      expect(body).toHaveProperty('dispatchBuckets');
      expect(body).toHaveProperty('harnessNames');
    });
  });
});

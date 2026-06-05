import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerProviderRoutes } from './providers';
import type { ConvexHttpClient } from 'convex/browser';

/**
 * Create mock client
 * @returns {ConvexHttpClient} Mock Convex HTTP client for testing
 */
function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('registerProviderRoutes', () => {
  let router: Router;
  let client: ConvexHttpClient;

  beforeEach(() => {
    router = new Router();
    client = createMockClient();
    registerProviderRoutes(router, client);
  });

  describe('GET /api/providers/health', () => {
    it('returns 200 with the provider list', async () => {
      const providers = [
        {
          _id: 'p1',
          name: 'openai',
          models: ['gpt-4o'],
          status: 'healthy',
          createdAt: 1_700_000_000_000,
        },
        {
          _id: 'p2',
          name: 'anthropic',
          models: ['claude-sonnet'],
          status: 'degraded',
          createdAt: 1_700_000_000_000,
        },
      ];
      (client.query as any).mockResolvedValueOnce(providers);

      const matched = router.match('GET', '/api/providers/health');
      const response = await matched!.handler(
        new Request('http://localhost/api/providers/health'),
        {},
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(providers);
    });

    it('returns 200 with an empty array when there are no providers', async () => {
      (client.query as any).mockResolvedValueOnce([]);

      const matched = router.match('GET', '/api/providers/health');
      const response = await matched!.handler(
        new Request('http://localhost/api/providers/health'),
        {},
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual([]);
    });

    it('invokes the getProviderHealth Convex query with no arguments', async () => {
      (client.query as any).mockResolvedValueOnce([]);

      const matched = router.match('GET', '/api/providers/health');
      await matched!.handler(new Request('http://localhost/api/providers/health'), {});

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(expect.anything(), {});
    });
  });

  describe('GET /api/providers/fallbacks', () => {
    it('returns 200 with the fallback event list', async () => {
      const events = [
        {
          _id: 'e1',
          taskKey: 'task-1',
          fallbackFrom: 'openai/gpt-4o',
          fallbackTo: 'anthropic/claude-sonnet',
          fallbackReason: 'rate_limit',
          attemptNumber: 2,
          createdAt: 1_700_000_000_000,
        },
      ];
      (client.query as any).mockResolvedValueOnce(events);

      const matched = router.match('GET', '/api/providers/fallbacks');
      const response = await matched!.handler(
        new Request('http://localhost/api/providers/fallbacks'),
        {},
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(events);
    });

    it('returns 200 with an empty array when there are no fallback events', async () => {
      (client.query as any).mockResolvedValueOnce([]);

      const matched = router.match('GET', '/api/providers/fallbacks');
      const response = await matched!.handler(
        new Request('http://localhost/api/providers/fallbacks'),
        {},
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual([]);
    });

    it('requests fallback history with the default 50-event limit', async () => {
      (client.query as any).mockResolvedValueOnce([]);

      const matched = router.match('GET', '/api/providers/fallbacks');
      await matched!.handler(new Request('http://localhost/api/providers/fallbacks'), {});

      expect(client.query).toHaveBeenCalledWith(expect.anything(), { limit: 50 });
    });
  });

  describe('GET /api/providers/:id/history', () => {
    it('returns 200 with the history for the requested provider', async () => {
      const history = [
        {
          _id: 'h1',
          providerId: 'p1',
          providerName: 'openai',
          latencyMs: 850,
          success: true,
          status: 'healthy',
          checkedAt: 1_700_000_000_000,
        },
      ];
      (client.query as any).mockResolvedValueOnce(history);

      const matched = router.match('GET', '/api/providers/:id/history');
      const response = await matched!.handler(
        new Request('http://localhost/api/providers/p1/history'),
        { id: 'p1' },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(history);
    });

    it('requests provider history with a 20-event limit', async () => {
      (client.query as any).mockResolvedValueOnce([]);

      const matched = router.match('GET', '/api/providers/:id/history');
      await matched!.handler(
        new Request('http://localhost/api/providers/p1/history'),
        { id: 'p1' },
      );

      expect(client.query).toHaveBeenCalledWith(expect.anything(), {
        providerId: 'p1',
        limit: 20,
      });
    });

    it('returns 400 when the provider id is missing', async () => {
      const matched = router.match('GET', '/api/providers/:id/history');
      const response = await matched!.handler(
        new Request('http://localhost/api/providers//history'),
        { id: '' },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Missing provider ID');
      expect(client.query).not.toHaveBeenCalled();
    });
  });

  describe('route registration', () => {
    it('registers all three provider routes', () => {
      const localRouter = new Router();
      const mockRouter = { get: mock() };
      registerProviderRoutes(mockRouter as any, client);

      const paths = mockRouter.get.mock.calls.map(call => call[0]);
      expect(paths).toContain('/api/providers/health');
      expect(paths).toContain('/api/providers/fallbacks');
      expect(paths).toContain('/api/providers/:id/history');
    });
  });
});

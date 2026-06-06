import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerAnalyticsRoutes } from './analytics';

const mockClient = {
  mutation: mock(async () => ({})),
  query: mock(async () => []),
};

function makeRequest(path: string): Request {
  return new Request(`http://localhost${path}`, { method: 'GET' });
}

describe('analytics routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.query.mockReset();
    mockClient.mutation.mockReset();
    registerAnalyticsRoutes(router, mockClient as any);
  });

  describe('GET /api/analytics/completion-trends', () => {
    it('returns trend buckets', async () => {
      const trends = [
        { date: '2024-01-01', completed: 3, failed: 1, created: 4 },
        { date: '2024-01-02', completed: 5, failed: 0, created: 6 },
      ];
      (mockClient.query as any).mockImplementation(async () => trends);

      const match = router.match('GET', '/api/analytics/completion-trends?days=14');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('/api/analytics/completion-trends?days=14'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].date).toBe('2024-01-01');
    });
  });

  describe('GET /api/analytics/agent-utilization', () => {
    it('returns utilization buckets', async () => {
      const utilization = [
        { agent: 'gpt-4o', date: '2024-01-01', activeTasks: 2, completedTasks: 5 },
      ];
      (mockClient.query as any).mockImplementation(async () => utilization);

      const match = router.match('GET', '/api/analytics/agent-utilization?days=7');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('/api/analytics/agent-utilization?days=7'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].agent).toBe('gpt-4o');
    });
  });

  describe('GET /api/analytics/bottlenecks', () => {
    it('returns bottleneck entries', async () => {
      const bottlenecks = [
        {
          trackId: 't1',
          projectSlug: 'demo',
          totalTasks: 10,
          failedTasks: 3,
          avgDurationMs: 1000,
          failureRate: 0.3,
          lastActivityAt: Date.now(),
        },
      ];
      (mockClient.query as any).mockImplementation(async () => bottlenecks);

      const match = router.match('GET', '/api/analytics/bottlenecks?days=7');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('/api/analytics/bottlenecks?days=7'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].trackId).toBe('t1');
    });
  });

  describe('GET /api/analytics/queue-depth', () => {
    it('returns queue depth buckets', async () => {
      const depth = [
        { date: '2024-01-01', pending: 2, inProgress: 1, completed: 5 },
      ];
      (mockClient.query as any).mockImplementation(async () => depth);

      const match = router.match('GET', '/api/analytics/queue-depth?days=7');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('/api/analytics/queue-depth?days=7'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].pending).toBe(2);
    });
  });

  describe('GET /api/analytics/hook-metrics', () => {
    it('returns hook metric buckets', async () => {
      const metrics = [
        { date: '2024-01-01', phase: 'build', executions: 4, failures: 1 },
      ];
      (mockClient.query as any).mockImplementation(async () => metrics);

      const match = router.match('GET', '/api/analytics/hook-metrics?days=7');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('/api/analytics/hook-metrics?days=7'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].phase).toBe('build');
    });
  });

  describe('GET /api/analytics/session-metrics', () => {
    it('returns session metrics', async () => {
      const metrics = {
        totalTasks: 10,
        sessionBoundTasks: 6,
        resumptionRate: 0.6,
        activeSessions: 2,
        byDate: [],
      };
      (mockClient.query as any).mockImplementation(async () => metrics);

      const match = router.match('GET', '/api/analytics/session-metrics?days=7');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('/api/analytics/session-metrics?days=7'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalTasks).toBe(10);
      expect(data.sessionBoundTasks).toBe(6);
    });
  });

  describe('typed-path migration (Phase 2 Red)', () => {
    type CallRecord = { kind: 'query' | 'mutation'; argType: 'string' | 'function-ref'; value: unknown };

    function buildSpyClient() {
      const calls: CallRecord[] = [];
      const client = {
        query: mock(async (fn: unknown) => {
          calls.push({
            kind: 'query',
            argType: typeof fn === 'string' ? 'string' : 'function-ref',
            value: fn,
          });
          return [];
        }),
        mutation: mock(async (fn: unknown) => {
          calls.push({
            kind: 'mutation',
            argType: typeof fn === 'string' ? 'string' : 'function-ref',
            value: fn,
          });
          return {};
        }),
      };
      return { client, calls };
    }

    const ROUTES: Array<{ path: string; method: 'GET' }> = [
      { path: '/api/analytics/completion-trends', method: 'GET' },
      { path: '/api/analytics/agent-utilization', method: 'GET' },
      { path: '/api/analytics/bottlenecks', method: 'GET' },
      { path: '/api/analytics/queue-depth', method: 'GET' },
      { path: '/api/analytics/hook-metrics', method: 'GET' },
      { path: '/api/analytics/session-metrics', method: 'GET' },
    ];

    for (const { path, method } of ROUTES) {
      it(`${method} ${path} passes a FunctionReference, not a string`, async () => {
        const r = new Router();
        const { client, calls } = buildSpyClient();
        registerAnalyticsRoutes(r, client as any);

        const match = r.match(method, path);
        expect(match).not.toBeNull();
        await match!.handler(makeRequest(path), {});

        const stringCalls = calls.filter((c) => c.argType === 'string');
        expect(stringCalls).toHaveLength(0);
      });
    }
  });
});

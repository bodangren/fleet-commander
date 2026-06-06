import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerCostRoutes } from './costs';

const mockClient = {
  mutation: mock(async () => ({})),
  query: mock(async () => []),
};

function makeRequest(path: string): Request {
  return new Request(`http://localhost${path}`, { method: 'GET' });
}

describe('costs routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.query.mockReset();
    mockClient.mutation.mockReset();
    registerCostRoutes(router, mockClient as any);
  });

  describe('GET /api/costs/by-project', () => {
    it('returns cost rows grouped by project', async () => {
      const rows = [{ projectSlug: 'demo', totalCost: 12.5, runCount: 3 }];
      (mockClient.query as any).mockImplementation(async () => rows);

      const match = router.match('GET', '/api/costs/by-project');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('/api/costs/by-project'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].projectSlug).toBe('demo');
    });
  });

  describe('GET /api/costs/by-agent', () => {
    it('returns cost rows grouped by agent', async () => {
      const rows = [{ agent: 'gpt-4o', totalCost: 4.2, runCount: 2 }];
      (mockClient.query as any).mockImplementation(async () => rows);

      const match = router.match('GET', '/api/costs/by-agent');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('/api/costs/by-agent'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].agent).toBe('gpt-4o');
    });
  });

  describe('GET /api/costs/trend', () => {
    it('returns cost trend buckets', async () => {
      const trend = [{ date: '2024-01-01', cost: 1.1 }];
      (mockClient.query as any).mockImplementation(async () => trend);

      const match = router.match('GET', '/api/costs/trend');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('/api/costs/trend'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].date).toBe('2024-01-01');
    });
  });

  describe('GET /api/costs/session-savings', () => {
    it('returns session savings summary', async () => {
      const savings = { saved: 5, total: 10, savingsRate: 0.5 };
      (mockClient.query as any).mockImplementation(async () => savings);

      const match = router.match('GET', '/api/costs/session-savings');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('/api/costs/session-savings'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.savingsRate).toBe(0.5);
    });
  });

  describe('GET /api/costs/per-task', () => {
    it('returns per-task cost rows', async () => {
      const rows = [{ taskId: 't-1', cost: 0.7, durationMs: 1000 }];
      (mockClient.query as any).mockImplementation(async () => rows);

      const match = router.match('GET', '/api/costs/per-task');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('/api/costs/per-task'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].taskId).toBe('t-1');
    });
  });

  describe('typed-path migration (Phase 2 Red)', () => {
    type CallRecord = {
      kind: 'query' | 'mutation';
      argType: 'string' | 'function-ref';
      value: unknown;
    };

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
      { path: '/api/costs/by-project', method: 'GET' },
      { path: '/api/costs/by-agent', method: 'GET' },
      { path: '/api/costs/trend', method: 'GET' },
      { path: '/api/costs/session-savings', method: 'GET' },
      { path: '/api/costs/per-task', method: 'GET' },
    ];

    for (const { path, method } of ROUTES) {
      it(`${method} ${path} passes a FunctionReference, not a string`, async () => {
        const r = new Router();
        const { client, calls } = buildSpyClient();
        registerCostRoutes(r, client as any);

        const match = r.match(method, path);
        expect(match).not.toBeNull();
        await match!.handler(makeRequest(path), {});

        const stringCalls = calls.filter((c) => c.argType === 'string');
        expect(stringCalls).toHaveLength(0);
      });
    }
  });
});

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerPerformanceRoutes } from './performance';

const mockClient = {
  mutation: mock(async () => ({})),
  query: mock(async () => []),
};

/**
 * Creates a new instance of a Request object for testing performance route handlers.
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - URL path
 * @returns Request object
 */
function makeRequest(method: string, path: string): Request {
  return new Request(`http://localhost${path}`, { method });
}

describe('performance routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.query.mockReset();
    registerPerformanceRoutes(router, mockClient as any);
  });

  describe('GET /api/performance/employee/:employeeId', () => {
    it('returns employee performance data with baselines and runs', async () => {
      const now = Date.now();
      (mockClient.query as any).mockImplementation(async (name: string, args: any) => {
        if (name === 'performance:getEmployeePerformance') {
          return {
            baselines: [
              {
                employeeId: args.employeeId,
                projectSlug: args.projectId,
                taskKind: 'feature',
                avgDurationMs: 120,
                p50DurationMs: 110,
                p95DurationMs: 200,
                completionRate: 0.8,
                sampleCount: 10,
                windowStart: now - 7 * 86400000,
                windowEnd: now,
              },
            ],
            runs: [
              {
                taskId: 'task-1',
                employeeId: args.employeeId,
                status: 'succeeded',
                startedAt: now - 100000,
                finishedAt: now - 90000,
              },
            ],
          };
        }
        return [];
      });

      const match = router.match(
        'GET',
        '/api/performance/employee/emp-1?projectId=proj-1&windowDays=7',
      );
      expect(match).not.toBeNull();

      const response = await match!.handler(
        makeRequest('GET', '/api/performance/employee/emp-1?projectId=proj-1&windowDays=7'),
        match!.params,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.baselines).toHaveLength(1);
      expect(body.data.baselines[0].taskKind).toBe('feature');
      expect(body.data.runs).toHaveLength(1);
    });

    it('returns 400 when projectId query param is missing', async () => {
      const match = router.match('GET', '/api/performance/employee/emp-1');
      expect(match).not.toBeNull();

      const response = await match!.handler(
        makeRequest('GET', '/api/performance/employee/emp-1'),
        match!.params,
      );

      expect(response.status).toBe(400);
    });

    it('returns empty data with message when no baselines exist', async () => {
      (mockClient.query as any).mockImplementation(async () => null);

      const match = router.match(
        'GET',
        '/api/performance/employee/emp-1?projectId=proj-1&windowDays=7',
      );
      expect(match).not.toBeNull();

      const response = await match!.handler(
        makeRequest('GET', '/api/performance/employee/emp-1?projectId=proj-1&windowDays=7'),
        match!.params,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeNull();
      expect(body.message).toBeDefined();
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
          return null;
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
      { path: '/api/performance/phase-breakdown', method: 'GET' },
      { path: '/api/performance/phase-trends', method: 'GET' },
      { path: '/api/performance/agent-latency', method: 'GET' },
      { path: '/api/performance/slow-agents', method: 'GET' },
      { path: '/api/performance/regression-alerts', method: 'GET' },
      { path: '/api/performance/employee/:employeeId', method: 'GET' },
    ];

    for (const { path, method } of ROUTES) {
      it(`${method} ${path} passes a FunctionReference, not a string`, async () => {
        const r = new Router();
        const { client, calls } = buildSpyClient();
        registerPerformanceRoutes(r, client as any);

        const match = r.match(method, path);
        expect(match).not.toBeNull();
        const requestPath = path.includes(':employeeId')
          ? path.replace(':employeeId', 'emp-1') + '?projectId=p-1'
          : path;
        const params = path.includes(':employeeId') ? { employeeId: 'emp-1' } : match!.params;
        await match!.handler(makeRequest(method, requestPath), params);

        const stringCalls = calls.filter((c) => c.argType === 'string');
        expect(stringCalls).toHaveLength(0);
      });
    }
  });
});

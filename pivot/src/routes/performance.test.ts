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
});

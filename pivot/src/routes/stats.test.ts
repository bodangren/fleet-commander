import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerStatsRoutes } from './stats';

const mockClient = {
  mutation: mock(async () => ({})),
  query: mock(async () => []),
};

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('stats routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    registerStatsRoutes(router, mockClient as any);
  });

  describe('GET /api/stats/overview', () => {
    it('returns overview stats', async () => {
      const match = router.match('GET', '/api/stats/overview');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('GET', '/api/stats/overview'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.projects).toBe(0);
      expect(data.tasks).toBe(0);
      expect(data.agents).toBe(0);
    });
  });

  describe('POST /api/policy/stats/recompute', () => {
    it('triggers recompute and returns result', async () => {
      (mockClient.query as any).mockImplementation(async (_name: any, args: any) => {
        if (args && typeof args.since === 'number') {
          return [
            {
              taskId: 'task-feature-1',
              projectSlug: 'mono-repo',
              createdAt: Date.now() + 1000,
              executorStatus: 'succeeded',
              executorConfidence: 0.9,
              architectConfidence: 0.8,
            },
          ];
        }
        if (args && args.scope === 'policyStats' && args.key === 'lastRunAt') {
          return { valueJson: JSON.stringify(Date.now()) };
        }
        return null;
      });

      const match = router.match('POST', '/api/policy/stats/recompute');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('POST', '/api/policy/stats/recompute'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recomputed).toBe(true);
      expect(data.dispatchBuckets).toBe(1);
      expect(data.harnessNames).toBe(1);
    });

    it('returns no-op when nothing is dirty', async () => {
      const now = Date.now();
      (mockClient.query as any).mockImplementation(async (_name: any, args: any) => {
        if (args && typeof args.since === 'number') {
          return [
            {
              taskId: 'task-feature-1',
              projectSlug: 'mono-repo',
              createdAt: now - 1000,
              executorStatus: 'succeeded',
            },
          ];
        }
        if (args && args.scope === 'policyStats' && args.key === 'lastRunAt') {
          return { valueJson: JSON.stringify(now) };
        }
        return null;
      });

      const match = router.match('POST', '/api/policy/stats/recompute');
      const response = await match!.handler(makeRequest('POST', '/api/policy/stats/recompute'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recomputed).toBe(false);
      expect(data.reason).toBe('no_dirty_buckets');
    });
  });
});

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerOrchestratorRoutes } from './orchestrator';

const mockClient = {
  mutation: mock(async () => {}),
  query: mock(async () => {}),
};

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('orchestrator routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    registerOrchestratorRoutes(router, mockClient as any);
  });

  describe('GET /api/orchestrator/status', () => {
    it('returns continuous mode status', async () => {
      let callCount = 0;
      (mockClient.query as any).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { enabled: true, state: 'running', intervalMs: 60_000, consecutiveFailures: 0, maxConcurrent: 1 };
        }
        return [];
      });

      const match = router.match('GET', '/api/orchestrator/status');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('GET', '/api/orchestrator/status'), {});
      const data = await response.json();
      expect(data.mode).toBe('continuous');
      expect(data.state).toBe('running');
      expect(data.enabled).toBe(true);
    });

    it('returns active execution count', async () => {
      let callCount = 0;
      (mockClient.query as any).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { enabled: true, state: 'running', intervalMs: 60_000, consecutiveFailures: 0, maxConcurrent: 1 };
        }
        return [
          { status: 'running' },
          { status: 'succeeded' },
          { status: 'running' },
        ];
      });

      const match = router.match('GET', '/api/orchestrator/status');
      const response = await match!.handler(makeRequest('GET', '/api/orchestrator/status'), {});
      const data = await response.json();
      expect(data.activeExecutions).toBe(2);
    });
  });

  describe('POST /api/orchestrator/pause', () => {
    it('pauses continuous mode', async () => {
      const match = router.match('POST', '/api/orchestrator/pause');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('POST', '/api/orchestrator/pause'), {});
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.state).toBe('paused');
      expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/orchestrator/resume', () => {
    it('resumes continuous mode', async () => {
      const match = router.match('POST', '/api/orchestrator/resume');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('POST', '/api/orchestrator/resume'), {});
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.state).toBe('running');
    });
  });

  describe('POST /api/orchestrator/enable', () => {
    it('enables continuous mode with defaults', async () => {
      const match = router.match('POST', '/api/orchestrator/enable');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('POST', '/api/orchestrator/enable'), {});
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.state).toBe('running');
    });

    it('accepts intervalMs and maxConcurrent overrides', async () => {
      const match = router.match('POST', '/api/orchestrator/enable');
      const response = await match!.handler(
        makeRequest('POST', '/api/orchestrator/enable', { intervalMs: 120_000, maxConcurrent: 2 }),
        {},
      );
      const data = await response.json();
      expect(data.ok).toBe(true);
    });
  });

  describe('POST /api/orchestrator/disable', () => {
    it('disables continuous mode', async () => {
      const match = router.match('POST', '/api/orchestrator/disable');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('POST', '/api/orchestrator/disable'), {});
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.state).toBe('idle');
    });
  });

  describe('PUT /api/orchestrator/interval', () => {
    it('sets orchestrator interval', async () => {
      const match = router.match('PUT', '/api/orchestrator/interval');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('PUT', '/api/orchestrator/interval', { intervalMs: 90_000 }),
        {},
      );
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.intervalMs).toBe(90_000);
    });

    it('rejects missing intervalMs', async () => {
      const match = router.match('PUT', '/api/orchestrator/interval');
      const response = await match!.handler(
        makeRequest('PUT', '/api/orchestrator/interval', {}),
        {},
      );
      expect(response.status).toBe(400);
    });
  });
});

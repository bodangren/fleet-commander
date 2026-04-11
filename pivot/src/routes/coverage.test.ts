import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerCoverageRoutes } from './coverage';

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

describe('coverage routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    registerCoverageRoutes(router, mockClient as any);
  });

  describe('POST /api/coverage/record', () => {
    it('stores a coverage record', async () => {
      (mockClient.mutation as any).mockImplementation(async () => ({
        projectSlug: 'test-project',
        projectId: 'proj-123',
        percentage: 85.5,
        tool: 'vitest',
        executionId: 'exec-456',
        createdAt: Date.now(),
      }));

      const match = router.match('POST', '/api/coverage/record');
      expect(match).not.toBeNull();
      const response = await match!.handler(
        makeRequest('POST', '/api/coverage/record', {
          projectSlug: 'test-project',
          projectId: 'proj-123',
          percentage: 85.5,
          tool: 'vitest',
          executionId: 'exec-456',
        }),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.percentage).toBe(85.5);
      expect(data.tool).toBe('vitest');
    });
  });

  describe('GET /api/coverage/history/:projectSlug', () => {
    it('returns coverage history for a project', async () => {
      const mockRecords = [
        { projectSlug: 'test-project', projectId: 'proj-123', percentage: 85.5, tool: 'vitest', createdAt: Date.now() },
        { projectSlug: 'test-project', projectId: 'proj-123', percentage: 82.0, tool: 'vitest', createdAt: Date.now() - 86400000 },
      ];
      (mockClient.query as any).mockImplementation(async () => mockRecords);

      const match = router.match('GET', '/api/coverage/history/test-project');
      expect(match).not.toBeNull();
      const response = await match!.handler(makeRequest('GET', '/api/coverage/history/test-project'), {});
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].percentage).toBe(85.5);
    });

    it('returns empty array when no coverage records exist', async () => {
      (mockClient.query as any).mockImplementation(async () => []);

      const match = router.match('GET', '/api/coverage/history/unknown-project');
      const response = await match!.handler(makeRequest('GET', '/api/coverage/history/unknown-project'), {});
      const data = await response.json();
      expect(data).toHaveLength(0);
    });
  });

  describe('GET /api/coverage/latest/:projectSlug', () => {
    it('returns latest coverage record for a project', async () => {
      (mockClient.query as any).mockImplementation(async () => ({
        projectSlug: 'test-project',
        projectId: 'proj-123',
        percentage: 85.5,
        tool: 'vitest',
        createdAt: Date.now(),
      }));

      const match = router.match('GET', '/api/coverage/latest/test-project');
      const response = await match!.handler(makeRequest('GET', '/api/coverage/latest/test-project'), {});
      const data = await response.json();
      expect(data.percentage).toBe(85.5);
    });

    it('returns null when no coverage records exist', async () => {
      (mockClient.query as any).mockImplementation(async () => null);

      const match = router.match('GET', '/api/coverage/latest/unknown-project');
      const response = await match!.handler(makeRequest('GET', '/api/coverage/latest/unknown-project'), {});
      const data = await response.json();
      expect(data).toBeNull();
    });
  });
});
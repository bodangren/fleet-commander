import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerRetrospectiveRoutes, type GenerateReportFn } from './retrospectives';

const mockClient = {
  mutation: mock(async () => {}),
  query: mock(async () => {}),
};

/**
 * Creates a new instance of a Request object for testing retrospective route handlers.
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

describe('retrospectives routes', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
  });

  describe('GET /api/retrospectives', () => {
    it('lists retrospectives with filters', async () => {
      const retros = [
        { _id: 'r1', name: 'Retro 1', status: 'completed', triggeredBy: 'manual', createdAt: Date.now() },
      ];
      (mockClient.query as any).mockImplementation(async () => retros);

      registerRetrospectiveRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/retrospectives');
      expect(match).not.toBeNull();

      const response = await match!.handler(
        makeRequest('GET', '/api/retrospectives?projectSlug=proj&limit=10'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Retro 1');
    });
  });

  describe('GET /api/retrospectives/:id', () => {
    it('returns a retrospective by id', async () => {
      const retro = { _id: 'r1', name: 'Retro 1', status: 'completed', triggeredBy: 'manual', createdAt: Date.now() };
      (mockClient.query as any).mockImplementation(async () => retro);

      registerRetrospectiveRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/retrospectives/r1');
      expect(match).not.toBeNull();

      const response = await match!.handler(makeRequest('GET', '/api/retrospectives/r1'), { id: 'r1' });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Retro 1');
    });

    it('returns 404 when not found', async () => {
      (mockClient.query as any).mockImplementation(async () => null);

      registerRetrospectiveRoutes(router, mockClient as any);
      const match = router.match('GET', '/api/retrospectives/missing');
      const response = await match!.handler(makeRequest('GET', '/api/retrospectives/missing'), { id: 'missing' });
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/retrospectives/generate', () => {
    it('requires sprintId', async () => {
      registerRetrospectiveRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/retrospectives/generate');
      const response = await match!.handler(makeRequest('POST', '/api/retrospectives/generate', {}), {});
      expect(response.status).toBe(400);
    });

    it('generates and stores a validated report', async () => {
      let callCount = 0;
      (mockClient.query as any).mockImplementation(async (name: string, args: Record<string, unknown>) => {
        callCount++;
        if (name === 'sprints:getSprintById') {
          return { name: 'Sprint 42', projectSlug: 'proj' };
        }
        if (name === 'retrospectives:getSprintAggregateData') {
          return { sprintName: 'Sprint 42', taskCounts: { planned: 5, completed: 3 } };
        }
        if (name === 'retrospectives:getRetrospective') {
          return { _id: args.id, name: 'Retrospective: Sprint 42', status: 'completed' };
        }
        return null;
      });
      (mockClient.mutation as any).mockImplementation(async () => 'retro-123');

      const mockGenerate: GenerateReportFn = async () => ({
        report: '# Sprint Summary\nok\n# Patterns Detected\nok\n# Top Blockers\nok\n# Improvement Suggestions\nok\n# Agent Workload Balance\nok\n# Priority Accuracy\nok',
      });

      registerRetrospectiveRoutes(router, mockClient as any, mockGenerate);
      const match = router.match('POST', '/api/retrospectives/generate');
      const response = await match!.handler(
        makeRequest('POST', '/api/retrospectives/generate', { sprintId: 'sprint-42' }),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('completed');
      expect(mockClient.mutation).toHaveBeenCalledTimes(2); // create + complete
    });

    it('fails when report is missing required sections', async () => {
      let callCount = 0;
      (mockClient.query as any).mockImplementation(async (name: string) => {
        if (name === 'sprints:getSprintById') return { name: 'Sprint 42', projectSlug: 'proj' };
        if (name === 'retrospectives:getSprintAggregateData') return { taskCounts: {} };
        return null;
      });
      (mockClient.mutation as any).mockImplementation(async () => 'retro-123');

      const mockGenerate: GenerateReportFn = async () => ({
        report: '# Sprint Summary\nok', // missing sections
      });

      registerRetrospectiveRoutes(router, mockClient as any, mockGenerate);
      const match = router.match('POST', '/api/retrospectives/generate');
      const response = await match!.handler(
        makeRequest('POST', '/api/retrospectives/generate', { sprintId: 'sprint-42' }),
        {},
      );
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.status).toBe('failed');
      expect(data.error).toContain('missing required sections');
      expect(mockClient.mutation).toHaveBeenCalledTimes(2); // create + fail
    });

    it('fails when aggregation throws', async () => {
      (mockClient.query as any).mockImplementation(async (name: string) => {
        if (name === 'sprints:getSprintById') return { name: 'Sprint 42', projectSlug: 'proj' };
        if (name === 'retrospectives:getSprintAggregateData') throw new Error('DB timeout');
        return null;
      });
      (mockClient.mutation as any).mockImplementation(async () => 'retro-123');

      registerRetrospectiveRoutes(router, mockClient as any);
      const match = router.match('POST', '/api/retrospectives/generate');
      const response = await match!.handler(
        makeRequest('POST', '/api/retrospectives/generate', { sprintId: 'sprint-42' }),
        {},
      );
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('DB timeout');
    });

    it('fails when LLM returns empty report', async () => {
      (mockClient.query as any).mockImplementation(async (name: string) => {
        if (name === 'sprints:getSprintById') return { name: 'Sprint 42', projectSlug: 'proj' };
        if (name === 'retrospectives:getSprintAggregateData') return { taskCounts: {} };
        return null;
      });
      (mockClient.mutation as any).mockImplementation(async () => 'retro-123');

      const mockGenerate: GenerateReportFn = async () => ({ report: '', error: 'LLM refused' });

      registerRetrospectiveRoutes(router, mockClient as any, mockGenerate);
      const match = router.match('POST', '/api/retrospectives/generate');
      const response = await match!.handler(
        makeRequest('POST', '/api/retrospectives/generate', { sprintId: 'sprint-42' }),
        {},
      );
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('LLM refused');
    });
  });
});

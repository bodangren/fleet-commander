import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { Router, json } from './router';
import { registerLogRoutes } from './logs';
import type { ConvexHttpClient } from 'convex/browser';

/**
 * Creates a mock Request object for testing log routes.
 * @param url - Full URL
 * @param method - HTTP method (default GET)
 * @param body - Optional request body
 * @returns Request object
 */
function makeRequest(url: string, method = 'GET', body?: Record<string, unknown>): Request {
  return {
    url,
    method,
    json: async () => body,
  } as unknown as Request;
}

describe('registerLogRoutes', () => {
  let router: Router;
  let mockClient: Partial<ConvexHttpClient>;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    handlers = {};
    mockClient = {
      query: mock(),
      mutation: mock(),
    };
    router = {
      get: mock((path: string, handler: Function) => { handlers[`GET ${path}`] = handler; }),
      post: mock((path: string, handler: Function) => { handlers[`POST ${path}`] = handler; }),
      put: mock((path: string, handler: Function) => { handlers[`PUT ${path}`] = handler; }),
      delete: mock((path: string, handler: Function) => { handlers[`DELETE ${path}`] = handler; }),
    } as unknown as Router;

    registerLogRoutes(router, mockClient as ConvexHttpClient);
  });

  describe('GET /api/projects/:projectSlug/tasks/:taskId/review', () => {
    test('returns the most recent review for a task with multiple reviews', async () => {
      const mockLogs = [
        { trackId: 'task-1', status: 'reviewed', summary: 'old review', createdAt: 1000 },
        { trackId: 'task-1', status: 'reviewed', summary: 'newer review', createdAt: 2000 },
        { trackId: 'task-1', status: 'agent-reviewed', summary: 'agent review', createdAt: 3000 },
        { trackId: 'task-2', status: 'reviewed', summary: 'other task', createdAt: 2500 },
      ];

      (mockClient.query as ReturnType<typeof mock>).mockResolvedValue(mockLogs);

      const handler = handlers['GET /api/projects/:projectSlug/tasks/:taskId/review'];
      const response = await handler(makeRequest('/api/projects/my-project/tasks/task-1/review'), {
        projectSlug: 'my-project',
        taskId: 'task-1',
      });

      const body = await response.json();

      expect(body).toEqual({
        taskId: 'task-1',
        status: 'passed',
        results: [{ category: 'review', status: 'passed', output: 'agent review', durationMs: 0 }],
        reviewedAt: expect.any(String),
        agentReview: undefined,
      });
    });

    test('returns not_found status when no reviews exist for task', async () => {
      const mockLogs = [
        { trackId: 'other-task', status: 'reviewed', summary: 'other', createdAt: 1000 },
      ];

      (mockClient.query as ReturnType<typeof mock>).mockResolvedValue(mockLogs);

      const handler = handlers['GET /api/projects/:projectSlug/tasks/:taskId/review'];
      const response = await handler(makeRequest('/api/projects/my-project/tasks/task-1/review'), {
        projectSlug: 'my-project',
        taskId: 'task-1',
      });

      const body = await response.json();

      expect(body).toEqual({
        taskId: 'task-1',
        status: 'not_found',
        results: [],
      });
    });

    test('parses agent-reviewed status into agentReview field', async () => {
      const mockLogs = [
        {
          trackId: 'task-1',
          status: 'agent-reviewed',
          summary: 'Agent review passed',
          createdAt: 3000,
          rawOutput: JSON.stringify({
            agentStatus: 'pass',
            reviewDepth: 'full',
            agentComments: [
              { file: 'src/main.ts', line: 10, severity: 'low', message: 'Minor style issue' },
            ],
          }),
        },
      ];

      (mockClient.query as ReturnType<typeof mock>).mockResolvedValue(mockLogs);

      const handler = handlers['GET /api/projects/:projectSlug/tasks/:taskId/review'];
      const response = await handler(makeRequest('/api/projects/my-project/tasks/task-1/review'), {
        projectSlug: 'my-project',
        taskId: 'task-1',
      });

      const body = await response.json();

      expect(body.status).toBe('passed');
      expect(body.agentReview).toEqual({
        status: 'pass',
        depth: 'full',
        comments: [
          { file: 'src/main.ts', line: 10, severity: 'low', message: 'Minor style issue' },
        ],
      });
    });
  });
});

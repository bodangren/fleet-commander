import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerSimulationRoutes } from './simulation';
import type { ConvexHttpClient } from 'convex/browser';

/**
 * Create mock client for testing simulation routes.
 * @returns Mock client object with query and mutation methods
 */
function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

/**
 * Create request object for testing simulation routes.
 * @param body - Request body data
 * @returns Request object
 */
function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/policy/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('registerSimulationRoutes', () => {
  let router: Router;
  let client: ConvexHttpClient;

  beforeEach(() => {
    router = new Router();
    client = createMockClient();
    registerSimulationRoutes(router, client);
  });

  it('returns bad request for invalid JSON', async () => {
    const request = new Request('http://localhost/api/policy/simulate', {
      method: 'POST',
      body: 'not-json',
    });
    const matched = router.match('POST', '/api/policy/simulate');
    const response = await matched!.handler(request, {});
    expect(response.status).toBe(400);
  });

  it('returns bad request when windowDays is missing', async () => {
    const request = createRequest({ candidateWeights: {} });
    const matched = router.match('POST', '/api/policy/simulate');
    const response = await matched!.handler(request, {});
    expect(response.status).toBe(400);
  });

  it('simulates with provided dispatches and returns report', async () => {
    const request = createRequest({
      windowDays: 7,
      candidateWeights: {},
      candidateRules: {},
      dispatches: [
        {
          historicalChoice: 'task-a',
          candidates: [
            {
              projectSlug: 'test',
              trackId: 'track-1',
              taskKey: 'task-a',
              title: 'Task A',
              status: 'todo',
              dependencies: [],
              updatedAt: Date.now(),
            },
          ],
          allTasks: new Map([
            [
              'task-a',
              {
                projectSlug: 'test',
                trackId: 'track-1',
                taskKey: 'task-a',
                title: 'Task A',
                status: 'todo',
                dependencies: [],
                updatedAt: Date.now(),
              },
            ],
          ]),
        },
      ],
    });

    (client.query as ReturnType<typeof mock>).mockResolvedValue([]);
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({});

    const matched = router.match('POST', '/api/policy/simulate');
    const response = await matched!.handler(request, {});
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.totalDispatches).toBe(1);
    expect(data.misconfigurationWarning).toBe(false);
  });

  it('returns simulation runs list', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      {
        windowDays: 7,
        candidateWeightsJson: '{}',
        candidateRulesJson: '{}',
        reportJson: '{}',
        createdAt: Date.now(),
      },
    ]);

    const request = new Request('http://localhost/api/policy/simulate/runs');
    const matched = router.match('GET', '/api/policy/simulate/runs');
    const response = await matched!.handler(request, {});
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.length).toBe(1);
  });
});

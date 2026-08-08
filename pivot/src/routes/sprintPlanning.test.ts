import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import { Router } from './router';
import { registerSprintPlanningRoutes } from './sprintPlanning';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/planning/sprints', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/planning/sprints', () => {
  let router: Router;
  let mutation: ReturnType<typeof mock>;

  beforeEach(() => {
    mutation = mock(async () => ({ sprintId: 'sprint-1', taskId: 'task-1' }));
    router = new Router();
    registerSprintPlanningRoutes(router, {
      query: mock(async () => []),
      mutation,
    } as unknown as ConvexHttpClient);
  });

  it('rejects zero or multiple task assignments before calling Convex', async () => {
    const match = router.match('POST', '/api/planning/sprints')!;

    const empty = await match.handler(
      makeRequest({
        projectId: 'project-1',
        name: 'Bounded sprint',
        budget: 10,
        taskAssignments: [],
      }),
      {},
    );
    expect(empty.status).toBe(400);

    const multiple = await match.handler(
      makeRequest({
        projectId: 'project-1',
        name: 'Bounded sprint',
        budget: 10,
        taskAssignments: [
          { taskId: 'task-1', agentId: 'agent-1' },
          { taskId: 'task-1', agentId: 'agent-1' },
        ],
      }),
      {},
    );
    expect(multiple.status).toBe(400);
    expect(mutation).not.toHaveBeenCalled();
  });

  it('calls exactly one atomic Convex mutation with one assignment', async () => {
    const match = router.match('POST', '/api/planning/sprints')!;
    const response = await match.handler(
      makeRequest({
        projectId: 'project-1',
        name: 'Bounded sprint',
        budget: 10,
        taskAssignments: [{ taskId: 'task-1', agentId: 'agent-1' }],
      }),
      {},
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sprintId: 'sprint-1',
      taskId: 'task-1',
    });
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(mutation.mock.calls[0]?.[1]).toMatchObject({
      projectId: 'project-1',
      name: 'Bounded sprint',
      budget: 10,
      taskId: 'task-1',
      agentId: 'agent-1',
    });
  });

  it('rejects non-finite and negative budgets before calling Convex', async () => {
    const match = router.match('POST', '/api/planning/sprints')!;
    for (const budget of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const response = await match.handler(
        makeRequest({
          projectId: 'project-1',
          name: 'Bounded sprint',
          budget,
          taskAssignments: [{ taskId: 'task-1', agentId: 'agent-1' }],
        }),
        {},
      );
      expect(response.status).toBe(400);
    }
    expect(mutation).not.toHaveBeenCalled();
  });

  it('maps Convex ID validator failures to a client error', async () => {
    mutation.mockImplementation(async () => {
      throw new Error(
        'ArgumentValidationError: Value does not match validator. Path: .agentId Validator: v.id("agents")',
      );
    });
    const match = router.match('POST', '/api/planning/sprints')!;

    const response = await match.handler(
      makeRequest({
        projectId: 'not-an-id',
        name: 'Invalid ID sprint',
        budget: 10,
        taskAssignments: [{ taskId: 'not-an-id', agentId: 'not-an-id' }],
      }),
      {},
    );

    expect(response.status).toBe(400);
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      error:
        'ArgumentValidationError: Value does not match validator. Path: .agentId Validator: v.id("agents")',
    });
  });
});

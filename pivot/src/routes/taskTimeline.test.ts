import { describe, expect, it, mock } from 'bun:test';
import { registerTaskTimelineRoutes } from './taskTimeline';

describe('registerTaskTimelineRoutes', () => {
  it('registers GET /api/tasks/:taskId/timeline', () => {
    const mockRouter = {
      get: mock(),
    };
    const mockClient = {
      query: mock().mockResolvedValue({
        task: { _id: 'task-1', title: 'Test' },
        pipelineRuns: [],
        agents: [],
        sprint: null,
        project: null,
      }),
    };

    registerTaskTimelineRoutes(mockRouter as any, mockClient as any);

    expect(mockRouter.get).toHaveBeenCalledTimes(1);
    expect(mockRouter.get.mock.calls[0][0]).toBe('/api/tasks/:taskId/timeline');
  });

  it('returns timeline data on success', async () => {
    const mockRouter = {
      get: mock(),
    };
    const mockClient = {
      query: mock().mockResolvedValue({
        task: { _id: 'task-1', title: 'Test' },
        pipelineRuns: [],
        agents: [],
        sprint: null,
        project: null,
      }),
    };

    registerTaskTimelineRoutes(mockRouter as any, mockClient as any);

    const handler = mockRouter.get.mock.calls[0][1];
    const res = await handler({} as Request, { taskId: 'task-1' });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.task.title).toBe('Test');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.anything(),
      { taskId: 'task-1' },
    );
  });

  it('returns 500 on error', async () => {
    const mockRouter = {
      get: mock(),
    };
    const mockClient = {
      query: mock().mockRejectedValue(new Error('DB failure')),
    };

    registerTaskTimelineRoutes(mockRouter as any, mockClient as any);

    const handler = mockRouter.get.mock.calls[0][1];
    const res = await handler({} as Request, { taskId: 'task-1' });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB failure');
  });
});

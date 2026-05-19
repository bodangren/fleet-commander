import { describe, expect, it, mock } from 'bun:test';
import { registerDashboardRoutes } from './dashboard';

describe('registerDashboardRoutes', () => {
  it('registers GET /api/dashboard', () => {
    const mockRouter = {
      get: mock(),
    };
    const mockClient = {
      query: mock().mockResolvedValue({
        sprint: null,
        tasks: [],
        agents: [],
        pipelineRuns: [],
        alerts: [],
        metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
      }),
    };

    registerDashboardRoutes(mockRouter as any, mockClient as any);

    expect(mockRouter.get).toHaveBeenCalledTimes(1);
    expect(mockRouter.get.mock.calls[0][0]).toBe('/api/dashboard');
  });

  it('returns dashboard data on success', async () => {
    const mockRouter = {
      get: mock(),
    };
    const mockData = {
      sprint: { _id: 's1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 50, pointsDelivered: 10, taskCount: 5, completedCount: 3 },
      tasks: [],
      agents: [],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0.5, successRate: 80, avgPipelineTime: 120000, rejectionRate: 5 },
    };
    const mockClient = {
      query: mock().mockResolvedValue(mockData),
    };

    registerDashboardRoutes(mockRouter as any, mockClient as any);

    const handler = mockRouter.get.mock.calls[0][1];
    const req = new Request('http://localhost:8081/api/dashboard');
    const res = await handler(req, {});

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.sprint.name).toBe('Sprint 1');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.anything(),
      { projectId: undefined },
    );
  });

  it('passes projectId from query string', async () => {
    const mockRouter = {
      get: mock(),
    };
    const mockClient = {
      query: mock().mockResolvedValue({
        sprint: null,
        tasks: [],
        agents: [],
        pipelineRuns: [],
        alerts: [],
        metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
      }),
    };

    registerDashboardRoutes(mockRouter as any, mockClient as any);

    const handler = mockRouter.get.mock.calls[0][1];
    const req = new Request('http://localhost:8081/api/dashboard?projectId=proj123');
    await handler(req, {});

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.anything(),
      { projectId: 'proj123' },
    );
  });

  it('returns 500 on error', async () => {
    const mockRouter = {
      get: mock(),
    };
    const mockClient = {
      query: mock().mockRejectedValue(new Error('DB failure')),
    };

    registerDashboardRoutes(mockRouter as any, mockClient as any);

    const handler = mockRouter.get.mock.calls[0][1];
    const req = new Request('http://localhost:8081/api/dashboard');
    const res = await handler(req, {});

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB failure');
  });
});

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';

function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('analytics queries', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  describe('getCompletionTrends', () => {
    it('returns array of day objects', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        { date: '2026-05-03', completed: 0, failed: 0, created: 0 },
        { date: '2026-05-02', completed: 2, failed: 1, created: 3 },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getCompletionTrends', { days: 2 });

      expect(result).toHaveLength(2);
      expect(result[0].completed).toBe(0);
      expect(result[1].completed).toBe(2);
      expect(result[1].failed).toBe(1);
    });

    it('supports project filter', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        { date: '2026-05-03', completed: 1, failed: 0, created: 1 },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getCompletionTrends', {
        days: 1,
        projectSlug: 'my-project',
      });

      expect(result).toHaveLength(1);
      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ days: 1, projectSlug: 'my-project' });
    });
  });

  describe('getAgentUtilization', () => {
    it('returns agent utilization data', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        { agent: 'agent-a', date: '2026-05-02', activeTasks: 2, completedTasks: 5 },
        { agent: 'agent-b', date: '2026-05-02', activeTasks: 0, completedTasks: 3 },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getAgentUtilization', { days: 7 });

      expect(result).toHaveLength(2);
      expect(result[0].agent).toBe('agent-a');
      expect(result[0].activeTasks).toBe(2);
      expect(result[0].completedTasks).toBe(5);
    });
  });

  describe('getBottlenecks', () => {
    it('returns bottleneck data sorted by failure rate', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        {
          trackId: 'track-a',
          projectSlug: 'p1',
          totalTasks: 10,
          failedTasks: 5,
          avgDurationMs: 5000,
          failureRate: 0.5,
          lastActivityAt: Date.now(),
        },
        {
          trackId: 'track-b',
          projectSlug: 'p1',
          totalTasks: 8,
          failedTasks: 0,
          avgDurationMs: 2000,
          failureRate: 0,
          lastActivityAt: Date.now(),
        },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getBottlenecks', { days: 30 });

      expect(result).toHaveLength(2);
      expect(result[0].trackId).toBe('track-a');
      expect(result[0].failureRate).toBe(0.5);
      expect(result[1].trackId).toBe('track-b');
      expect(result[1].failureRate).toBe(0);
    });
  });

  describe('getQueueDepth', () => {
    it('returns queue depth over time', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        { date: '2026-05-01', pending: 5, inProgress: 3, completed: 10 },
        { date: '2026-05-02', pending: 4, inProgress: 4, completed: 12 },
        { date: '2026-05-03', pending: 3, inProgress: 2, completed: 15 },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getQueueDepth', { days: 3 });

      expect(result).toHaveLength(3);
      expect(result[0].pending).toBe(5);
      expect(result[0].inProgress).toBe(3);
      expect(result[0].completed).toBe(10);
      expect(result[2].pending).toBe(3);
      expect(result[2].completed).toBe(15);
    });
  });
});

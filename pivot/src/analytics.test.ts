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

  describe('getHookMetrics', () => {
    it('returns hook execution and failure counts per phase per day', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        { date: '2026-05-02', phase: 'beforeRunHook', executions: 5, failures: 1 },
        { date: '2026-05-02', phase: 'afterRunHook', executions: 5, failures: 0 },
        { date: '2026-05-02', phase: 'afterCreateHook', executions: 3, failures: 2 },
        { date: '2026-05-03', phase: 'beforeRunHook', executions: 8, failures: 0 },
        { date: '2026-05-03', phase: 'afterRunHook', executions: 8, failures: 1 },
        { date: '2026-05-03', phase: 'afterCreateHook', executions: 6, failures: 0 },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getHookMetrics', { days: 2 });

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({
        date: '2026-05-02',
        phase: 'beforeRunHook',
        executions: 5,
        failures: 1,
      });
      expect(result[3].date).toBe('2026-05-03');
      expect(result[3].phase).toBe('beforeRunHook');
      expect(result[3].failures).toBe(0);
    });

    it('supports project filter', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        { date: '2026-05-03', phase: 'beforeRunHook', executions: 3, failures: 1 },
        { date: '2026-05-03', phase: 'afterRunHook', executions: 3, failures: 0 },
        { date: '2026-05-03', phase: 'afterCreateHook', executions: 2, failures: 0 },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getHookMetrics', {
        days: 1,
        projectSlug: 'my-project',
      });

      expect(result).toHaveLength(3);
      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ days: 1, projectSlug: 'my-project' });
    });

    it('returns empty array when no hook errors exist', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getHookMetrics', { days: 7 });

      expect(result).toHaveLength(0);
    });

    it('includes all three hook phases', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([
        { date: '2026-05-03', phase: 'beforeRunHook', executions: 1, failures: 0 },
        { date: '2026-05-03', phase: 'afterRunHook', executions: 1, failures: 0 },
        { date: '2026-05-03', phase: 'afterCreateHook', executions: 1, failures: 0 },
      ]);

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getHookMetrics', { days: 1 });

      const phases = result.map((r: { phase: string }) => r.phase);
      expect(phases).toContain('beforeRunHook');
      expect(phases).toContain('afterRunHook');
      expect(phases).toContain('afterCreateHook');
    });
  });

  describe('getSessionMetrics', () => {
    it('returns session resumption stats with byDate breakdown', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue({
        totalTasks: 50,
        sessionBoundTasks: 30,
        resumptionRate: 0.6,
        activeSessions: 5,
        byDate: [
          { date: '2026-05-02', newSessions: 3, resumedSessions: 7 },
          { date: '2026-05-03', newSessions: 5, resumedSessions: 10 },
        ],
      });

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getSessionMetrics', { days: 2 });

      expect(result.totalTasks).toBe(50);
      expect(result.sessionBoundTasks).toBe(30);
      expect(result.resumptionRate).toBe(0.6);
      expect(result.activeSessions).toBe(5);
      expect(result.byDate).toHaveLength(2);
      expect(result.byDate[0]).toEqual({
        date: '2026-05-02',
        newSessions: 3,
        resumedSessions: 7,
      });
    });

    it('supports project filter', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue({
        totalTasks: 10,
        sessionBoundTasks: 6,
        resumptionRate: 0.6,
        activeSessions: 2,
        byDate: [
          { date: '2026-05-03', newSessions: 2, resumedSessions: 4 },
        ],
      });

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getSessionMetrics', {
        days: 1,
        projectSlug: 'my-project',
      });

      expect(result.totalTasks).toBe(10);
      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ days: 1, projectSlug: 'my-project' });
    });

    it('handles zero tasks gracefully', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue({
        totalTasks: 0,
        sessionBoundTasks: 0,
        resumptionRate: 0,
        activeSessions: 0,
        byDate: [],
      });

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getSessionMetrics', { days: 7 });

      expect(result.totalTasks).toBe(0);
      expect(result.resumptionRate).toBe(0);
      expect(result.activeSessions).toBe(0);
      expect(result.byDate).toHaveLength(0);
    });

    it('resumption rate is between 0 and 1', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue({
        totalTasks: 100,
        sessionBoundTasks: 75,
        resumptionRate: 0.75,
        activeSessions: 10,
        byDate: [],
      });

      // @ts-expect-error - using string-based query reference for testing
      const result = await client.query('analytics:getSessionMetrics', { days: 30 });

      expect(result.resumptionRate).toBeGreaterThanOrEqual(0);
      expect(result.resumptionRate).toBeLessThanOrEqual(1);
      expect(result.sessionBoundTasks).toBeLessThanOrEqual(result.totalTasks);
    });
  });
});

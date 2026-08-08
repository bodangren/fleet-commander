import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type AnalyticsTest = ReturnType<typeof createConvexTest>;

async function seedAnalyticsDocuments(t: AnalyticsTest, now: number): Promise<void> {
  await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      name: 'Analytics Runtime Project',
      slug: 'analytics-runtime-project',
      description: 'Convex-test analytics runtime fixture',
      createdAt: now,
      updatedAt: now,
    });

    const taskDefaults = {
      projectId,
      description: 'Analytics runtime task',
      storyPoints: 1,
      priority: 'medium' as const,
      costEstimate: 0,
      projectSlug: 'analytics-runtime-project',
      trackId: 'analytics-runtime-track',
      createdAt: now - 60_000,
      updatedAt: now - 60_000,
    };

    await ctx.db.insert('tasks', {
      ...taskDefaults,
      title: 'Completed task',
      taskKey: 'analytics-done',
      status: 'done',
    });
    await ctx.db.insert('tasks', {
      ...taskDefaults,
      title: 'Blocked task',
      taskKey: 'analytics-blocked',
      status: 'blocked',
    });
    await ctx.db.insert('tasks', {
      ...taskDefaults,
      title: 'Backlog task',
      taskKey: 'analytics-backlog',
      status: 'backlog',
    });
    await ctx.db.insert('tasks', {
      ...taskDefaults,
      title: 'In-progress task',
      taskKey: 'analytics-in-progress',
      status: 'in_progress',
    });

    await ctx.db.insert('workRuns', {
      projectSlug: 'analytics-runtime-project',
      runId: 'analytics-running',
      status: 'running',
      selectedTaskKey: 'analytics-in-progress',
      runnerHost: 'analytics-agent',
      startedAt: now - 60_000,
    });
    await ctx.db.insert('workRuns', {
      projectSlug: 'analytics-runtime-project',
      runId: 'analytics-succeeded',
      status: 'succeeded',
      selectedTaskKey: 'analytics-done',
      runnerHost: 'analytics-agent',
      startedAt: now - 60_000,
      finishedAt: now - 30_000,
    });

    await ctx.db.insert('orchestratorErrors', {
      projectSlug: 'analytics-runtime-project',
      taskKey: 'analytics-blocked',
      agentId: 'analytics-agent',
      operation: 'beforeRunHook',
      severity: 'fatal',
      message: 'Synthetic analytics hook failure',
      createdAt: now - 60_000,
    });
  });
}

describe('analytics registered Convex runtime', () => {
  it('returns canonical completion, queue, utilization, and hook metrics', async () => {
    const t = createConvexTest();
    await seedAnalyticsDocuments(t, Date.now());

    const completion = await t.query(api.analytics.getCompletionTrends, { days: 1 });
    expect(completion).toHaveLength(1);
    expect(completion[0]).toMatchObject({ completed: 1, failed: 1, created: 4 });

    const queue = await t.query(api.analytics.getQueueDepth, { days: 1 });
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ pending: 1, inProgress: 1, completed: 1 });

    const utilization = await t.query(api.analytics.getAgentUtilization, { days: 1 });
    expect(utilization).toContainEqual({
      agent: 'analytics-agent',
      date: expect.any(String),
      activeTasks: 1,
      completedTasks: 1,
    });

    const hookMetrics = await t.query(api.analytics.getHookMetrics, { days: 1 });
    expect(hookMetrics).toContainEqual({
      date: expect.any(String),
      phase: 'beforeRunHook',
      executions: 1,
      failures: 1,
    });
  });

  it('rejects an unauthenticated registered analytics query', async () => {
    const anonymous = createUnauthenticatedConvexTest();

    await expect(
      anonymous.query(api.analytics.getCompletionTrends, { days: 1 }),
    ).rejects.toThrow('Authentication required');
  });
});

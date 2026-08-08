/**
 * Runtime contracts for burn forecasting, dashboard composition, insights,
 * and performance dashboards. All fixtures use registered APIs and the live
 * Convex schema rather than handcrafted handler contexts.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

async function seedProject(t: ConvexTest, slug: string): Promise<Id<'projects'>> {
  return t.run((ctx) =>
    ctx.db.insert('projects', {
      name: slug,
      slug,
      description: `Dashboard runtime scenario ${slug}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function seedSprint(
  t: ConvexTest,
  projectId: Id<'projects'>,
  name: string,
  budget: number,
  status: 'planned' | 'active' | 'closed' = 'active',
  startedAt = Date.now(),
): Promise<Id<'sprints'>> {
  return t.run((ctx) =>
    ctx.db.insert('sprints', {
      projectId,
      name,
      status,
      budget,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: startedAt,
      startedAt,
    }),
  );
}

async function seedTask(
  t: ConvexTest,
  projectId: Id<'projects'>,
  title: string,
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked',
  options: {
    sprintId?: Id<'sprints'>;
    storyPoints?: number;
    costEstimate?: number;
    actualCost?: number;
    projectSlug?: string;
    trackId?: string;
    taskKey?: string;
    dependencies?: string[];
    assigneeId?: Id<'agents'>;
    updatedAt?: number;
  } = {},
): Promise<Id<'tasks'>> {
  return t.run((ctx) =>
    ctx.db.insert('tasks', {
      projectId,
      sprintId: options.sprintId,
      title,
      description: `Dashboard task ${title}`,
      storyPoints: options.storyPoints ?? 1,
      status,
      priority: 'medium',
      costEstimate: options.costEstimate ?? 10,
      actualCost: options.actualCost,
      projectSlug: options.projectSlug,
      trackId: options.trackId,
      taskKey: options.taskKey,
      dependencies: options.dependencies,
      assigneeId: options.assigneeId,
      createdAt: options.updatedAt ?? Date.now(),
      updatedAt: options.updatedAt ?? Date.now(),
    }),
  );
}

async function seedAgent(t: ConvexTest, name: string): Promise<Id<'agents'>> {
  return t.run((ctx) =>
    ctx.db.insert('agents', {
      name,
      role: 'executor',
      skills: ['typescript'],
      model: 'claude-sonnet',
      costPerPoint: 2,
      reliability: 0.9,
      status: 'active',
      workload: 1,
      maxWorkload: 5,
      createdAt: Date.now(),
    }),
  );
}

async function seedWorkRun(
  t: ConvexTest,
  values: {
    projectSlug: string;
    runId: string;
    runnerHost: string;
    totalMs: number;
    startedAt?: number;
  },
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert('workRuns', {
      projectSlug: values.projectSlug,
      runId: values.runId,
      status: 'succeeded',
      runnerHost: values.runnerHost,
      startedAt: values.startedAt ?? Date.now() - 1_000,
      finishedAt: (values.startedAt ?? Date.now() - 1_000) + values.totalMs,
      loadMs: values.totalMs / 10,
      scoreMs: values.totalMs / 10,
      executeMs: values.totalMs / 2,
      persistMs: values.totalMs / 10,
      hookBeforeMs: values.totalMs / 20,
      hookAfterMs: values.totalMs / 20,
      totalMs: values.totalMs,
    }),
  );
}

describe('dashboard and burn forecast access contracts', () => {
  it('rejects dashboard and burn-forecast reads without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();
    const projectId = await seedProject(t, 'anonymous-dashboard');
    const sprintId = await seedSprint(t, projectId, 'Anonymous sprint', 100);

    await expect(t.query(api.dashboard.getDashboardDataHandler, { projectId })).rejects.toThrow(
      'Authentication required',
    );
    await expect(t.query(api.burnForecast.getSprintBurnForecast, { sprintId })).rejects.toThrow(
      'Authentication required',
    );
  });
});

describe('burn forecast runtime contracts', () => {
  it('forecasts completed sprint burn and recommends the highest-value tasks that fit the remaining budget', async () => {
    const t = createConvexTest();
    const now = Date.now();
    const projectId = await seedProject(t, 'burn-project');
    const sprintId = await seedSprint(t, projectId, 'Burn sprint', 200, 'active', now - 5 * 3_600_000);
    for (let index = 0; index < 4; index += 1) {
      await seedTask(t, projectId, `Completed ${index}`, 'done', {
        sprintId,
        storyPoints: 3,
        actualCost: 30 + index * 10,
        updatedAt: now - (4 - index) * 3_600_000,
      });
    }
    await seedTask(t, projectId, 'High value remaining', 'ready', {
      sprintId,
      storyPoints: 8,
      costEstimate: 10,
    });
    await seedTask(t, projectId, 'Low value remaining', 'backlog', {
      sprintId,
      storyPoints: 2,
      costEstimate: 45,
    });
    await seedTask(t, projectId, 'Blocked exclusion', 'blocked', {
      sprintId,
      storyPoints: 5,
      costEstimate: 5,
    });

    await expect(
      t.query(api.burnForecast.getSprintBurnForecast, { sprintId }),
    ).resolves.toMatchObject({
      dataPoints: 4,
      currentSpend: 180,
      remainingBudget: 20,
      burnRatePerHour: expect.any(Number),
    });
    await expect(
      t.query(api.burnForecast.getSprintTaskRecommendations, { sprintId }),
    ).resolves.toEqual([
      expect.objectContaining({ title: 'High value remaining', action: 'keep' }),
      expect.objectContaining({ title: 'Low value remaining', action: 'drop' }),
    ]);
  });
});

describe('dashboard runtime contract', () => {
  it('isolates the active sprint, catalog task fields, pipeline metrics, agents, and unresolved alerts', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'dashboard-project');
    const foreignProjectId = await seedProject(t, 'foreign-dashboard-project');
    const sprintId = await seedSprint(t, projectId, 'Dashboard sprint', 100);
    await seedSprint(t, foreignProjectId, 'Foreign sprint', 100);
    const agentId = await seedAgent(t, 'dashboard-agent');
    const doneTaskId = await seedTask(t, projectId, 'Catalog done task', 'done', {
      sprintId,
      storyPoints: 5,
      actualCost: 20,
      projectSlug: 'dashboard-project',
      trackId: 'dashboard-track',
      taskKey: 'DASH-1',
      dependencies: ['DASH-0'],
      assigneeId: agentId,
    });
    await seedTask(t, projectId, 'Blocked dashboard task', 'blocked', {
      sprintId,
      storyPoints: 3,
    });
    await t.run(async (ctx) => {
      await ctx.db.insert('pipelineRuns', {
        taskId: doneTaskId,
        agentId,
        stage: 'executor',
        startTime: 1_000,
        endTime: 51_000,
        cost: 5,
        status: 'completed',
        createdAt: Date.now(),
      });
      await ctx.db.insert('alerts', {
        type: 'budget_breach',
        severity: 'warning',
        message: 'Unresolved budget alert',
        contextJson: '{}',
        resolved: false,
        createdAt: Date.now(),
      });
      await ctx.db.insert('alerts', {
        type: 'stall_detected',
        severity: 'info',
        message: 'Resolved alert',
        contextJson: '{}',
        resolved: true,
        createdAt: Date.now(),
      });
    });

    const dashboard = await t.query(api.dashboard.getDashboardDataHandler, { projectId });
    expect(dashboard.sprint).toMatchObject({ _id: sprintId, name: 'Dashboard sprint' });
    expect(dashboard.tasks).toEqual([
      expect.objectContaining({
        title: 'Catalog done task',
        projectSlug: 'dashboard-project',
        trackId: 'dashboard-track',
        taskKey: 'DASH-1',
        dependencies: ['DASH-0'],
      }),
      expect.objectContaining({ title: 'Blocked dashboard task' }),
    ]);
    expect(dashboard.agents).toContainEqual(expect.objectContaining({ _id: agentId }));
    expect(dashboard.pipelineRuns).toEqual([
      expect.objectContaining({ taskId: doneTaskId, status: 'completed' }),
    ]);
    expect(dashboard.alerts).toEqual([
      expect.objectContaining({ message: 'Unresolved budget alert' }),
    ]);
    expect(dashboard.metrics).toEqual({
      deliveryRate: 0.25,
      successRate: 50,
      avgPipelineTime: 50_000,
      rejectionRate: 50,
    });
  });
});

describe('insights runtime contracts', () => {
  it('filters sprint and cost insights by project and recency while retaining live agent efficiency', async () => {
    const t = createConvexTest();
    const now = Date.now();
    const projectId = await seedProject(t, 'insights-project');
    const foreignProjectId = await seedProject(t, 'foreign-insights-project');
    const recentSprintId = await seedSprint(
      t,
      projectId,
      'Recent insights sprint',
      100,
      'closed',
      now - 2 * 86_400_000,
    );
    await seedSprint(
      t,
      projectId,
      'Old insights sprint',
      100,
      'closed',
      now - 40 * 86_400_000,
    );
    await seedSprint(t, foreignProjectId, 'Foreign insights sprint', 100, 'closed');
    const agentId = await seedAgent(t, 'insights-agent');
    const taskId = await seedTask(t, projectId, 'Insight completion', 'done', {
      sprintId: recentSprintId,
      storyPoints: 5,
      actualCost: 20,
      assigneeId: agentId,
    });
    await t.run((ctx) =>
      ctx.db.insert('costRecords', {
        agentId,
        projectSlug: 'insights-project',
        sprintId: recentSprintId,
        taskId,
        model: 'gpt-4o',
        inputTokens: 1_000,
        outputTokens: 500,
        costUSD: 20,
        sessionResumed: false,
        sessionCostSaved: 0,
        recordedAt: now - 1_000,
      }),
    );

    await expect(
      t.query(api.insights.getAnalyticsOverview, { projectId, days: 7 }),
    ).resolves.toEqual([
      expect.objectContaining({ name: 'Recent insights sprint', costPerPoint: expect.any(Number) }),
    ]);
    await expect(t.query(api.insights.getCostOverview, { projectId, days: 7 })).resolves.toMatchObject({
      costTrend: [expect.objectContaining({ sprintName: 'Recent insights sprint' })],
      agentEfficiency: [expect.objectContaining({ agentName: 'insights-agent' })],
    });
  });
});

describe('performance runtime contracts', () => {
  it('computes phase, trend, and latency summaries from bounded real work-run indexes', async () => {
    const t = createConvexTest();
    const now = Date.now();
    await seedWorkRun(t, {
      projectSlug: 'performance-project',
      runId: 'phase-a',
      runnerHost: 'agent-a',
      totalMs: 100,
      startedAt: now - 1_000,
    });
    await seedWorkRun(t, {
      projectSlug: 'performance-project',
      runId: 'phase-b',
      runnerHost: 'agent-a',
      totalMs: 200,
      startedAt: now - 2_000,
    });
    await seedWorkRun(t, {
      projectSlug: 'foreign-performance',
      runId: 'phase-c',
      runnerHost: 'agent-b',
      totalMs: 300,
      startedAt: now - 1_000,
    });

    await expect(
      t.query(api.performance.getPhaseBreakdown, { days: 1, projectSlug: 'performance-project' }),
    ).resolves.toMatchObject({ total: { sampleCount: 2, p50: expect.any(Number) } });
    await expect(
      t.query(api.performance.getPhaseTrends, { days: 1, projectSlug: 'performance-project' }),
    ).resolves.toContainEqual(expect.objectContaining({ totalAvg: 150 }));
    await expect(
      t.query(api.performance.getAgentLatencyStats, { days: 1, projectSlug: 'performance-project' }),
    ).resolves.toEqual([
      expect.objectContaining({ agent: 'agent-a', runCount: 2, avg: 150 }),
    ]);
    await expect(
      t.query(api.performance.getRegressionAlerts, { days: 1, projectSlug: 'performance-project' }),
    ).resolves.toEqual([]);
  });

  it('detects consecutive slow-agent breaches and exposes pipeline costs in their semantic stage', async () => {
    const t = createConvexTest();
    const now = Date.now();
    for (let index = 0; index < 100; index += 1) {
      await seedWorkRun(t, {
        projectSlug: 'slow-project',
        runId: `fast-${index}`,
        runnerHost: 'slow-agent',
        totalMs: 100,
        startedAt: now - (index + 10) * 1_000,
      });
    }
    for (let index = 0; index < 3; index += 1) {
      await seedWorkRun(t, {
        projectSlug: 'slow-project',
        runId: `slow-${index}`,
        runnerHost: 'slow-agent',
        totalMs: 300,
        startedAt: now - index * 1_000,
      });
    }
    await expect(
      t.query(api.performance.getSlowAgents, {
        days: 1,
        projectSlug: 'slow-project',
        thresholdMultiplier: 1.5,
        minConsecutiveBreaches: 3,
      }),
    ).resolves.toContainEqual(
      expect.objectContaining({ agent: 'slow-agent', consecutiveBreaches: 3 }),
    );

    const projectId = await seedProject(t, 'overview-project');
    const agentId = await seedAgent(t, 'overview-agent');
    const taskId = await seedTask(t, projectId, 'Overview task', 'done', {
      projectSlug: 'overview-project',
    });
    await t.run((ctx) =>
      ctx.db.insert('pipelineRuns', {
        taskId,
        agentId,
        stage: 'executor',
        startTime: now - 1_000,
        endTime: now,
        cost: 50,
        status: 'completed',
        createdAt: now,
      }),
    );
    const overview = await t.query(api.performance.getPerformanceOverview, {
      projectSlug: 'overview-project',
    });
    expect(overview?.agents).toContainEqual(
      expect.objectContaining({ _id: agentId, totalCost: 50 }),
    );
    expect(overview?.pipelineCosts.find((stage) => stage.stage === 'Executor')).toMatchObject({
      cost: 50,
    });
  });
});

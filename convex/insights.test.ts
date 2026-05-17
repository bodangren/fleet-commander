import { describe, expect, it } from 'bun:test';
import { getAnalyticsOverview, getCostOverview } from './insights';
import {
  createMockCtx,
  sampleProject,
  sampleSprint,
  sampleTask,
  sampleAgents,
} from './__fixtures__/foundation';
import { sampleSprintHistory, sampleTaskHistory } from './__fixtures__/history';

function createCtxWithAuth() {
  const ctx = createMockCtx();
  return {
    ...ctx,
    auth: {
      getUserIdentity: async () => null,
    },
  };
}

// ─── getAnalyticsOverview ─────────────────────────────

describe('getAnalyticsOverview', () => {
  it('returns sprint metrics for a project', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprintHistory, projectId });

    const result = await getAnalyticsOverview(ctx, { projectId });

    expect(result.length).toBe(1);
    expect(result[0].costPerPoint).toBeDefined();
    expect(result[0].budgetAccuracy).toBeDefined();
    expect(result[0].velocity).toBeDefined();
  });

  it('returns empty array when no sprints exist', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const result = await getAnalyticsOverview(ctx, { projectId });
    expect(result).toEqual([]);
  });

  it('calculates costPerPoint correctly', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      actualCost: 100,
      pointsDelivered: 20,
    });
    const result = await getAnalyticsOverview(ctx, { projectId });
    expect(result[0].costPerPoint).toBe(5);
  });

  it('returns 0 costPerPoint when pointsDelivered is 0', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      actualCost: 50,
      pointsDelivered: 0,
    });
    const result = await getAnalyticsOverview(ctx, { projectId });
    expect(result[0].costPerPoint).toBe(0);
    expect(Number.isFinite(result[0].costPerPoint)).toBe(true);
  });

  it('filters by projectId', async () => {
    const ctx = createCtxWithAuth();
    const projectA = await ctx.db.insert('projects', {
      ...sampleProject,
      name: 'Project A',
    });
    const projectB = await ctx.db.insert('projects', {
      ...sampleProject,
      name: 'Project B',
    });
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId: projectA,
      name: 'Sprint A',
    });
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId: projectB,
      name: 'Sprint B',
    });
    const result = await getAnalyticsOverview(ctx, { projectId: projectA });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Sprint A');
  });

  it('limits results by days parameter', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      startedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    });
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      startedAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    });
    const result = await getAnalyticsOverview(ctx, { projectId, days: 7 });
    expect(result.length).toBe(1);
  });
});

// ─── getCostOverview ──────────────────────────────────

describe('getCostOverview', () => {
  it('returns CostData shape', async () => {
    const ctx = createCtxWithAuth();
    const result = await getCostOverview(ctx, {});
    expect(result.costTrend).toBeDefined();
    expect(result.agentEfficiency).toBeDefined();
    expect(result.roiSummary).toBeDefined();
    expect(result.optimizations).toBeDefined();
  });

  it('returns empty trends when no data', async () => {
    const ctx = createCtxWithAuth();
    const result = await getCostOverview(ctx, {});
    expect(result.costTrend).toEqual([]);
    expect(result.agentEfficiency).toEqual([]);
    expect(result.optimizations).toEqual([]);
    expect(result.roiSummary.avgCostPerPoint).toBe(0);
  });

  it('filters by projectId', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprintHistory, projectId });
    const result = await getCostOverview(ctx, { projectId });
    expect(result.costTrend.length).toBeGreaterThan(0);
  });

  it('includes agent efficiency rows', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    await ctx.db.insert('sprints', { ...sampleSprintHistory, projectId });
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId: 'sprint-1',
      storyPoints: 5,
      status: 'done',
      assigneeId: agentId,
    });
    const result = await getCostOverview(ctx, { projectId });
    expect(result.agentEfficiency.length).toBeGreaterThan(0);
    expect(result.agentEfficiency[0].agentName).toBeDefined();
  });

  it('handles zero cost gracefully', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      actualCost: 0,
      pointsDelivered: 0,
    });
    const result = await getCostOverview(ctx, { projectId });
    expect(result.costTrend[0].costPerPoint).toBe(0);
    expect(Number.isFinite(result.costTrend[0].costPerPoint)).toBe(true);
  });

  it('limits results by days parameter', async () => {
    const ctx = createCtxWithAuth();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      startedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    });
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      startedAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    });
    const result = await getCostOverview(ctx, { projectId, days: 7 });
    expect(result.costTrend.length).toBe(1);
  });
});

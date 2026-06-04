import { describe, expect, it } from 'vitest';
import { createMockCtx } from './__fixtures__/foundation';
import { getSprintBurnForecast, getSprintTaskRecommendations } from './burnForecast';

describe('getSprintBurnForecast', () => {
  it('returns zero forecast when sprint not found', async () => {
    const ctx = createMockCtx();
    const result = await getSprintBurnForecast(ctx, { sprintId: 'nonexistent' as any });
    expect(result.burnRatePerHour).toBe(0);
    expect(result.projectedExhaustionMs).toBeNull();
    expect(result.atRisk).toBe(false);
  });

  it('returns zero forecast when no completed tasks', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint 1',
      status: 'active',
      budget: 1000,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });

    const result = await getSprintBurnForecast(ctx, { sprintId: sprintId as any });
    expect(result.dataPoints).toBe(0);
    expect(result.burnRatePerHour).toBe(0);
    expect(result.sprintBudget).toBe(1000);
  });

  it('computes forecast from completed tasks', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const projectId = await ctx.db.insert('projects', {
      name: 'Test',
      description: 'Desc',
      createdAt: now,
      updatedAt: now,
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint 1',
      status: 'active',
      budget: 1000,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: now,
    });

    for (let i = 0; i < 4; i++) {
      await ctx.db.insert('tasks', {
        projectId,
        sprintId,
        title: `Task ${i}`,
        description: 'Desc',
        storyPoints: 3,
        status: 'done',
        priority: 'medium',
        costEstimate: 50,
        actualCost: 30 + i * 10,
        createdAt: now - (4 - i) * hour,
        updatedAt: now - (4 - i) * hour,
      });
    }

    const result = await getSprintBurnForecast(ctx, { sprintId: sprintId as any });
    expect(result.dataPoints).toBe(4);
    expect(result.burnRatePerHour).toBeGreaterThan(0);
    expect(result.sprintBudget).toBe(1000);
    expect(result.currentSpend).toBe(180);
    expect(result.remainingBudget).toBe(820);
  });
});

describe('getSprintTaskRecommendations', () => {
  it('returns empty for nonexistent sprint', async () => {
    const ctx = createMockCtx();
    const result = await getSprintTaskRecommendations(ctx, { sprintId: 'nonexistent' as any });
    expect(result).toEqual([]);
  });

  it('recommends keeping tasks within budget', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint 1',
      status: 'active',
      budget: 1000,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Ready Task',
      description: 'Desc',
      storyPoints: 5,
      status: 'ready',
      priority: 'high',
      costEstimate: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getSprintTaskRecommendations(ctx, { sprintId: sprintId as any });
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('keep');
  });

  it('recommends dropping tasks when over budget', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint 1',
      status: 'active',
      budget: 50,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Expensive Task',
      description: 'Desc',
      storyPoints: 2,
      status: 'ready',
      priority: 'low',
      costEstimate: 45,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Cheap Task',
      description: 'Desc',
      storyPoints: 8,
      status: 'ready',
      priority: 'high',
      costEstimate: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getSprintTaskRecommendations(ctx, { sprintId: sprintId as any });
    expect(result).toHaveLength(2);
    const cheap = result.find((r) => r.title === 'Cheap Task');
    const expensive = result.find((r) => r.title === 'Expensive Task');
    expect(cheap!.action).toBe('keep');
    expect(expensive!.action).toBe('drop');
  });

  it('ignores done and blocked tasks', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint 1',
      status: 'active',
      budget: 1000,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Done Task',
      description: 'Desc',
      storyPoints: 5,
      status: 'done',
      priority: 'high',
      costEstimate: 50,
      actualCost: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Blocked Task',
      description: 'Desc',
      storyPoints: 3,
      status: 'blocked',
      priority: 'medium',
      costEstimate: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getSprintTaskRecommendations(ctx, { sprintId: sprintId as any });
    expect(result).toHaveLength(0);
  });
});

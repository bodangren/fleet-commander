import { describe, expect, it } from 'vitest';
import { createMockCtx } from './__fixtures__/foundation';
import { getDashboardDataHandler } from './dashboard';

describe('getDashboardDataHandler', () => {
  it('declares imported catalog fields on dashboard task responses', async () => {
    const returns = JSON.parse(getDashboardDataHandler.exportReturns()) as {
      value: { tasks: { fieldType: { value: { value: Record<string, unknown> } } } };
    };

    expect(returns.value.tasks.fieldType.value.value).toMatchObject({
      projectSlug: expect.any(Object),
      trackId: expect.any(Object),
      taskKey: expect.any(Object),
      dependencies: expect.any(Object),
    });

    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Imported Project',
      description: 'Imported fixture',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('tasks', {
      projectId,
      title: 'Imported task',
      description: 'Catalog task',
      storyPoints: 3,
      status: 'backlog',
      priority: 'high',
      costEstimate: 10,
      projectSlug: 'imported-project',
      trackId: 'track-1',
      taskKey: 'TASK-1',
      dependencies: ['TASK-0'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getDashboardDataHandler(ctx, { projectId });
    expect(result.tasks[0]).toMatchObject({
      projectSlug: 'imported-project',
      trackId: 'track-1',
      taskKey: 'TASK-1',
      dependencies: ['TASK-0'],
    });
  });

  it('returns empty data when no project exists', async () => {
    const ctx = createMockCtx();
    const result = await getDashboardDataHandler(ctx, {});
    expect(result.sprint).toBeNull();
    expect(result.tasks).toEqual([]);
    expect(result.agents).toEqual([]);
    expect(result.pipelineRuns).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(result.metrics).toEqual({ deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 });
  });

  it('returns data for first project when no projectId given', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint 1',
      status: 'active',
      budget: 100,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Task 1',
      description: 'Desc',
      storyPoints: 3,
      status: 'done',
      priority: 'high',
      costEstimate: 10,
      actualCost: 8,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getDashboardDataHandler(ctx, {});
    expect(result.sprint).not.toBeNull();
    expect(result.sprint!.name).toBe('Sprint 1');
    expect(result.tasks).toHaveLength(1);
    expect(result.metrics.successRate).toBe(100);
  });

  it('returns data for specified project', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint 2',
      status: 'active',
      budget: 200,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Task A',
      description: 'Desc',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'medium',
      costEstimate: 15,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getDashboardDataHandler(ctx, { projectId: projectId as any });
    expect(result.sprint!.name).toBe('Sprint 2');
    expect(result.tasks).toHaveLength(1);
  });

  it('computes metrics correctly', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Metrics Test',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const sprintId = await ctx.db.insert('sprints', {
      projectId,
      name: 'Sprint M',
      status: 'active',
      budget: 100,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });
    const taskId = await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Task 1',
      description: 'Desc',
      storyPoints: 5,
      status: 'done',
      priority: 'high',
      costEstimate: 10,
      actualCost: 20,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Task 2',
      description: 'Desc',
      storyPoints: 3,
      status: 'blocked',
      priority: 'medium',
      costEstimate: 6,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'dispatch',
      startTime: Date.now() - 100000,
      endTime: Date.now() - 50000,
      cost: 5,
      status: 'completed',
      createdAt: Date.now(),
    });

    const result = await getDashboardDataHandler(ctx, {});
    expect(result.metrics.deliveryRate).toBe(0.25); // 5 points / $20
    expect(result.metrics.successRate).toBe(50); // 1 done / 2 total
    expect(result.metrics.avgPipelineTime).toBe(50000);
    expect(result.metrics.rejectionRate).toBe(50); // 1 blocked / 2 total
  });

  it('includes agents in response', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Agent Test',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('agents', {
      name: 'alice',
      role: 'architect',
      skills: ['react'],
      model: 'claude',
      costPerPoint: 2,
      reliability: 0.9,
      status: 'active',
      workload: 1,
      maxWorkload: 5,
      createdAt: Date.now(),
    });

    const result = await getDashboardDataHandler(ctx, { projectId: projectId as any });
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe('alice');
  });

  it('includes unresolved alerts', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('projects', {
      name: 'Alert Test',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('alerts', {
      type: 'budget_breach',
      severity: 'warning',
      message: 'Budget at 80%',
      contextJson: '{}',
      resolved: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert('alerts', {
      type: 'stall_detected',
      severity: 'info',
      message: 'Agent idle',
      contextJson: '{}',
      resolved: true,
      createdAt: Date.now(),
    });

    const result = await getDashboardDataHandler(ctx, {});
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].message).toBe('Budget at 80%');
  });
})

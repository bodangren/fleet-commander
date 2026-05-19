import { describe, expect, it } from 'vitest';
import { createMockCtx } from './__fixtures__/foundation';
import { getTaskTimelineHandler } from './taskTimeline';

describe('getTaskTimelineHandler', () => {
  it('returns null task when task does not exist', async () => {
    const ctx = createMockCtx();
    const result = await getTaskTimelineHandler(ctx, {
      taskId: 'k3nonexistent' as any,
    });
    expect(result.task).toBeNull();
    expect(result.pipelineRuns).toEqual([]);
    expect(result.agents).toEqual([]);
    expect(result.sprint).toBeNull();
    expect(result.project).toBeNull();
  });

  it('returns task with empty pipeline runs when no runs exist', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const taskId = await ctx.db.insert('tasks', {
      projectId,
      title: 'Test Task',
      description: 'Test desc',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'high',
      costEstimate: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getTaskTimelineHandler(ctx, { taskId: taskId as any });
    expect(result.task).not.toBeNull();
    expect(result.task!.title).toBe('Test Task');
    expect(result.pipelineRuns).toEqual([]);
    expect(result.agents).toEqual([]);
  });

  it('returns pipeline runs sorted by startTime', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const agentId = await ctx.db.insert('agents', {
      name: 'alice',
      role: 'architect',
      skills: ['react'],
      model: 'claude',
      costPerPoint: 2,
      reliability: 0.9,
      status: 'active',
      workload: 1,
      maxWorkload: 3,
      createdAt: Date.now(),
    });
    const taskId = await ctx.db.insert('tasks', {
      projectId,
      title: 'Test Task',
      description: 'Test desc',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'high',
      costEstimate: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const run1 = await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'architect',
      agentId,
      startTime: 2000,
      endTime: 3000,
      cost: 1.5,
      status: 'completed',
      createdAt: Date.now(),
    });
    const run2 = await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'executor',
      agentId,
      startTime: 1000,
      endTime: 4000,
      cost: 2.0,
      status: 'completed',
      createdAt: Date.now(),
    });

    const result = await getTaskTimelineHandler(ctx, { taskId: taskId as any });
    expect(result.pipelineRuns).toHaveLength(2);
    expect(result.pipelineRuns[0].stage).toBe('executor');
    expect(result.pipelineRuns[1].stage).toBe('architect');
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe('alice');
  });

  it('includes sprint and project data', async () => {
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
      actualCost: 50,
      pointsDelivered: 10,
      taskCount: 5,
      completedCount: 2,
      createdAt: Date.now(),
    });
    const taskId = await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'Test Task',
      description: 'Test desc',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'high',
      costEstimate: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await getTaskTimelineHandler(ctx, { taskId: taskId as any });
    expect(result.sprint).not.toBeNull();
    expect(result.sprint!.name).toBe('Sprint 1');
    expect(result.project).not.toBeNull();
    expect(result.project!.name).toBe('Test Project');
  });

  it('collects agents from task assignees and pipeline runs', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      description: 'Desc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const assigneeId = await ctx.db.insert('agents', {
      name: 'bob',
      role: 'executor',
      skills: ['node'],
      model: 'gpt-4',
      costPerPoint: 1.5,
      reliability: 0.85,
      status: 'active',
      workload: 2,
      maxWorkload: 3,
      createdAt: Date.now(),
    });
    const runAgentId = await ctx.db.insert('agents', {
      name: 'alice',
      role: 'architect',
      skills: ['react'],
      model: 'claude',
      costPerPoint: 2,
      reliability: 0.9,
      status: 'active',
      workload: 1,
      maxWorkload: 3,
      createdAt: Date.now(),
    });
    const taskId = await ctx.db.insert('tasks', {
      projectId,
      assigneeId,
      title: 'Test Task',
      description: 'Test desc',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'high',
      costEstimate: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'architect',
      agentId: runAgentId,
      startTime: 1000,
      endTime: 2000,
      cost: 1.0,
      status: 'completed',
      createdAt: Date.now(),
    });

    const result = await getTaskTimelineHandler(ctx, { taskId: taskId as any });
    expect(result.agents).toHaveLength(2);
    const names = result.agents.map(a => a.name).sort();
    expect(names).toEqual(['alice', 'bob']);
  });
});

import { describe, expect, it } from 'bun:test';
import * as sprintPlanning from './sprintPlanning';
import { createMockCtx, sampleProject, sampleSprint, sampleTask, sampleAgents } from './__fixtures__/foundation';

describe('getBacklogTasksHandler', () => {
  it('returns only backlog tasks for a project', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('tasks', { ...sampleTask, projectId, status: 'backlog' });
    await ctx.db.insert('tasks', { ...sampleTask, projectId, status: 'ready' });

    const result = await sprintPlanning.getBacklogTasksHandler(ctx, { projectId });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('backlog');
  });

  it('strips extra fields from tasks', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('tasks', { ...sampleTask, projectId, status: 'backlog' });

    const result = await sprintPlanning.getBacklogTasksHandler(ctx, { projectId });

    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0].projectId).toBeUndefined();
  });
});

describe('getAgentsForPlanningHandler', () => {
  it('returns all agents with planning fields', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('agents', sampleAgents[0]);
    await ctx.db.insert('agents', sampleAgents[1]);

    const result = await sprintPlanning.getAgentsForPlanningHandler(ctx, {});

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe(sampleAgents[0].name);
    expect(result[0].costPerPoint).toBe(sampleAgents[0].costPerPoint);
  });
});

describe('createSprintHandler', () => {
  it('creates an active sprint with zeroed metrics', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);

    const id = await sprintPlanning.createSprintHandler(ctx, {
      projectId,
      name: 'New Sprint',
      budget: 5000,
    });

    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.projectId).toBe(projectId);
    expect(created.name).toBe('New Sprint');
    expect(created.status).toBe('active');
    expect(created.budget).toBe(5000);
    expect(created.actualCost).toBe(0);
    expect(created.pointsDelivered).toBe(0);
    expect(created.taskCount).toBe(0);
    expect(created.completedCount).toBe(0);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.startedAt).toBeGreaterThan(0);
  });
});

describe('assignTasksToSprintHandler', () => {
  it('assigns tasks to sprint and updates sprint taskCount', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const sprintId = await ctx.db.insert('sprints', {
      ...sampleSprint,
      projectId,
      status: 'active',
      taskCount: 0,
    });
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const taskId = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'backlog',
      storyPoints: 3,
    });

    await sprintPlanning.assignTasksToSprintHandler(ctx, {
      sprintId,
      taskIds: [taskId],
      agentAssignments: [{ taskId, agentId }],
    });

    const task = await ctx.db.get(taskId);
    expect(task.sprintId).toBe(sprintId);
    expect(task.assigneeId).toBe(agentId);
    expect(task.status).toBe('ready');
    expect(task.costEstimate).toBe(3 * sampleAgents[0].costPerPoint);

    const sprint = await ctx.db.get(sprintId);
    expect(sprint.taskCount).toBe(1);
  });

  it('skips missing tasks or agents without throwing', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const sprintId = await ctx.db.insert('sprints', {
      ...sampleSprint,
      projectId,
      taskCount: 0,
    });

    // Should not throw even with invalid task/agent IDs
    await expect(
      sprintPlanning.assignTasksToSprintHandler(ctx, {
        sprintId,
        taskIds: ['task-999' as any],
        agentAssignments: [{ taskId: 'task-999' as any, agentId: 'agent-999' as any }],
      }),
    ).resolves.toBeNull();
  });

  it('throws when sprint not found', async () => {
    const ctx = createMockCtx();
    await expect(
      sprintPlanning.assignTasksToSprintHandler(ctx, {
        sprintId: 'sprint-999' as any,
        taskIds: [],
        agentAssignments: [],
      }),
    ).rejects.toThrow('Sprint not found');
  });
});

describe('getProjectStatsHandler', () => {
  it('returns backlog count, total points, and active sprint count', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprint, projectId, status: 'active' });
    await ctx.db.insert('tasks', { ...sampleTask, projectId, status: 'backlog', storyPoints: 3 });
    await ctx.db.insert('tasks', { ...sampleTask, projectId, status: 'backlog', storyPoints: 5 });
    await ctx.db.insert('tasks', { ...sampleTask, projectId, status: 'ready', storyPoints: 2 });

    const result = await sprintPlanning.getProjectStatsHandler(ctx, { projectId });

    expect(result.backlogCount).toBe(2);
    expect(result.totalPoints).toBe(8);
    expect(result.activeSprintCount).toBe(1);
  });

  it('returns zeros when no data exists', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);

    const result = await sprintPlanning.getProjectStatsHandler(ctx, { projectId });

    expect(result.backlogCount).toBe(0);
    expect(result.totalPoints).toBe(0);
    expect(result.activeSprintCount).toBe(0);
  });
});

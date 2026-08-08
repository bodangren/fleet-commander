import { describe, expect, it } from 'bun:test';
import * as sprintPlanning from './sprintPlanning';
import {
  createMockCtx,
  sampleProject,
  sampleSprint,
  sampleTask,
  sampleAgents,
} from './__fixtures__/foundation';

describe('getBacklogTasksHandler', () => {
  it('declares and returns imported catalog metadata', async () => {
    const returns = JSON.parse(sprintPlanning.getBacklogTasksHandler.exportReturns()) as {
      value: { value: Record<string, unknown> };
    };
    expect(returns.value.value).toMatchObject({
      projectSlug: expect.any(Object),
      trackId: expect.any(Object),
      taskKey: expect.any(Object),
      dependencies: expect.any(Object),
    });

    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      projectSlug: 'imported-project',
      trackId: 'track-1',
      taskKey: 'TASK-1',
      dependencies: ['TASK-0'],
      status: 'backlog',
    });

    const result = await sprintPlanning.getBacklogTasksHandler(ctx, { projectId });
    expect(result[0]).toMatchObject({
      projectSlug: 'imported-project',
      trackId: 'track-1',
      taskKey: 'TASK-1',
      dependencies: ['TASK-0'],
    });
  });

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
  it('creates one active sprint and readies exactly one task atomically', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const taskId = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      status: 'backlog',
      storyPoints: 3,
      dependencies: [],
    });

    const id = await sprintPlanning.createSprintHandler(ctx, {
      projectId,
      name: 'New Sprint',
      budget: 5000,
      taskId,
      agentId,
    });

    const created = await ctx.db.get(id.sprintId);
    expect(created).toBeDefined();
    expect(created.projectId).toBe(projectId);
    expect(created.name).toBe('New Sprint');
    expect(created.status).toBe('active');
    expect(created.budget).toBe(5000);
    expect(created.actualCost).toBe(0);
    expect(created.pointsDelivered).toBe(0);
    expect(created.taskCount).toBe(1);
    expect(created.completedCount).toBe(0);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.startedAt).toBeGreaterThan(0);

    const task = await ctx.db.get(taskId);
    expect(task.sprintId).toBe(id.sprintId);
    expect(task.assigneeId).toBe(agentId);
    expect(task.assigneeName).toBe(sampleAgents[0].name);
    expect(task.status).toBe('ready');
    expect(task.costEstimate).toBe(3 * sampleAgents[0].costPerPoint);
  });

  it('rejects a missing task without creating a sprint', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await expect(
      sprintPlanning.createSprintHandler(ctx, {
        projectId,
        name: 'Empty Sprint',
        budget: 1,
        taskId: 'task-999' as any,
        agentId: 'agent-999' as any,
      }),
    ).rejects.toThrow('Task not found');

    expect(await ctx.db.query('sprints').collect()).toHaveLength(0);
  });

  it('rejects cross-project tasks and leaves both projects unchanged', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const otherProjectId = await ctx.db.insert('projects', { ...sampleProject, name: 'Other' });
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId: otherProjectId });

    await expect(
      sprintPlanning.createSprintHandler(ctx, {
        projectId,
        name: 'Cross Project',
        budget: 100,
        taskId,
        agentId,
      }),
    ).rejects.toThrow('Task does not belong to project');

    expect(await ctx.db.query('sprints').collect()).toHaveLength(0);
    expect((await ctx.db.get(taskId)).sprintId).toBeUndefined();
  });

  it('rejects inactive or saturated agents', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const agentId = await ctx.db.insert('agents', {
      ...sampleAgents[0],
      status: 'idle',
      workload: 0,
    });
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId, storyPoints: 1 });

    await expect(
      sprintPlanning.createSprintHandler(ctx, {
        projectId,
        name: 'Unavailable Agent',
        budget: 100,
        taskId,
        agentId,
      }),
    ).rejects.toThrow('Agent is not active');
    expect(await ctx.db.query('sprints').collect()).toHaveLength(0);

    await ctx.db.patch(agentId, { status: 'active', workload: sampleAgents[0].maxWorkload });
    await expect(
      sprintPlanning.createSprintHandler(ctx, {
        projectId,
        name: 'Saturated Agent',
        budget: 100,
        taskId,
        agentId,
      }),
    ).rejects.toThrow('Agent workload exceeded');
    expect(await ctx.db.query('sprints').collect()).toHaveLength(0);
  });

  it('rejects unmet dependencies and insufficient budgets', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const dependencyId = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      taskKey: 'DEP-1',
      status: 'in_progress',
    });
    const taskId = await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      taskKey: 'TASK-1',
      dependencies: ['DEP-1'],
      storyPoints: 3,
    });

    await expect(
      sprintPlanning.createSprintHandler(ctx, {
        projectId,
        name: 'Blocked Dependency',
        budget: 100,
        taskId,
        agentId,
      }),
    ).rejects.toThrow('Unmet task dependency');
    expect(await ctx.db.query('sprints').collect()).toHaveLength(0);
    expect((await ctx.db.get(dependencyId)).status).toBe('in_progress');

    await ctx.db.patch(dependencyId, { status: 'done' });
    await expect(
      sprintPlanning.createSprintHandler(ctx, {
        projectId,
        name: 'Insufficient Budget',
        budget: 0,
        taskId,
        agentId,
      }),
    ).rejects.toThrow('Budget is insufficient');
    expect(await ctx.db.query('sprints').collect()).toHaveLength(0);
  });

  it('rejects non-finite budget inputs before mutation', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    for (const budget of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        sprintPlanning.createSprintHandler(ctx, {
          projectId,
          name: 'Invalid Budget',
          budget,
          taskId,
          agentId,
        }),
      ).rejects.toThrow('Budget must be finite and non-negative');
    }

    expect(await ctx.db.query('sprints').collect()).toHaveLength(0);
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

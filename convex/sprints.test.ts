import { describe, expect, it } from 'bun:test';
import * as sprints from './sprints';
import { createMockCtx, sampleProject, sampleSprint, sampleTask } from './__fixtures__/foundation';

describe('listSprintsHandler', () => {
  it('returns sprints for a project', async () => {
    expect(sprints.listSprintsHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprint, projectId, name: 'Sprint A' });
    await ctx.db.insert('sprints', { ...sampleSprint, projectId, name: 'Sprint B' });

    const result = await sprints.listSprintsHandler(ctx, { projectId });

    expect(result.length).toBe(2);
    expect(result.map((s: any) => s.name).sort()).toEqual(['Sprint A', 'Sprint B']);
  });

  it('returns empty array when no sprints exist for project', async () => {
    expect(sprints.listSprintsHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const result = await sprints.listSprintsHandler(ctx, { projectId });
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    expect(sprints.listSprintsHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprint, projectId });
    const result = await sprints.listSprintsHandler(ctx, { projectId });
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });
});

describe('getSprintHandler', () => {
  it('returns sprint by id', async () => {
    expect(sprints.getSprintHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const id = await ctx.db.insert('sprints', { ...sampleSprint, projectId });
    const result = await sprints.getSprintHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe(sampleSprint.name);
  });

  it('returns null when sprint not found', async () => {
    expect(sprints.getSprintHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await sprints.getSprintHandler(ctx, { id: 'sprint-999' });
    expect(result).toBeNull();
  });

  it('strips _creationTime from result', async () => {
    expect(sprints.getSprintHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const id = await ctx.db.insert('sprints', { ...sampleSprint, projectId });
    const result = await sprints.getSprintHandler(ctx, { id });
    expect(result!._creationTime).toBeUndefined();
  });
});

describe('createSprintHandler', () => {
  it('creates a sprint with planned status and zeroed metrics', async () => {
    expect(sprints.createSprintHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const id = await sprints.createSprintHandler(ctx, {
      projectId,
      name: 'New Sprint',
      budget: 5000,
    });

    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.projectId).toBe(projectId);
    expect(created.name).toBe('New Sprint');
    expect(created.status).toBe('planned');
    expect(created.budget).toBe(5000);
    expect(created.actualCost).toBe(0);
    expect(created.pointsDelivered).toBe(0);
    expect(created.taskCount).toBe(0);
    expect(created.completedCount).toBe(0);
    expect(created.createdAt).toBeGreaterThan(0);
  });
});

describe('updateSprintStatusHandler', () => {
  it('transitions planned to active', async () => {
    expect(sprints.updateSprintStatusHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const id = await ctx.db.insert('sprints', { ...sampleSprint, projectId, status: 'planned' });
    await sprints.updateSprintStatusHandler(ctx, { id, status: 'active' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('active');
  });

  it('transitions active to closed', async () => {
    expect(sprints.updateSprintStatusHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const id = await ctx.db.insert('sprints', { ...sampleSprint, projectId, status: 'active' });
    await sprints.updateSprintStatusHandler(ctx, { id, status: 'closed' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('closed');
  });
});

describe('closeSprintHandler', () => {
  it('aggregates actualCost, pointsDelivered, taskCount, completedCount', async () => {
    expect(sprints.closeSprintHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const sprintId = await ctx.db.insert('sprints', {
      ...sampleSprint,
      projectId,
      status: 'active',
      budget: 500,
    });

    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId,
      storyPoints: 3,
      actualCost: 100,
      status: 'done',
    });

    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId,
      storyPoints: 5,
      actualCost: 200,
      status: 'in_progress',
    });

    await sprints.closeSprintHandler(ctx, { id: sprintId });

    const closed = await ctx.db.get(sprintId);
    expect(closed.status).toBe('closed');
    expect(closed.actualCost).toBe(300);
    expect(closed.pointsDelivered).toBe(3);
    expect(closed.taskCount).toBe(2);
    expect(closed.completedCount).toBe(1);
    expect(closed.closedAt).toBeGreaterThan(0);
  });

  it('rejects closing if no tasks exist in sprint', async () => {
    expect(sprints.closeSprintHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const sprintId = await ctx.db.insert('sprints', {
      ...sampleSprint,
      projectId,
      status: 'active',
    });

    await expect(sprints.closeSprintHandler(ctx, { id: sprintId })).rejects.toThrow(
      'No tasks in sprint',
    );
  });
});

describe('getSprintBudgetHandler', () => {
  it('calculates total cost estimate and remaining budget', async () => {
    expect(sprints.getSprintBudgetHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const sprintId = await ctx.db.insert('sprints', {
      ...sampleSprint,
      projectId,
      budget: 1000,
    });

    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId,
      costEstimate: 100,
    });

    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId,
      costEstimate: 200,
    });

    const result = await sprints.getSprintBudgetHandler(ctx, { id: sprintId });
    expect(result.totalEstimate).toBe(300);
    expect(result.budget).toBe(1000);
    expect(result.remaining).toBe(700);
  });
});

import { describe, expect, it } from 'bun:test';
import * as kanban from './kanban';
import { createMockCtx, sampleProject, sampleSprint, sampleTask, sampleAgents } from './__fixtures__/foundation';

describe('getSprintBoardHandler', () => {
  it('returns sprint with tasks and agents', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const sprintId = await ctx.db.insert('sprints', { ...sampleSprint, projectId });
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId,
      assigneeId: agentId,
      status: 'ready',
    });

    const result = await kanban.getSprintBoardHandler(ctx, { sprintId });

    expect(result.sprint._id).toBe(sprintId);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].assigneeName).toBe(sampleAgents[0].name);
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe(sampleAgents[0].name);
  });

  it('throws when sprint not found', async () => {
    const ctx = createMockCtx();
    await expect(kanban.getSprintBoardHandler(ctx, { sprintId: 'sprint-999' as any })).rejects.toThrow('Sprint not found');
  });

  it('strips _creationTime from sprint and tasks', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const sprintId = await ctx.db.insert('sprints', { ...sampleSprint, projectId });
    await ctx.db.insert('tasks', { ...sampleTask, projectId, sprintId });

    const result = await kanban.getSprintBoardHandler(ctx, { sprintId });

    expect(result.sprint._creationTime).toBeUndefined();
    expect(result.tasks[0]._creationTime).toBeUndefined();
  });
});

describe('getActiveSprintHandler', () => {
  it('returns active sprint for project', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprint, projectId, status: 'active' });

    const result = await kanban.getActiveSprintHandler(ctx, { projectId });

    expect(result).not.toBeNull();
    expect(result!.status).toBe('active');
  });

  it('returns null when no active sprint exists', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprint, projectId, status: 'planned' });

    const result = await kanban.getActiveSprintHandler(ctx, { projectId });

    expect(result).toBeNull();
  });
});

describe('getSprintsByProjectHandler', () => {
  it('returns sprints ordered desc', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprint, projectId, name: 'Sprint A' });
    await ctx.db.insert('sprints', { ...sampleSprint, projectId, name: 'Sprint B' });

    const result = await kanban.getSprintsByProjectHandler(ctx, { projectId });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Sprint B');
    expect(result[1].name).toBe('Sprint A');
  });

  it('strips _creationTime from results', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprint, projectId });

    const result = await kanban.getSprintsByProjectHandler(ctx, { projectId });

    expect(result[0]._creationTime).toBeUndefined();
  });
});

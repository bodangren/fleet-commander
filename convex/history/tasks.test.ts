import { describe, expect, it } from 'bun:test';
import {
  listTaskHistoryHandler,
  getTaskHistoryHandler,
} from './tasks';
import {
  createMockCtx,
  sampleProject,
  sampleTask,
  sampleAgents,
} from '../__fixtures__/foundation';
import { sampleTaskHistory } from '../__fixtures__/history';

describe('listTaskHistoryHandler', () => {
  it('returns task history for a project with agent name resolved', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    await ctx.db.insert('tasks', {
      ...sampleTaskHistory,
      projectId,
      assigneeId: agentId,
    });

    const result = await listTaskHistoryHandler(ctx, { projectId });

    expect(result.length).toBe(1);
    expect(result[0].title).toBe(sampleTaskHistory.title);
    expect(result[0].agent).toBe(sampleAgents[0].name);
  });

  it('filters by status', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      title: 'Task A',
      status: 'done',
    });
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      title: 'Task B',
      status: 'in_progress',
    });

    const result = await listTaskHistoryHandler(ctx, {
      projectId,
      status: 'done',
    });
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Task A');
  });

  it('searches by title', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      title: 'Fix auth bug',
    });
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      title: 'Add dashboard',
    });

    const result = await listTaskHistoryHandler(ctx, {
      projectId,
      search: 'auth',
    });
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Fix auth bug');
  });

  it('returns empty array when no tasks match', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const result = await listTaskHistoryHandler(ctx, { projectId });
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('tasks', { ...sampleTask, projectId });
    const result = await listTaskHistoryHandler(ctx, { projectId });
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });

  it('paginates results', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    for (let i = 0; i < 5; i++) {
      await ctx.db.insert('tasks', {
        ...sampleTask,
        projectId,
        title: `Task ${i}`,
      });
    }
    const result = await listTaskHistoryHandler(ctx, {
      projectId,
      limit: 2,
    });
    expect(result.length).toBe(2);
  });

  it('rejects invalid projectId', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    await expect(
      listTaskHistoryHandler(ctx, { projectId: 'invalid-id' })
    ).rejects.toThrow();
  });
});

describe('getTaskHistoryHandler', () => {
  it('returns task history by id', async () => {
    expect(getTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const id = await ctx.db.insert('tasks', { ...sampleTask, projectId });
    const result = await getTaskHistoryHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.title).toBe(sampleTask.title);
  });

  it('returns null when task not found', async () => {
    expect(getTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await getTaskHistoryHandler(ctx, { id: 'task-999' });
    expect(result).toBeNull();
  });
});

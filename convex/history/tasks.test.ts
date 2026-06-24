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

  it('returns status-matching rows even when matching rows are older than the most-recent limit tasks (FR-2/FR-7)', async () => {
    // Reproduces FR-2: listTaskHistoryHandler currently applies the
    // status filter AFTER `.take(limit)`, so a project with more than
    // `limit` tasks silently drops matching rows that fall outside the
    // most-recent window. We seed 100 newer non-matching tasks plus 50
    // older matching tasks, then query with `status` + `limit` and
    // expect the matching rows to be returned.
    //
    // The mock ctx orders rows by insertion order, so we insert the
    // 50 matching ('done') tasks FIRST (oldest) and the 100 non-matching
    // ('in_progress') tasks AFTER (newest). `order('desc').take(limit)`
    // then yields the 100 non-matching rows; the buggy filter runs on
    // that slice and returns zero results. The fix routes through the
    // status index so the matching rows are returned.
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);

    // 50 matching 'done' tasks (inserted first → oldest in reverse order)
    for (let i = 0; i < 50; i++) {
      await ctx.db.insert('tasks', {
        ...sampleTask,
        projectId,
        title: `Done task ${i}`,
        status: 'done',
        createdAt: 1_000 + i,
        updatedAt: 1_000 + i,
      });
    }
    // 100 non-matching 'in_progress' tasks (inserted after → newest in reverse order)
    for (let i = 0; i < 100; i++) {
      await ctx.db.insert('tasks', {
        ...sampleTask,
        projectId,
        title: `In-progress task ${i}`,
        status: 'in_progress',
        createdAt: 10_000 + i,
        updatedAt: 10_000 + i,
      });
    }

    const result = await listTaskHistoryHandler(ctx, {
      projectId,
      status: 'done',
      limit: 50,
    });

    // FR-2 fix: all 50 matching 'done' tasks must be returned, even
    // though they are older than the 100 most-recent (in_progress) tasks.
    // At HEAD, the buggy take-before-filter ordering drops every
    // matching row and this assertion fails.
    expect(result.length).toBe(50);
    for (const row of result) {
      expect(row.status).toBe('done');
      expect(row.title.startsWith('Done task ')).toBe(true);
    }
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

import { describe, expect, it } from 'bun:test';
import { listTaskHistoryHandler, getTaskHistoryHandler } from './tasks';
import { createHistoryCtx } from '../__fixtures__/history';

describe('listTaskHistoryHandler performance', () => {
  it('returns 100 tasks for a project', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Perf Project',
      slug: 'perf-project',
      rootPath: '/tmp/perf',
      status: 'active',
      updatedAt: Date.now(),
    });

    for (let i = 0; i < 100; i++) {
      await ctx.db.insert('tasks', {
        projectId,
        title: `Perf Task ${i + 1}`,
        description: 'Performance test task',
        storyPoints: (i % 8) + 1,
        status: i % 5 === 0 ? 'in_progress' : 'done',
        priority: 'medium',
        costEstimate: 10,
        actualCost: (i % 20) * 5.5,
        assigneeId: `agent-${(i % 4) + 1}`,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * i,
        updatedAt: Date.now() - 1000 * 60 * 60 * 24 * (i % 7),
      });
    }

    const result = await listTaskHistoryHandler(ctx, { projectId });
    expect(result.length).toBe(100);
  });

  it('paginates 100 tasks to limit 25', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Paginate Project',
      slug: 'paginate-project',
      rootPath: '/tmp/paginate',
      status: 'active',
      updatedAt: Date.now(),
    });

    for (let i = 0; i < 100; i++) {
      await ctx.db.insert('tasks', {
        projectId,
        title: `Page Task ${i + 1}`,
        description: 'Pagination test task',
        storyPoints: 1,
        status: 'done',
        priority: 'low',
        costEstimate: 5,
        actualCost: 5,
        createdAt: Date.now() - i,
        updatedAt: Date.now() - i,
      });
    }

    const result = await listTaskHistoryHandler(ctx, { projectId, limit: 25 });
    expect(result.length).toBe(25);
  });

  it('filters 100 tasks by status efficiently', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Filter Project',
      slug: 'filter-project',
      rootPath: '/tmp/filter',
      status: 'active',
      updatedAt: Date.now(),
    });

    for (let i = 0; i < 100; i++) {
      await ctx.db.insert('tasks', {
        projectId,
        title: `Filter Task ${i + 1}`,
        description: 'Filter test task',
        storyPoints: 1,
        status: i % 3 === 0 ? 'done' : 'in_progress',
        priority: 'medium',
        costEstimate: 10,
        actualCost: 10,
        createdAt: Date.now() - i,
        updatedAt: Date.now() - i,
      });
    }

    const result = await listTaskHistoryHandler(ctx, { projectId, status: 'done' });
    expect(result.length).toBe(34); // 0, 3, 6, ... 99 = 34 tasks
  });

  it('searches across 100 tasks by title', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Search Project',
      slug: 'search-project',
      rootPath: '/tmp/search',
      status: 'active',
      updatedAt: Date.now(),
    });

    for (let i = 0; i < 100; i++) {
      await ctx.db.insert('tasks', {
        projectId,
        title: i % 10 === 0 ? `Auth bug ${i}` : `Generic task ${i}`,
        description: 'Search test task',
        storyPoints: 1,
        status: 'done',
        priority: 'low',
        costEstimate: 5,
        actualCost: 5,
        createdAt: Date.now() - i,
        updatedAt: Date.now() - i,
      });
    }

    const result = await listTaskHistoryHandler(ctx, { projectId, search: 'auth' });
    expect(result.length).toBe(10);
    expect(result[0].title.toLowerCase()).toContain('auth');
  });

  it('combines status filter and search across 100 tasks', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Combined Project',
      slug: 'combined-project',
      rootPath: '/tmp/combined',
      status: 'active',
      updatedAt: Date.now(),
    });

    for (let i = 0; i < 100; i++) {
      await ctx.db.insert('tasks', {
        projectId,
        title: i % 5 === 0 ? `Dashboard fix ${i}` : `Other task ${i}`,
        description: 'Combined test task',
        storyPoints: 1,
        status: i % 2 === 0 ? 'done' : 'in_progress',
        priority: 'medium',
        costEstimate: 10,
        actualCost: 10,
        createdAt: Date.now() - i,
        updatedAt: Date.now() - i,
      });
    }

    const result = await listTaskHistoryHandler(ctx, {
      projectId,
      status: 'done',
      search: 'dashboard',
    });

    // dashboard tasks at indices where i % 5 === 0: 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95
    // of those, done at even indices: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90 = 10 tasks
    expect(result.length).toBe(10);
    result.forEach((task: any) => {
      expect(task.status).toBe('done');
      expect(task.title.toLowerCase()).toContain('dashboard');
    });
  });

  it('resolves agent names for 100 tasks', async () => {
    expect(listTaskHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Agent Resolve Project',
      slug: 'agent-resolve-project',
      rootPath: '/tmp/agent-resolve',
      status: 'active',
      updatedAt: Date.now(),
    });

    const agentId = await ctx.db.insert('agents', {
      name: 'resolver',
      displayName: 'Resolver',
      role: 'developer',
      skills: ['typescript'],
      model: 'claude-opus',
      costPerPoint: 10,
      reliability: 0.9,
      status: 'active',
      workload: 5,
      maxWorkload: 10,
      createdAt: Date.now(),
    });

    for (let i = 0; i < 100; i++) {
      await ctx.db.insert('tasks', {
        projectId,
        title: `Resolve Task ${i + 1}`,
        description: 'Agent resolve test task',
        storyPoints: 1,
        status: 'done',
        priority: 'low',
        costEstimate: 5,
        actualCost: 5,
        assigneeId: agentId,
        createdAt: Date.now() - i,
        updatedAt: Date.now() - i,
      });
    }

    const result = await listTaskHistoryHandler(ctx, { projectId });
    expect(result.length).toBe(100);
    expect(result[0].agent).toBe('resolver');
  });
});

describe('getTaskHistoryHandler performance', () => {
  it('returns a single task from a dataset of 100', async () => {
    expect(getTaskHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const projectId = await ctx.db.insert('projects', {
      name: 'Get Project',
      slug: 'get-project',
      rootPath: '/tmp/get',
      status: 'active',
      updatedAt: Date.now(),
    });

    let targetId = '';
    for (let i = 0; i < 100; i++) {
      const id = await ctx.db.insert('tasks', {
        projectId,
        title: `Get Task ${i + 1}`,
        description: 'Get test task',
        storyPoints: 1,
        status: 'done',
        priority: 'low',
        costEstimate: 5,
        actualCost: 5,
        createdAt: Date.now() - i,
        updatedAt: Date.now() - i,
      });
      if (i === 50) targetId = id;
    }

    const result = await getTaskHistoryHandler(ctx, { id: targetId });
    expect(result).toBeDefined();
    expect(result!.title).toBe('Get Task 51');
  });
});

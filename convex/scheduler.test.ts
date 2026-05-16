import { describe, expect, it, mock } from 'bun:test';
import {
  listReadyTasksHandler,
  listActiveEmployeesHandler,
  createRunHandler,
  updateTaskStatusHandler,
  getRunByTaskHandler,
} from './scheduler';

function createMockCtx(overrides?: {
  tasks?: Map<string, any>;
  employees?: Map<string, any>;
  runs?: Map<string, any>;
}) {
  const tasks = overrides?.tasks ?? new Map<string, any>();
  const employees = overrides?.employees ?? new Map<string, any>();
  const runs = overrides?.runs ?? new Map<string, any>();

  let lastEqValue: any = undefined;
  let lastIndexName: string | undefined = undefined;

  const db = {
    query: (table: string) => ({
      order: (dir: 'asc' | 'desc') => ({
        collect: async () => {
          let arr: any[] = [];
          if (table === 'tasks') arr = Array.from(tasks.values());
          if (table === 'employees') arr = Array.from(employees.values());
          if (table === 'runs') arr = Array.from(runs.values());
          if (dir === 'desc') arr = arr.reverse();
          return arr;
        },
      }),
      withIndex: (indexName: string, cb?: (q: any) => any) => {
        lastIndexName = indexName;
        lastEqValue = undefined;
        const q = {
          eq: (_field: string, value: any) => {
            lastEqValue = value;
            return q;
          },
        };
        if (cb) cb(q);
        return {
          collect: async () => {
            if (table === 'tasks') {
              if (lastIndexName === 'by_status') {
                return Array.from(tasks.values()).filter((t: any) => t.status === lastEqValue);
              }
              if (lastIndexName === 'by_assignee') {
                return Array.from(tasks.values()).filter((t: any) => t.assignee === lastEqValue);
              }
            }
            if (table === 'employees' && lastIndexName === 'by_status') {
              return Array.from(employees.values()).filter((e: any) => e.status === lastEqValue);
            }
            if (table === 'runs' && lastIndexName === 'by_task') {
              return Array.from(runs.values()).filter((r: any) => r.taskId === lastEqValue);
            }
            return [];
          },
        };
      },
    }),
    get: async (id: string) => {
      if (id.startsWith('task')) return tasks.get(id) ?? null;
      if (id.startsWith('emp')) return employees.get(id) ?? null;
      if (id.startsWith('run')) return runs.get(id) ?? null;
      return null;
    },
    insert: async (table: string, doc: any) => {
      const id = `${table.slice(0, -1)}-${tasks.size + employees.size + runs.size + 1}`;
      if (table === 'tasks') tasks.set(id, { _id: id, ...doc });
      if (table === 'employees') employees.set(id, { _id: id, ...doc });
      if (table === 'runs') runs.set(id, { _id: id, ...doc });
      return id;
    },
    patch: async (id: string, patch: any) => {
      if (id.startsWith('task')) {
        const existing = tasks.get(id);
        if (existing) tasks.set(id, { ...existing, ...patch });
      }
      if (id.startsWith('emp')) {
        const existing = employees.get(id);
        if (existing) employees.set(id, { ...existing, ...patch });
      }
      if (id.startsWith('run')) {
        const existing = runs.get(id);
        if (existing) runs.set(id, { ...existing, ...patch });
      }
    },
  };

  return { db } as any;
}

describe('listReadyTasksHandler', () => {
  it('returns only tasks with status ready', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('tasks', {
      title: 'Ready Task',
      description: '',
      status: 'ready',
      priority: 'high',
      projectId: 'proj-1',
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.insert('tasks', {
      title: 'In Progress Task',
      description: '',
      status: 'in_progress',
      priority: 'medium',
      projectId: 'proj-1',
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await listReadyTasksHandler(ctx);

    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Ready Task');
    expect(result[0].status).toBe('ready');
  });

  it('returns empty array when no ready tasks exist', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('tasks', {
      title: 'Blocked Task',
      description: '',
      status: 'blocked',
      priority: 'low',
      projectId: 'proj-1',
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await listReadyTasksHandler(ctx);

    expect(result).toEqual([]);
  });
});

describe('listActiveEmployeesHandler', () => {
  it('returns only active employees', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('employees', {
      name: 'Alice',
      role: 'Dev',
      skills: ['ts'],
      model: 'gpt-4',
      status: 'active',
      createdAt: 1000,
    });
    await ctx.db.insert('employees', {
      name: 'Bob',
      role: 'Dev',
      skills: ['py'],
      model: 'gpt-4',
      status: 'away',
      createdAt: 1000,
    });

    const result = await listActiveEmployeesHandler(ctx);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alice');
    expect(result[0].status).toBe('active');
  });

  it('returns empty array when no active employees exist', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('employees', {
      name: 'Bob',
      role: 'Dev',
      skills: ['py'],
      model: 'gpt-4',
      status: 'away',
      createdAt: 1000,
    });

    const result = await listActiveEmployeesHandler(ctx);

    expect(result).toEqual([]);
  });
});

describe('createRunHandler', () => {
  it('inserts a run with queued status', async () => {
    const ctx = createMockCtx();
    const taskId = 'task-1';
    const employeeId = 'emp-1';

    const runId = await createRunHandler(ctx, { taskId, employeeId });

    const run = await ctx.db.get(runId);
    expect(run).toBeDefined();
    expect(run.taskId).toBe(taskId);
    expect(run.employeeId).toBe(employeeId);
    expect(run.status).toBe('queued');
    expect(run.startedAt).toBeGreaterThan(0);
  });
});

describe('updateTaskStatusHandler', () => {
  it('updates task status to in_progress', async () => {
    const ctx = createMockCtx();
    const taskId = await ctx.db.insert('tasks', {
      title: 'Task',
      description: '',
      status: 'ready',
      priority: 'medium',
      projectId: 'proj-1',
      createdAt: 1000,
      updatedAt: 1000,
    });

    await updateTaskStatusHandler(ctx, { taskId, status: 'in_progress' });

    const updated = await ctx.db.get(taskId);
    expect(updated.status).toBe('in_progress');
    expect(updated.updatedAt).toBeGreaterThan(1000);
  });

  it('updates task status to done', async () => {
    const ctx = createMockCtx();
    const taskId = await ctx.db.insert('tasks', {
      title: 'Task',
      description: '',
      status: 'in_progress',
      priority: 'medium',
      projectId: 'proj-1',
      createdAt: 1000,
      updatedAt: 1000,
    });

    await updateTaskStatusHandler(ctx, { taskId, status: 'done' });

    const updated = await ctx.db.get(taskId);
    expect(updated.status).toBe('done');
  });

  it('updates task status to blocked', async () => {
    const ctx = createMockCtx();
    const taskId = await ctx.db.insert('tasks', {
      title: 'Task',
      description: '',
      status: 'in_progress',
      priority: 'medium',
      projectId: 'proj-1',
      createdAt: 1000,
      updatedAt: 1000,
    });

    await updateTaskStatusHandler(ctx, { taskId, status: 'blocked' });

    const updated = await ctx.db.get(taskId);
    expect(updated.status).toBe('blocked');
  });
});

describe('getRunByTaskHandler', () => {
  it('returns the most recent run for a task', async () => {
    const ctx = createMockCtx();
    const taskId = 'task-1';
    await ctx.db.insert('runs', {
      taskId,
      employeeId: 'emp-1',
      status: 'succeeded',
      output: 'done',
      startedAt: 1000,
      finishedAt: 2000,
    });
    await ctx.db.insert('runs', {
      taskId,
      employeeId: 'emp-2',
      status: 'failed',
      output: 'fail',
      startedAt: 3000,
      finishedAt: 4000,
    });

    const result = await getRunByTaskHandler(ctx, { taskId });

    expect(result).toBeDefined();
    expect(result.status).toBe('failed');
  });

  it('returns null when no runs exist for task', async () => {
    const ctx = createMockCtx();

    const result = await getRunByTaskHandler(ctx, { taskId: 'task-999' });

    expect(result).toBeNull();
  });
});

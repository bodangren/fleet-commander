import { describe, expect, it, mock } from 'bun:test';
import {
  listEmployeesHandler,
  getEmployeeHandler,
  createEmployeeHandler,
  updateEmployeeStatusHandler,
  assignTaskHandler,
  unassignTaskHandler,
  getEmployeeWorkloadHandler,
} from './employees';

function createMockCtx(overrides?: {
  employees?: Map<string, any>;
  tasks?: Map<string, any>;
}) {
  const employees = overrides?.employees ?? new Map<string, any>();
  const tasks = overrides?.tasks ?? new Map<string, any>();

  let lastEqValue: any = undefined;

  const db = {
    query: (table: string) => {
      const getTableData = () => {
        if (table === 'employees') return Array.from(employees.values());
        if (table === 'tasks') return Array.from(tasks.values());
        return [];
      };

      return {
        order: (dir: 'asc' | 'desc') => ({
          collect: async () => {
            const arr = getTableData();
            return dir === 'desc' ? arr.reverse() : arr;
          },
        }),
        withIndex: (_index: string, cb?: (q: any) => any) => {
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
                return Array.from(tasks.values()).filter((t: any) => t.assigneeId === lastEqValue);
              }
              return [];
            },
          };
        },
        filter: (cb: (q: any) => any) => {
          const q = {
            eq: (field: string, value: any) => ({ field, value }),
            field: (name: string) => name,
          };
          const condition = cb(q);
          const filtered = getTableData().filter((doc: any) => {
            return doc[condition.field] === condition.value;
          });
          return {
            first: async () => filtered[0] ?? null,
            collect: async () => filtered,
          };
        },
        collect: async () => getTableData(),
      };
    },
    get: async (id: string) => {
      if (id.startsWith('employee') || id.startsWith('emp')) return employees.get(id) ?? null;
      if (id.startsWith('task')) return tasks.get(id) ?? null;
      return null;
    },
    insert: async (table: string, doc: any) => {
      const id = `${table.slice(0, -1)}-${employees.size + tasks.size + 1}`;
      if (table === 'employees') employees.set(id, { _id: id, ...doc });
      if (table === 'tasks') tasks.set(id, { _id: id, ...doc });
      return id;
    },
    patch: async (id: string, patch: any) => {
      if (id.startsWith('emp')) {
        const existing = employees.get(id);
        if (existing) employees.set(id, { ...existing, ...patch });
      }
      if (id.startsWith('task')) {
        const existing = tasks.get(id);
        if (existing) tasks.set(id, { ...existing, ...patch });
      }
    },
  };

  return { db } as any;
}

describe('listEmployeesHandler', () => {
  it('returns all employees ordered by createdAt desc', async () => {
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
      status: 'active',
      createdAt: 2000,
    });

    const result = await listEmployeesHandler(ctx);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Bob');
    expect(result[1].name).toBe('Alice');
  });

  it('returns empty array when no employees exist', async () => {
    const ctx = createMockCtx();
    const result = await listEmployeesHandler(ctx);

    expect(result).toEqual([]);
  });
});

describe('getEmployeeHandler', () => {
  it('returns employee by id', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('employees', {
      name: 'Alice',
      role: 'Dev',
      skills: ['ts'],
      model: 'gpt-4',
      status: 'active',
      createdAt: 1000,
    });

    const result = await getEmployeeHandler(ctx, { id });

    expect(result).toBeDefined();
    expect(result!.name).toBe('Alice');
  });

  it('returns null when employee not found', async () => {
    const ctx = createMockCtx();
    const result = await getEmployeeHandler(ctx, { id: 'emp-999' });

    expect(result).toBeNull();
  });
});

describe('createEmployeeHandler', () => {
  it('inserts a new employee with active status', async () => {
    const ctx = createMockCtx();
    const id = await createEmployeeHandler(ctx, {
      name: 'Carol',
      role: 'Designer',
      skills: ['figma', 'css'],
      model: 'gpt-4',
    });

    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.name).toBe('Carol');
    expect(created.status).toBe('active');
    expect(created.skills).toEqual(['figma', 'css']);
  });
});

describe('updateEmployeeStatusHandler', () => {
  it('updates employee status to away', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('employees', {
      name: 'Alice',
      role: 'Dev',
      skills: ['ts'],
      model: 'gpt-4',
      status: 'active',
      createdAt: 1000,
    });

    await updateEmployeeStatusHandler(ctx, { id, status: 'away' });

    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('away');
  });

  it('updates employee status to active', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('employees', {
      name: 'Alice',
      role: 'Dev',
      skills: ['ts'],
      model: 'gpt-4',
      status: 'away',
      createdAt: 1000,
    });

    await updateEmployeeStatusHandler(ctx, { id, status: 'active' });

    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('active');
  });
});

describe('assignTaskHandler', () => {
  it('links task to employee', async () => {
    const ctx = createMockCtx();
    const taskId = await ctx.db.insert('tasks', {
      title: 'Fix bug',
      description: '',
      status: 'ready',
      priority: 'high',
      projectId: 'proj-1',
      createdAt: 1000,
      updatedAt: 1000,
    });
    const employeeId = 'emp-1';

    await assignTaskHandler(ctx, { taskId, employeeId });

    const task = await ctx.db.get(taskId);
    expect(task.assigneeId).toBe(employeeId);
  });
});

describe('unassignTaskHandler', () => {
  it('removes employee from task', async () => {
    const ctx = createMockCtx();
    const taskId = await ctx.db.insert('tasks', {
      title: 'Fix bug',
      description: '',
      status: 'ready',
      priority: 'high',
      projectId: 'proj-1',
      assigneeId: 'emp-1',
      createdAt: 1000,
      updatedAt: 1000,
    });

    await unassignTaskHandler(ctx, { taskId });

    const task = await ctx.db.get(taskId);
    expect(task.assigneeId).toBeUndefined();
  });
});

describe('getEmployeeWorkloadHandler', () => {
  it('returns count of tasks assigned to employee', async () => {
    const ctx = createMockCtx();
    const employeeId = 'emp-1';

    await ctx.db.insert('tasks', {
      title: 'Task 1',
      description: '',
      status: 'ready',
      priority: 'high',
      projectId: 'proj-1',
      assigneeId: employeeId,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.insert('tasks', {
      title: 'Task 2',
      description: '',
      status: 'in_progress',
      priority: 'medium',
      projectId: 'proj-1',
      assigneeId: employeeId,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.insert('tasks', {
      title: 'Task 3',
      description: '',
      status: 'ready',
      priority: 'low',
      projectId: 'proj-1',
      assignee: 'emp-2',
      createdAt: 1000,
      updatedAt: 1000,
    });

    const count = await getEmployeeWorkloadHandler(ctx, { employeeId });

    expect(count).toBe(2);
  });

  it('returns zero when no tasks are assigned', async () => {
    const ctx = createMockCtx();
    const count = await getEmployeeWorkloadHandler(ctx, { employeeId: 'emp-1' });

    expect(count).toBe(0);
  });
});

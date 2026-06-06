import { describe, expect, it } from 'bun:test';
import {
  addTaskDependency,
  checkAndUnblockDownstream,
  getBlockedTasks,
  getCriticalPath,
  getTaskWithDependencies,
  removeTaskDependency,
} from './dependencies';

type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';

type SeedTask = {
  taskKey: string;
  title: string;
  status: TaskStatus;
  storyPoints: number;
  dependencies?: string[];
  blockerReason?: string;
};

type QueryStats = {
  takeCalls: Array<{ index: string; n: number }>;
  collectCalls: Array<{ index: string }>;
  uniqueCalls: Array<{ index: string }>;
};

function createMockCtx(): { ctx: any; stats: QueryStats } {
  const tables: Record<string, Map<string, any>> = {};
  const stats: QueryStats = { takeCalls: [], collectCalls: [], uniqueCalls: [] };

  function getTable(name: string) {
    if (!tables[name]) tables[name] = new Map();
    return tables[name];
  }

  const db = {
    query: (table: string) => ({
      order: (_dir: 'asc' | 'desc') => ({
        collect: async () => {
          stats.collectCalls.push({ index: '_order' });
          const map = getTable(table);
          const arr = Array.from(map.values());
          return _dir === 'desc' ? arr.reverse() : arr;
        },
        take: async (n: number) => {
          stats.takeCalls.push({ index: '_order', n });
          const map = getTable(table);
          const arr = Array.from(map.values());
          return (_dir === 'desc' ? arr.reverse() : arr).slice(0, n);
        },
      }),
      collect: async () => {
        stats.collectCalls.push({ index: '_all' });
        return Array.from(getTable(table).values());
      },
      take: async (n: number) => {
        stats.takeCalls.push({ index: '_all', n });
        return Array.from(getTable(table).values()).slice(0, n);
      },
      withIndex: (index: string, cb?: (q: any) => any) => {
        const filters: Array<{ field: string; value: any }> = [];
        const q = {
          eq: (field: string, value: any) => {
            filters.push({ field, value });
            return q;
          },
        };
        if (cb) cb(q);
        const getFiltered = () => {
          const map = getTable(table);
          if (!map) return [];
          return Array.from(map.values()).filter((doc: any) =>
            filters.every((f) => doc[f.field] === f.value),
          );
        };
        return {
          order: (_dir: 'asc' | 'desc') => ({
            collect: async () => {
              stats.collectCalls.push({ index });
              let arr = getFiltered();
              if (_dir === 'desc') arr = arr.reverse();
              return arr;
            },
            take: async (n: number) => {
              stats.takeCalls.push({ index, n });
              let arr = getFiltered();
              if (_dir === 'desc') arr = arr.reverse();
              return arr.slice(0, n);
            },
          }),
          collect: async () => {
            stats.collectCalls.push({ index });
            return getFiltered();
          },
          unique: async () => {
            stats.uniqueCalls.push({ index });
            const results = getFiltered();
            return results[0] ?? null;
          },
          first: async () => {
            const results = getFiltered();
            return results[0] ?? null;
          },
          take: async (n: number) => {
            stats.takeCalls.push({ index, n });
            return getFiltered().slice(0, n);
          },
        };
      },
    }),
    get: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) return map.get(id) ?? null;
      }
      return null;
    },
    insert: async (table: string, doc: any) => {
      const map = getTable(table);
      const id = `${table}-${map.size + 1}`;
      map.set(id, { _id: id, ...doc });
      return id;
    },
    patch: async (id: string, patch: any) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) {
          const existing = map.get(id);
          map.set(id, { ...existing, ...patch });
          return;
        }
      }
    },
    delete: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) map.delete(id);
      }
    },
  };

  return {
    ctx: { db, auth: { getUserIdentity: async () => null } } as any,
    stats,
  };
}

function seedProject(ctx: any, name = 'P1'): string {
  return `project-${name}`;
}

function seedTask(ctx: any, projectId: string, seed: SeedTask): string {
  const now = 1_000;
  return ctx.db.insert('tasks', {
    projectId,
    title: seed.title,
    description: `desc-${seed.taskKey}`,
    storyPoints: seed.storyPoints,
    status: seed.status,
    priority: 'medium',
    costEstimate: 0,
    createdAt: now,
    updatedAt: now,
    taskKey: seed.taskKey,
    dependencies: seed.dependencies ?? [],
    blockerReason: seed.blockerReason,
  });
}

function seedTaskGraph(ctx: any, projectId: string, graph: SeedTask[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const seed of graph) {
    const id = seedTask(ctx, projectId, seed);
    ids.set(seed.taskKey, id);
  }
  return ids;
}

async function getTaskByKey(ctx: any, taskKey: string) {
  return ctx.db
    .query('tasks')
    .withIndex('by_task_key', (q: any) => q.eq('taskKey', taskKey))
    .unique();
}

describe('addTaskDependency — Convex mutation (integration)', () => {
  it('rejects self-dependency (test-strategy §3 item 1)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    const result = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'A' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/self/i);
  });

  it('rejects when task does not exist (test-strategy §3 item 5)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const result = await addTaskDependency(ctx, { taskKey: 'GHOST', dependencyKey: 'B' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/GHOST.*not found/i);
  });

  it('rejects when dependency task does not exist (missing dep key)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    const result = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'GHOST' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/GHOST.*not found/i);
  });

  it('rejects when dependency is already in the array', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const first = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(first.ok).toBe(true);
    const second = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already exists/i);
  });

  it('adds a valid dependency and persists the updated array', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const result = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(result.ok).toBe(true);
    const a = await getTaskByKey(ctx, 'A');
    expect(a.dependencies).toEqual(['B']);
  });

  it('transitions task to blocked when dependency is incomplete', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    const a = await getTaskByKey(ctx, 'A');
    expect(a.status).toBe('blocked');
    expect(a.blockerReason).toBeDefined();
  });

  it('does NOT transition task to blocked when dependency is already done', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'done', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    const a = await getTaskByKey(ctx, 'A');
    expect(a.status).toBe('ready');
    expect(a.blockerReason).toBeUndefined();
  });

  it('rejects 2-node cycle (A->B, then try B->A) (test-strategy §3 item 2)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const first = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(first.ok).toBe(true);
    const second = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/cycle/i);
  });

  it('rejects 3-node cycle (A->B->C, then try C->A)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });
    const ab = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(ab.ok).toBe(true);
    const bc = await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'B' });
    expect(bc.ok).toBe(true);
    const ca = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'C' });
    expect(ca.ok).toBe(false);
    expect(ca.error).toMatch(/cycle/i);
  });

  it('rejects cycle through transitive blockers', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'D', title: 'D', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'B' });
    await addTaskDependency(ctx, { taskKey: 'D', dependencyKey: 'C' });
    const result = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'D' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/cycle/i);
  });

  it('RED GATE: updates blockerReason when adding a 2nd dep to an already-blocked task', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    const afterFirst = await getTaskByKey(ctx, 'A');
    expect(afterFirst.status).toBe('blocked');
    const firstReason = afterFirst.blockerReason;
    expect(firstReason).toBeDefined();
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'C' });
    const afterSecond = await getTaskByKey(ctx, 'A');
    expect(afterSecond.dependencies).toEqual(['B', 'C']);
    expect(afterSecond.blockerReason).toBeDefined();
    expect(afterSecond.blockerReason).not.toBe(firstReason);
    expect(afterSecond.blockerReason).toMatch(/C/);
  });
});

describe('removeTaskDependency — Convex mutation (integration)', () => {
  it('returns error when task does not exist', async () => {
    const { ctx } = createMockCtx();
    const result = await removeTaskDependency(ctx, { taskKey: 'GHOST', dependencyKey: 'B' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/GHOST.*not found/i);
  });

  it('returns error when dependency is not in the array', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const result = await removeTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/does not exist/i);
  });

  it('removes a valid dependency from the array', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'C' });
    const result = await removeTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(result.ok).toBe(true);
    const a = await getTaskByKey(ctx, 'A');
    expect(a.dependencies).toEqual(['C']);
  });

  it('unblocks task when last dependency is removed and dep was incomplete', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    const blocked = await getTaskByKey(ctx, 'A');
    expect(blocked.status).toBe('blocked');
    await removeTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    const unblocked = await getTaskByKey(ctx, 'A');
    expect(unblocked.status).toBe('ready');
    expect(unblocked.blockerReason).toBeUndefined();
  });

  it('keeps task blocked when other incomplete dependencies remain', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'C' });
    await removeTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    const a = await getTaskByKey(ctx, 'A');
    expect(a.status).toBe('blocked');
  });
});

describe('getTaskWithDependencies — Convex query (integration)', () => {
  it('returns null when task does not exist', async () => {
    const { ctx } = createMockCtx();
    const result = await getTaskWithDependencies(ctx, { taskKey: 'GHOST' });
    expect(result).toBeNull();
  });

  it('returns task with empty dependencies when no deps are set', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 5 });
    const result = await getTaskWithDependencies(ctx, { taskKey: 'A' });
    expect(result).not.toBeNull();
    expect(result!.taskKey).toBe('A');
    expect(result!.storyPoints).toBe(5);
    expect(result!.dependencies).toEqual([]);
  });

  it('returns task with resolved dependency objects', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'Task B', status: 'done', storyPoints: 5 });
    await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    const result = await getTaskWithDependencies(ctx, { taskKey: 'A' });
    expect(result).not.toBeNull();
    expect(result!.dependencies).toHaveLength(1);
    expect(result!.dependencies[0].taskKey).toBe('B');
    expect(result!.dependencies[0].title).toBe('Task B');
    expect(result!.dependencies[0].status).toBe('done');
    expect(result!.dependencies[0].storyPoints).toBe(5);
  });

  it('filters out missing dep keys from the dependencies array', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const aId = await getTaskByKey(ctx, 'A');
    await ctx.db.patch(aId._id, { dependencies: ['B', 'GHOST'] });
    const result = await getTaskWithDependencies(ctx, { taskKey: 'A' });
    expect(result).not.toBeNull();
    expect(result!.dependencies).toHaveLength(1);
    expect(result!.dependencies[0].taskKey).toBe('B');
  });
});

describe('getBlockedTasks — Convex query (integration)', () => {
  it('returns empty array when no tasks are blocked', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    const result = await getBlockedTasks(ctx, { projectId });
    expect(result).toEqual([]);
  });

  it('returns blocked tasks with their transitive blocker chain', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'Task A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'Task B', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'Task C', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'B' });
    const result = await getBlockedTasks(ctx, { projectId });
    const blockedKeys = result.map((r: any) => r.taskKey);
    expect(blockedKeys).toContain('B');
    expect(blockedKeys).toContain('C');
    const c = result.find((r: any) => r.taskKey === 'C');
    expect(c).toBeDefined();
    const chainKeys = c!.blockerChain.map((b: any) => b.taskKey);
    expect(chainKeys).toContain('B');
  });

  it('uses by_status index and bounded .take(N) (test-strategy §3 item 7)', async () => {
    const { ctx, stats } = createMockCtx();
    const projectId = seedProject(ctx);
    await getBlockedTasks(ctx, { projectId });
    const statusQueries = stats.takeCalls.filter((c) => c.index === 'by_status');
    expect(statusQueries.length).toBeGreaterThan(0);
    const statusCollects = stats.collectCalls.filter((c) => c.index === 'by_status');
    expect(statusCollects).toHaveLength(0);
    const projectQueries = stats.takeCalls.filter((c) => c.index === 'by_project');
    expect(projectQueries.length).toBeGreaterThan(0);
    const projectCollects = stats.collectCalls.filter((c) => c.index === 'by_project');
    expect(projectCollects).toHaveLength(0);
  });
});

describe('getCriticalPath — Convex query (integration)', () => {
  it('returns empty result for project with no tasks', async () => {
    const { ctx } = createMockCtx();
    const result = await getCriticalPath(ctx, { projectId: 'project-empty' });
    expect(result.path).toEqual([]);
    expect(result.totalStoryPoints).toBe(0);
    expect(result.length).toBe(0);
  });

  it('returns single-task path for project with one task', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 5 });
    const result = await getCriticalPath(ctx, { projectId });
    expect(result.path).toEqual(['A']);
    expect(result.totalStoryPoints).toBe(5);
    expect(result.length).toBe(1);
  });

  it('picks the heavier branch in a diamond (test-strategy §3 item 3, regression)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTaskGraph(ctx, projectId, [
      { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 2 },
      { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 8, dependencies: ['A'] },
      { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3, dependencies: ['A'] },
      { taskKey: 'D', title: 'D', status: 'ready', storyPoints: 1, dependencies: ['B', 'C'] },
    ]);
    const result = await getCriticalPath(ctx, { projectId });
    expect(result.path).toEqual(['A', 'B', 'D']);
    expect(result.totalStoryPoints).toBe(11);
    expect(result.length).toBe(3);
  });

  it('excludes done tasks from the active critical path', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'done', storyPoints: 2 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5, dependencies: ['A'] });
    const result = await getCriticalPath(ctx, { projectId });
    expect(result.path).toEqual(['B']);
    expect(result.totalStoryPoints).toBe(5);
  });

  it('handles a disconnected DAG (both components are reachable)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 1 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 2, dependencies: ['A'] });
    seedTask(ctx, projectId, { taskKey: 'X', title: 'X', status: 'ready', storyPoints: 10 });
    const result = await getCriticalPath(ctx, { projectId });
    const endpoints = result.path[result.path.length - 1];
    expect(['B', 'X']).toContain(endpoints);
    expect(result.totalStoryPoints).toBeGreaterThanOrEqual(10);
  });

  it('returns empty result when active tasks contain a cycle', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3, dependencies: ['B'] });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 5, dependencies: ['A'] });
    const result = await getCriticalPath(ctx, { projectId });
    expect(result.path).toEqual([]);
    expect(result.totalStoryPoints).toBe(0);
  });

  it('RED GATE: uses bounded .take(N) on by_project, not unbounded .collect()', async () => {
    const { ctx, stats } = createMockCtx();
    const projectId = seedProject(ctx);
    await getCriticalPath(ctx, { projectId });
    const projectCollects = stats.collectCalls.filter((c) => c.index === 'by_project');
    expect(projectCollects).toHaveLength(0);
  });
});

describe('checkAndUnblockDownstream — Convex mutation (integration)', () => {
  it('returns empty unblocked list when completed task does not exist', async () => {
    const { ctx } = createMockCtx();
    const result = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'GHOST' });
    expect(result.unblocked).toEqual([]);
  });

  it('returns empty unblocked list when completed task is not done', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'in_progress', storyPoints: 3 });
    const result = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'A' });
    expect(result.unblocked).toEqual([]);
  });

  it('unblocks downstream tasks whose remaining deps are all done', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'done', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    const before = await getTaskByKey(ctx, 'B');
    expect(before.status).toBe('blocked');
    const result = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'A' });
    expect(result.unblocked).toContain('B');
    const after = await getTaskByKey(ctx, 'B');
    expect(after.status).toBe('ready');
    expect(after.blockerReason).toBeUndefined();
  });

  it('leaves downstream tasks blocked when other deps are still incomplete', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'done', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'D', title: 'D', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'C', title: 'C', status: 'ready', storyPoints: 3 });
    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'A' });
    await addTaskDependency(ctx, { taskKey: 'C', dependencyKey: 'D' });
    const result = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'A' });
    expect(result.unblocked).not.toContain('C');
    const c = await getTaskByKey(ctx, 'C');
    expect(c.status).toBe('blocked');
  });

  it('RED GATE: uses bounded query on by_project (no unbounded .collect())', async () => {
    const { ctx, stats } = createMockCtx();
    const projectId = seedProject(ctx);
    await checkAndUnblockDownstream(ctx, { completedTaskKey: 'X' });
    const projectCollects = stats.collectCalls.filter((c) => c.index === 'by_project');
    expect(projectCollects).toHaveLength(0);
  });
});

describe('addTaskDependency — optimistic state (test-strategy §3 item 8)', () => {
  it('rejected cycle does NOT pre-mutate the taskKey task', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const first = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(first.ok).toBe(true);
    const aBefore = await getTaskByKey(ctx, 'A');
    const bBefore = await getTaskByKey(ctx, 'B');
    const cycle = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(cycle.ok).toBe(false);
    expect(cycle.error).toMatch(/cycle/i);
    const aAfter = await getTaskByKey(ctx, 'A');
    const bAfter = await getTaskByKey(ctx, 'B');
    expect(aAfter.dependencies ?? []).toEqual(aBefore.dependencies ?? []);
    expect(bAfter.dependencies ?? []).toEqual(bBefore.dependencies ?? []);
    expect(bAfter.status).toBe(bBefore.status);
    expect(bAfter.blockerReason).toBe(bBefore.blockerReason);
  });

  it('rejected cycle does NOT pre-mutate the dependencyKey task', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const first = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(first.ok).toBe(true);
    const bBefore = await getTaskByKey(ctx, 'B');
    const cycle = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(cycle.ok).toBe(false);
    const bAfter = await getTaskByKey(ctx, 'B');
    expect(bAfter).toEqual(bBefore);
  });

  it('"already exists" rejection does not double-patch the deps array', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'ready', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const first = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(first.ok).toBe(true);
    const aAfter = await getTaskByKey(ctx, 'A');
    expect(aAfter.dependencies).toEqual(['B']);
    const second = await addTaskDependency(ctx, { taskKey: 'A', dependencyKey: 'B' });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already exists/i);
    const aFinal = await getTaskByKey(ctx, 'A');
    expect(aFinal.dependencies).toEqual(['B']);
  });
});

describe('checkAndUnblockDownstream — idempotency (test-strategy §3 item 8)', () => {
  it('second call with the same completedTaskKey returns empty unblocked (no double-patch)', async () => {
    const { ctx } = createMockCtx();
    const projectId = seedProject(ctx);
    seedTask(ctx, projectId, { taskKey: 'A', title: 'A', status: 'done', storyPoints: 3 });
    seedTask(ctx, projectId, { taskKey: 'B', title: 'B', status: 'ready', storyPoints: 3 });
    const addResult = await addTaskDependency(ctx, { taskKey: 'B', dependencyKey: 'A' });
    expect(addResult.ok).toBe(true);
    const first = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'A' });
    expect(first.unblocked).toContain('B');
    const bAfterFirst = await getTaskByKey(ctx, 'B');
    expect(bAfterFirst.status).toBe('ready');
    const second = await checkAndUnblockDownstream(ctx, { completedTaskKey: 'A' });
    expect(second.unblocked).toEqual([]);
    const bAfterSecond = await getTaskByKey(ctx, 'B');
    expect(bAfterSecond.status).toBe(bAfterFirst.status);
  });
});

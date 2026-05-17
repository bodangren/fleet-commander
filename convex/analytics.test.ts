import { describe, expect, it } from 'bun:test';
import {
  getCompletionTrends,
  getAgentUtilization,
  getBottlenecks,
  getQueueDepth,
  getHookMetrics,
  getSessionMetrics,
} from './analytics';

// ─── enhanced mock ctx with .gte() and .filter() support ───────────────────

function createAnalyticsMockCtx(tables: Record<string, Map<string, any>>) {
  const db = {
    query: (table: string) => ({
      collect: async () => {
        const map = tables[table];
        return map ? Array.from(map.values()) : [];
      },
      withIndex: (_index: string, cb?: (q: any) => any) => {
        const filters: Array<{ type: string; field: string; value: any }> = [];
        const q = {
          eq: (field: string, value: any) => {
            filters.push({ type: 'eq', field, value });
            return q;
          },
          gte: (field: string, value: any) => {
            filters.push({ type: 'gte', field, value });
            return q;
          },
          field: (field: string) => field,
        };
        if (cb) cb(q);

        const applyFilters = (docs: any[]) => {
          return docs.filter((doc: any) =>
            filters.every((f) => {
              if (f.type === 'eq') return doc[f.field] === f.value;
              if (f.type === 'gte') return doc[f.field] >= f.value;
              return true;
            })
          );
        };

        const getDocs = () => {
          const map = tables[table];
          const docs = map ? Array.from(map.values()) : [];
          return applyFilters(docs);
        };

        const chain = {
          collect: async () => getDocs(),
          unique: async () => {
            const results = getDocs();
            return results[0] ?? null;
          },
          first: async () => {
            const results = getDocs();
            return results[0] ?? null;
          },
          order: (dir: 'asc' | 'desc') => ({
            collect: async () => {
              let arr = getDocs();
              if (dir === 'desc') arr = arr.reverse();
              return arr;
            },
          }),
          filter: (predicate: (q: any) => any) => {
            const docs = getDocs();
            const filtered = docs.filter((doc: any) => {
              const fieldRef = (field: string) => ({ __field: field });
              const fq = {
                field: fieldRef,
                gte: (ref: any, value: any) => {
                  const field = ref && ref.__field ? ref.__field : ref;
                  return doc[field] >= value;
                },
                eq: (ref: any, value: any) => {
                  const field = ref && ref.__field ? ref.__field : ref;
                  return doc[field] === value;
                },
                and: (...conditions: boolean[]) => conditions.every(Boolean),
              };
              return predicate(fq);
            });
            return {
              collect: async () => filtered,
              unique: async () => filtered[0] ?? null,
            };
          },
        };

        return chain;
      },
    }),
    get: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) return map.get(id) ?? null;
      }
      return null;
    },
    insert: async (table: string, doc: any) => {
      const allSize = Object.values(tables).reduce((sum, m) => sum + m.size, 0);
      const id = `${table.slice(0, -1)}-${allSize + 1}`;
      const map = tables[table];
      if (map) map.set(id, { _id: id, ...doc });
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
  };

  return {
    db,
    auth: { getUserIdentity: async () => null },
  } as any;
}

function makeTask(overrides: Partial<any> = {}): any {
  return {
    projectSlug: 'proj',
    trackId: 'track-1',
    taskKey: 't1',
    status: 'todo',
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeWorkRun(overrides: Partial<any> = {}): any {
  return {
    projectSlug: 'proj',
    runnerHost: 'agent-a',
    status: 'running',
    startedAt: Date.now(),
    ...overrides,
  };
}

function makeErrorDoc(overrides: Partial<any> = {}): any {
  return {
    projectSlug: 'proj',
    operation: 'beforeRunHook',
    severity: 'warning',
    createdAt: Date.now(),
    ...overrides,
  };
}

// ─── getCompletionTrends ────────────────────────────────────────────────────

describe('getCompletionTrends', () => {
  it('returns bucketed completion data for recent tasks', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>([
      ['task-1', makeTask({ status: 'done', updatedAt: now - 3600000, taskKey: 't1' })],
      ['task-2', makeTask({ status: 'failed', updatedAt: now - 3600000, taskKey: 't2' })],
      ['task-3', makeTask({ status: 'todo', updatedAt: now - 3600000, taskKey: 't3' })],
    ]);
    const ctx = createAnalyticsMockCtx({ tasks });

    const result = await getCompletionTrends(ctx, { days: 1 });

    expect(result.length).toBeGreaterThan(0);
    const today = result[result.length - 1];
    expect(today.completed).toBe(1);
    expect(today.failed).toBe(1);
    expect(today.created).toBe(3);
  });

  it('returns all-zero buckets when no tasks exist', async () => {
    const ctx = createAnalyticsMockCtx({});

    const result = await getCompletionTrends(ctx, { days: 3 });

    expect(result).toHaveLength(3);
    for (const b of result) {
      expect(b.completed).toBe(0);
      expect(b.failed).toBe(0);
      expect(b.created).toBe(0);
    }
  });

  it('filters by projectSlug', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>([
      ['task-1', makeTask({ projectSlug: 'proj-a', status: 'done', updatedAt: now - 3600000 })],
      ['task-2', makeTask({ projectSlug: 'proj-b', status: 'done', updatedAt: now - 3600000 })],
    ]);
    const ctx = createAnalyticsMockCtx({ tasks });

    const result = await getCompletionTrends(ctx, { days: 1, projectSlug: 'proj-a' });

    const today = result[result.length - 1];
    expect(today.completed).toBe(1);
  });
});

// ─── getAgentUtilization ────────────────────────────────────────────────────

describe('getAgentUtilization', () => {
  it('groups work runs by agent and date', async () => {
    const now = Date.now();
    const workRuns = new Map<string, any>([
      ['run-1', makeWorkRun({ runnerHost: 'agent-a', status: 'succeeded', startedAt: now - 3600000 })],
      ['run-2', makeWorkRun({ runnerHost: 'agent-b', status: 'running', startedAt: now - 3600000 })],
    ]);
    const ctx = createAnalyticsMockCtx({ workRuns });

    const result = await getAgentUtilization(ctx, { days: 1 });

    expect(result.length).toBeGreaterThanOrEqual(1);
    const agents = [...new Set(result.map((r: any) => r.agent))];
    expect(agents).toContain('agent-a');
    expect(agents).toContain('agent-b');
  });

  it('returns empty array when no work runs exist', async () => {
    const ctx = createAnalyticsMockCtx({});

    const result = await getAgentUtilization(ctx, { days: 7 });

    expect(result).toEqual([]);
  });
});

// ─── getBottlenecks ─────────────────────────────────────────────────────────

describe('getBottlenecks', () => {
  it('computes bottleneck metrics by track', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>([
      ['task-1', makeTask({ trackId: 't1', status: 'done', updatedAt: now - 3600000, startedAt: now - 7200000 })],
      ['task-2', makeTask({ trackId: 't1', status: 'failed', updatedAt: now - 3600000 })],
      ['task-3', makeTask({ trackId: 't2', status: 'done', updatedAt: now - 3600000 })],
    ]);
    const ctx = createAnalyticsMockCtx({ tasks });

    const result = await getBottlenecks(ctx, { days: 1 });

    expect(result.length).toBe(2);
    const track1 = result.find((b: any) => b.trackId === 't1');
    expect(track1!.failureRate).toBeCloseTo(0.5);
    expect(track1!.totalTasks).toBe(2);
  });

  it('returns empty array when no tasks exist', async () => {
    const ctx = createAnalyticsMockCtx({});

    const result = await getBottlenecks(ctx, { days: 7 });

    expect(result).toEqual([]);
  });
});

// ─── getQueueDepth ──────────────────────────────────────────────────────────

describe('getQueueDepth', () => {
  it('counts pending and in-progress tasks per day', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>([
      ['task-1', makeTask({ status: 'todo', updatedAt: now - 3600000 })],
      ['task-2', makeTask({ status: 'in_progress', updatedAt: now - 3600000 })],
      ['task-3', makeTask({ status: 'done', updatedAt: now - 3600000 })],
    ]);
    const ctx = createAnalyticsMockCtx({ tasks });

    const result = await getQueueDepth(ctx, { days: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].pending).toBe(1);
    expect(result[0].inProgress).toBe(1);
    expect(result[0].completed).toBe(1);
  });

  it('returns all-zero buckets when no tasks exist', async () => {
    const ctx = createAnalyticsMockCtx({});

    const result = await getQueueDepth(ctx, { days: 3 });

    expect(result).toHaveLength(3);
    for (const b of result) {
      expect(b.pending).toBe(0);
      expect(b.inProgress).toBe(0);
      expect(b.completed).toBe(0);
    }
  });
});

// ─── getHookMetrics ─────────────────────────────────────────────────────────

describe('getHookMetrics', () => {
  it('counts hook executions and failures per phase', async () => {
    const now = Date.now();
    const orchestratorErrors = new Map<string, any>([
      ['err-1', makeErrorDoc({ operation: 'beforeRunHook', severity: 'fatal', createdAt: now - 3600000 })],
      ['err-2', makeErrorDoc({ operation: 'beforeRunHook', severity: 'warning', createdAt: now - 3600000 })],
      ['err-3', makeErrorDoc({ operation: 'afterRunHook', severity: 'debug', createdAt: now - 3600000 })],
    ]);
    const ctx = createAnalyticsMockCtx({ orchestratorErrors });

    const result = await getHookMetrics(ctx, { days: 1 });

    expect(result.length).toBe(3); // 3 phases × 1 day
    const beforeRun = result.find((e: any) => e.phase === 'beforeRunHook');
    expect(beforeRun!.executions).toBe(2);
    expect(beforeRun!.failures).toBe(1);
  });

  it('returns all-zero entries when no errors exist', async () => {
    const ctx = createAnalyticsMockCtx({});

    const result = await getHookMetrics(ctx, { days: 1 });

    expect(result.length).toBe(3);
    for (const e of result) {
      expect(e.executions).toBe(0);
      expect(e.failures).toBe(0);
    }
  });
});

// ─── getSessionMetrics ──────────────────────────────────────────────────────

describe('getSessionMetrics', () => {
  it('computes session-bound task metrics', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>([
      ['task-1', makeTask({ sessionId: 'sess-1', status: 'in_progress', updatedAt: now - 3600000 })],
      ['task-2', makeTask({ sessionId: 'sess-2', status: 'done', updatedAt: now - 3600000 })],
      ['task-3', makeTask({ status: 'todo', updatedAt: now - 3600000 })],
    ]);
    const ctx = createAnalyticsMockCtx({ tasks });

    const result = await getSessionMetrics(ctx, { days: 1 });

    expect(result.totalTasks).toBe(3);
    expect(result.sessionBoundTasks).toBe(2);
    expect(result.activeSessions).toBe(1);
    expect(result.byDate).toHaveLength(1);
  });

  it('returns all-zero metrics when no tasks exist', async () => {
    const ctx = createAnalyticsMockCtx({});

    const result = await getSessionMetrics(ctx, { days: 3 });

    expect(result.totalTasks).toBe(0);
    expect(result.sessionBoundTasks).toBe(0);
    expect(result.resumptionRate).toBe(0);
    expect(result.activeSessions).toBe(0);
    expect(result.byDate).toHaveLength(3);
  });
});

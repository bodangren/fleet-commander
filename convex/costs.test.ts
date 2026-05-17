import { describe, expect, it } from 'bun:test';
import {
  recordCost,
  getCostByProject,
  getCostByAgent,
  getCostTrend,
  getSessionSavings,
  getCostPerTask,
  backfillCostRecords,
} from './costs';

// ─── enhanced mock ctx with .gte() and .filter() support ───────────────────

function createCostsMockCtx(tables: Record<string, Map<string, any>>) {
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

function makeCostRecord(overrides: Partial<any> = {}): any {
  return {
    agentId: 'agent-1',
    projectSlug: 'proj',
    taskId: 'task-1',
    model: 'gpt-4o',
    inputTokens: 1000,
    outputTokens: 500,
    costUSD: 0.015,
    sessionResumed: false,
    sessionCostSaved: 0,
    recordedAt: Date.now(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<any> = {}): any {
  return {
    projectSlug: 'proj',
    taskKey: 't1',
    status: 'done',
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeRunContract(overrides: Partial<any> = {}): any {
  return {
    projectSlug: 'proj',
    taskId: 'task-1',
    inputTokens: 1000,
    outputTokens: 500,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeBudget(overrides: Partial<any> = {}): any {
  return {
    scope: 'project:proj',
    cap: 1000,
    spent: 0,
    ...overrides,
  };
}

// ─── recordCost ─────────────────────────────────────────────────────────────

describe('recordCost', () => {
  it('inserts a cost record and returns computed cost', async () => {
    const ctx = createCostsMockCtx({});

    const result = await recordCost(ctx, {
      agentId: 'agent-1',
      projectSlug: 'proj',
      taskId: 'task-1',
      model: 'gpt-4o',
      inputTokens: 1_000_000,
      outputTokens: 0,
      sessionResumed: false,
    });

    expect(result.costRecordId).toBeDefined();
    expect(result.costUSD).toBeGreaterThan(0);
  });

  it('computes session savings when sessionResumed is true', async () => {
    const ctx = createCostsMockCtx({});

    const result = await recordCost(ctx, {
      agentId: 'agent-1',
      projectSlug: 'proj',
      taskId: 'task-1',
      model: 'gpt-4o',
      inputTokens: 1000,
      outputTokens: 500,
      sessionResumed: true,
      contextTokens: 1_000_000,
    });

    expect(result.sessionCostSaved).toBeGreaterThan(0);
  });

  it('updates budget spend when budget exists', async () => {
    const budgets = new Map<string, any>([
      ['budget-1', { _id: 'budget-1', scope: 'project:proj', cap: 1000, spent: 100 }],
    ]);
    const ctx = createCostsMockCtx({ budgets });

    await recordCost(ctx, {
      agentId: 'agent-1',
      projectSlug: 'proj',
      taskId: 'task-1',
      model: 'gpt-4o',
      inputTokens: 1000,
      outputTokens: 500,
      sessionResumed: false,
    });

    const updated = await ctx.db.get('budget-1');
    expect(updated.spent).toBeGreaterThan(100);
  });
});

// ─── getCostByProject ───────────────────────────────────────────────────────

describe('getCostByProject', () => {
  it('aggregates costs by project', async () => {
    const costRecords = new Map<string, any>([
      ['cr-1', makeCostRecord({ projectSlug: 'proj-a', costUSD: 10, inputTokens: 1000, outputTokens: 500 })],
      ['cr-2', makeCostRecord({ projectSlug: 'proj-a', costUSD: 20, inputTokens: 2000, outputTokens: 1000 })],
      ['cr-3', makeCostRecord({ projectSlug: 'proj-b', costUSD: 30, inputTokens: 3000, outputTokens: 1500 })],
    ]);
    const ctx = createCostsMockCtx({ costRecords });

    const result = await getCostByProject(ctx, { days: 30 });

    expect(result.length).toBe(2);
    const projA = result.find((r: any) => r.projectSlug === 'proj-a');
    expect(projA!.totalCostUSD).toBe(30);
    expect(projA!.recordCount).toBe(2);
  });

  it('filters by projectSlug', async () => {
    const costRecords = new Map<string, any>([
      ['cr-1', makeCostRecord({ projectSlug: 'proj-a', costUSD: 10 })],
      ['cr-2', makeCostRecord({ projectSlug: 'proj-b', costUSD: 20 })],
    ]);
    const ctx = createCostsMockCtx({ costRecords });

    const result = await getCostByProject(ctx, { days: 30, projectSlug: 'proj-a' });

    expect(result.length).toBe(1);
    expect(result[0].projectSlug).toBe('proj-a');
  });

  it('returns empty array when no cost records exist', async () => {
    const ctx = createCostsMockCtx({});

    const result = await getCostByProject(ctx, { days: 30 });

    expect(result).toEqual([]);
  });
});

// ─── getCostByAgent ─────────────────────────────────────────────────────────

describe('getCostByAgent', () => {
  it('aggregates costs by agent', async () => {
    const costRecords = new Map<string, any>([
      ['cr-1', makeCostRecord({ agentId: 'agent-a', costUSD: 10 })],
      ['cr-2', makeCostRecord({ agentId: 'agent-a', costUSD: 20 })],
      ['cr-3', makeCostRecord({ agentId: 'agent-b', costUSD: 30 })],
    ]);
    const ctx = createCostsMockCtx({ costRecords });

    const result = await getCostByAgent(ctx, { days: 30 });

    expect(result.length).toBe(2);
    const agentA = result.find((r: any) => r.agentId === 'agent-a');
    expect(agentA!.totalCostUSD).toBe(30);
  });

  it('returns empty array when no cost records exist', async () => {
    const ctx = createCostsMockCtx({});

    const result = await getCostByAgent(ctx, { days: 30 });

    expect(result).toEqual([]);
  });
});

// ─── getCostTrend ───────────────────────────────────────────────────────────

describe('getCostTrend', () => {
  it('returns daily cost trend for recent days', async () => {
    const now = Date.now();
    const costRecords = new Map<string, any>([
      ['cr-1', makeCostRecord({ recordedAt: now - 3600000, costUSD: 10 })],
      ['cr-2', makeCostRecord({ recordedAt: now - 3600000, costUSD: 20 })],
    ]);
    const ctx = createCostsMockCtx({ costRecords });

    const result = await getCostTrend(ctx, { days: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].costUSD).toBe(30);
  });

  it('returns zero-cost entries for days with no records', async () => {
    const ctx = createCostsMockCtx({});

    const result = await getCostTrend(ctx, { days: 3 });

    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(r.costUSD).toBe(0);
      expect(r.inputTokens).toBe(0);
      expect(r.outputTokens).toBe(0);
    }
  });
});

// ─── getSessionSavings ──────────────────────────────────────────────────────

describe('getSessionSavings', () => {
  it('computes total savings from resumed sessions', async () => {
    const costRecords = new Map<string, any>([
      ['cr-1', makeCostRecord({ sessionResumed: true, sessionCostSaved: 5 })],
      ['cr-2', makeCostRecord({ sessionResumed: true, sessionCostSaved: 3 })],
      ['cr-3', makeCostRecord({ sessionResumed: false, sessionCostSaved: 0 })],
    ]);
    const ctx = createCostsMockCtx({ costRecords });

    const result = await getSessionSavings(ctx, { days: 30 });

    expect(result.totalSavedUSD).toBe(8);
    expect(result.totalResumedSessions).toBe(2);
    expect(result.avgSavingsPerSession).toBe(4);
  });

  it('returns zero when no resumed sessions exist', async () => {
    const ctx = createCostsMockCtx({});

    const result = await getSessionSavings(ctx, { days: 30 });

    expect(result.totalSavedUSD).toBe(0);
    expect(result.totalResumedSessions).toBe(0);
    expect(result.avgSavingsPerSession).toBe(0);
  });
});

// ─── getCostPerTask ─────────────────────────────────────────────────────────

describe('getCostPerTask', () => {
  it('computes cost per completed task', async () => {
    const now = Date.now();
    const costRecords = new Map<string, any>([
      ['cr-1', makeCostRecord({ taskId: 'task-1', costUSD: 10 })],
      ['cr-2', makeCostRecord({ taskId: 'task-2', costUSD: 20 })],
    ]);
    const tasks = new Map<string, any>([
      ['task-1', makeTask({ taskKey: 'task-1', status: 'done', updatedAt: now - 3600000 })],
      ['task-2', makeTask({ taskKey: 'task-2', status: 'done', updatedAt: now - 3600000 })],
    ]);
    const ctx = createCostsMockCtx({ costRecords, tasks });

    const result = await getCostPerTask(ctx, { days: 30 });

    expect(result.totalCostUSD).toBe(30);
    expect(result.completedTasks).toBe(2);
    expect(result.costPerTask).toBe(15);
  });

  it('returns zero cost per task when no completed tasks exist', async () => {
    const ctx = createCostsMockCtx({});

    const result = await getCostPerTask(ctx, { days: 30 });

    expect(result.totalCostUSD).toBe(0);
    expect(result.completedTasks).toBe(0);
    expect(result.costPerTask).toBe(0);
  });
});

// ─── backfillCostRecords ────────────────────────────────────────────────────

describe('backfillCostRecords', () => {
  it('creates cost records from run contracts', async () => {
    const runContracts = new Map<string, any>([
      ['rc-1', makeRunContract({ taskId: 'task-1', inputTokens: 1000, outputTokens: 500 })],
      ['rc-2', makeRunContract({ taskId: 'task-2', inputTokens: 2000, outputTokens: 1000 })],
    ]);
    const ctx = createCostsMockCtx({ runContracts });

    const result = await backfillCostRecords(ctx, {});

    expect(result.scanned).toBe(2);
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it('skips contracts with no token data', async () => {
    const runContracts = new Map<string, any>([
      ['rc-1', makeRunContract({ taskId: 'task-1', inputTokens: undefined, outputTokens: undefined })],
    ]);
    const ctx = createCostsMockCtx({ runContracts });

    const result = await backfillCostRecords(ctx, {});

    expect(result.scanned).toBe(1);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('skips contracts that already have cost records', async () => {
    const runContracts = new Map<string, any>([
      ['rc-1', makeRunContract({ taskId: 'task-1', inputTokens: 1000, outputTokens: 500 })],
    ]);
    const costRecords = new Map<string, any>([
      ['cr-1', { _id: 'cr-1', taskId: 'task-1', costUSD: 10 }],
    ]);
    const ctx = createCostsMockCtx({ runContracts, costRecords });

    const result = await backfillCostRecords(ctx, {});

    expect(result.scanned).toBe(1);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
  });
});

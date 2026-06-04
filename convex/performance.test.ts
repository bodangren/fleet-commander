import { describe, expect, it } from 'bun:test';
import {
  getPhaseBreakdown,
  getPhaseTrends,
  getAgentLatencyStats,
  getSlowAgents,
  getRegressionAlerts,
  getPerformanceOverview,
} from './performance';

// ─── enhanced mock ctx with .gte() and .filter() support ───────────────────

function createPerformanceMockCtx(tables: Record<string, Map<string, any>>) {
  const db = {
    query: (table: string) => {
      const getBaseDocs = () => {
        const map = tables[table];
        return map ? Array.from(map.values()) : [];
      };
      return {
        collect: async () => getBaseDocs(),
        take: async (n: number) => getBaseDocs().slice(0, n),
        order: (dir: 'asc' | 'desc') => ({
          collect: async () => {
            let arr = getBaseDocs();
            if (dir === 'desc') arr = arr.reverse();
            return arr;
          },
          take: async (n: number) => {
            let arr = getBaseDocs();
            if (dir === 'desc') arr = arr.reverse();
            return arr.slice(0, n);
          },
        }),
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
            take: async (n: number) => {
              const results = getDocs();
              return results.slice(0, n);
            },
            order: (dir: 'asc' | 'desc') => ({
              collect: async () => {
                let arr = getDocs();
                if (dir === 'desc') arr = arr.reverse();
                return arr;
              },
              take: async (n: number) => {
                let arr = getDocs();
                if (dir === 'desc') arr = arr.reverse();
                return arr.slice(0, n);
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
                take: async (n: number) => filtered.slice(0, n),
              };
            },
          };

          return chain;
        },
      };
    },
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

function makeRun(overrides: Partial<any> = {}): any {
  return {
    projectSlug: 'proj',
    runId: 'run-1',
    status: 'succeeded',
    selectedTaskKey: 'task-1',
    runnerHost: 'agent-a',
    startedAt: Date.now(),
    loadMs: 100,
    scoreMs: 200,
    executeMs: 300,
    persistMs: 50,
    totalMs: 650,
    ...overrides,
  };
}

function makeAgent(overrides: Partial<any> = {}): any {
  return {
    name: 'alice',
    displayName: 'Alice',
    model: 'claude-opus',
    status: 'active',
    ...overrides,
  };
}

function makePipelineRun(overrides: Partial<any> = {}): any {
  return {
    projectSlug: 'proj',
    stage: 'Executor',
    status: 'succeeded',
    cost: 10,
    agentId: 'agent-1',
    taskId: 'task-1',
    ...overrides,
  };
}

// ─── getPhaseBreakdown ──────────────────────────────────────────────────────

describe('getPhaseBreakdown', () => {
  it('returns percentile breakdown for recent runs', async () => {
    const now = Date.now();
    const workRuns = new Map<string, any>([
      ['run-1', makeRun({ startedAt: now - 3600000, loadMs: 100, scoreMs: 200, executeMs: 300, persistMs: 50, totalMs: 650 })],
      ['run-2', makeRun({ startedAt: now - 3600000, loadMs: 200, scoreMs: 400, executeMs: 600, persistMs: 100, totalMs: 1300 })],
    ]);
    const ctx = createPerformanceMockCtx({ workRuns });

    const result = await getPhaseBreakdown(ctx, { days: 1 });

    expect(result.load.p50).toBeGreaterThan(0);
    expect(result.execute.p50).toBeGreaterThan(0);
    expect(result.total.p50).toBeGreaterThan(0);
  });

  it('returns zero percentiles when no runs exist', async () => {
    const ctx = createPerformanceMockCtx({});

    const result = await getPhaseBreakdown(ctx, { days: 7 });

    expect(result.load.p50).toBe(0);
    expect(result.execute.p50).toBe(0);
    expect(result.total.p50).toBe(0);
  });
});

// ─── getPhaseTrends ─────────────────────────────────────────────────────────

describe('getPhaseTrends', () => {
  it('buckets runs by date and computes daily averages', async () => {
    const now = Date.now();
    const workRuns = new Map<string, any>([
      ['run-1', makeRun({ startedAt: now, loadMs: 100, totalMs: 650 })],
      ['run-2', makeRun({ startedAt: now - 86400000, loadMs: 200, totalMs: 1300 })],
    ]);
    const ctx = createPerformanceMockCtx({ workRuns });

    const result = await getPhaseTrends(ctx, { days: 2 });

    expect(result).toHaveLength(2);
    const today = result.find((r: any) => r.date === new Date(now).toISOString().slice(0, 10));
    expect(today).toBeDefined();
    expect(today!.loadAvg).toBe(100);
  });

  it('returns zero averages when no runs exist', async () => {
    const ctx = createPerformanceMockCtx({});

    const result = await getPhaseTrends(ctx, { days: 3 });

    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(r.loadAvg).toBe(0);
    }
  });
});

// ─── getAgentLatencyStats ───────────────────────────────────────────────────

describe('getAgentLatencyStats', () => {
  it('groups runs by agent and computes latency stats', async () => {
    const now = Date.now();
    const workRuns = new Map<string, any>([
      ['run-1', makeRun({ startedAt: now - 3600000, runnerHost: 'agent-a', totalMs: 100 })],
      ['run-2', makeRun({ startedAt: now - 3600000, runnerHost: 'agent-a', totalMs: 200 })],
      ['run-3', makeRun({ startedAt: now - 3600000, runnerHost: 'agent-b', totalMs: 300 })],
    ]);
    const ctx = createPerformanceMockCtx({ workRuns });

    const result = await getAgentLatencyStats(ctx, { days: 1 });

    expect(result.length).toBe(2);
    const agentA = result.find((r: any) => r.agent === 'agent-a');
    expect(agentA!.runCount).toBe(2);
    expect(agentA!.avg).toBe(150);
  });

  it('returns empty array when no runs exist', async () => {
    const ctx = createPerformanceMockCtx({});

    const result = await getAgentLatencyStats(ctx, { days: 7 });

    expect(result).toEqual([]);
  });
});

// ─── getSlowAgents ──────────────────────────────────────────────────────────

describe('getSlowAgents', () => {
  it('detects agents with consecutive latency breaches', async () => {
    const now = Date.now();
    const workRuns = new Map<string, any>();
    // Establish baseline: 100 fast runs
    for (let i = 0; i < 100; i++) {
      workRuns.set(`run-fast-${i}`, makeRun({ startedAt: now - i * 10000, runnerHost: 'agent-a', totalMs: 100 }));
    }
    // Add 3 slow consecutive runs
    workRuns.set('run-slow-1', makeRun({ startedAt: now + 1000, runnerHost: 'agent-a', totalMs: 300 }));
    workRuns.set('run-slow-2', makeRun({ startedAt: now + 2000, runnerHost: 'agent-a', totalMs: 300 }));
    workRuns.set('run-slow-3', makeRun({ startedAt: now + 3000, runnerHost: 'agent-a', totalMs: 300 }));

    const ctx = createPerformanceMockCtx({ workRuns });

    const result = await getSlowAgents(ctx, { days: 7, thresholdMultiplier: 1.5, minConsecutiveBreaches: 3 });

    expect(result.length).toBe(1);
    expect(result[0].agent).toBe('agent-a');
    expect(result[0].consecutiveBreaches).toBe(3);
  });

  it('returns empty array when no agents breach threshold', async () => {
    const now = Date.now();
    const workRuns = new Map<string, any>([
      ['run-1', makeRun({ startedAt: now - 3600000, runnerHost: 'agent-a', totalMs: 100 })],
    ]);
    const ctx = createPerformanceMockCtx({ workRuns });

    const result = await getSlowAgents(ctx, { days: 7 });

    expect(result).toEqual([]);
  });
});

// ─── getRegressionAlerts ────────────────────────────────────────────────────

describe('getRegressionAlerts', () => {
  it('returns empty array when no regressions detected', async () => {
    const now = Date.now();
    const workRuns = new Map<string, any>([
      ['run-1', makeRun({ startedAt: now - 3600000, runnerHost: 'agent-a', totalMs: 100 })],
    ]);
    const ctx = createPerformanceMockCtx({ workRuns });

    const result = await getRegressionAlerts(ctx, { days: 7 });

    expect(result).toEqual([]);
  });
});

// ─── getPerformanceOverview ─────────────────────────────────────────────────

describe('getPerformanceOverview', () => {
  it('returns agents, pipeline costs, and rejection reasons', async () => {
    const agents = new Map<string, any>([
      ['agent-1', makeAgent({ _id: 'agent-1', name: 'alice' })],
    ]);
    const pipelineRuns = new Map<string, any>([
      ['pr-1', makePipelineRun({ stage: 'Architect', cost: 50, agentId: 'agent-1', status: 'succeeded' })],
      ['pr-2', makePipelineRun({ stage: 'Executor', cost: 100, agentId: 'agent-1', status: 'failed', rejectionReason: 'Code quality' })],
    ]);
    const ctx = createPerformanceMockCtx({ agents, pipelineRuns });

    const result = await getPerformanceOverview(ctx, {});

    expect(result).toBeDefined();
    expect(result!.agents.length).toBeGreaterThan(0);
    expect(result!.pipelineCosts.length).toBeGreaterThan(0);
    expect(result!.rejectionReasons.length).toBeGreaterThan(0);
  });

  it('returns null when no data exists', async () => {
    const ctx = createPerformanceMockCtx({});

    const result = await getPerformanceOverview(ctx, {});

    expect(result).toBeNull();
  });

  it('filters pipeline runs by projectSlug', async () => {
    const agents = new Map<string, any>([
      ['agent-1', makeAgent({ _id: 'agent-1', name: 'alice' })],
    ]);
    const tasks = new Map<string, any>([
      ['task-1', { _id: 'task-1', projectSlug: 'proj-a' }],
      ['task-2', { _id: 'task-2', projectSlug: 'proj-b' }],
    ]);
    const pipelineRuns = new Map<string, any>([
      ['pr-1', makePipelineRun({ projectSlug: 'proj-a', stage: 'Architect', cost: 50, agentId: 'agent-1', taskId: 'task-1' })],
      ['pr-2', makePipelineRun({ projectSlug: 'proj-b', stage: 'Executor', cost: 100, agentId: 'agent-1', taskId: 'task-2' })],
    ]);
    const ctx = createPerformanceMockCtx({ agents, pipelineRuns, tasks });

    const result = await getPerformanceOverview(ctx, { projectSlug: 'proj-a' });

    expect(result).toBeDefined();
    const architectCost = result!.pipelineCosts.find((p: any) => p.stage === 'Architect');
    expect(architectCost!.cost).toBe(50);
    const executorCost = result!.pipelineCosts.find((p: any) => p.stage === 'Executor');
    expect(executorCost!.cost).toBe(0);
  });
});

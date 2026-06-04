import { describe, expect, it } from 'bun:test';
import { getCompletionTrends, getBottlenecks, getQueueDepth } from './analytics';

function createBoundedMockCtx(tables: Record<string, Map<string, any>>) {
  const db = {
    query: (table: string) => {
      const getBaseDocs = () => {
        const map = tables[table];
        return map ? Array.from(map.values()) : [];
      };
      return {
        collect: async () => getBaseDocs(),
        take: async (n: number) => getBaseDocs().slice(0, n),
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

          const getDocs = () => {
            const map = tables[table];
            const docs = map ? Array.from(map.values()) : [];
            return docs.filter((doc: any) =>
              filters.every((f) => {
                if (f.type === 'eq') return doc[f.field] === f.value;
                if (f.type === 'gte') return doc[f.field] >= f.value;
                return true;
              })
            );
          };

          return {
            collect: async () => getDocs(),
            take: async (n: number) => getDocs().slice(0, n),
            order: (_dir: 'asc' | 'desc') => ({
              collect: async () => getDocs(),
              take: async (n: number) => getDocs().slice(0, n),
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
                take: async (n: number) => filtered.slice(0, n),
              };
            },
          };
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

  return { db, auth: { getUserIdentity: async () => null } } as any;
}

describe('bounded query behavior', () => {
  it('getCompletionTrends handles large task sets without error', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>();
    for (let i = 0; i < 1500; i++) {
      tasks.set(`task-${i}`, {
        _id: `task-${i}`,
        projectSlug: 'proj',
        trackId: 'track-1',
        taskKey: `t${i}`,
        status: i % 3 === 0 ? 'done' : i % 3 === 1 ? 'failed' : 'todo',
        updatedAt: now - 3600000,
      });
    }
    const ctx = createBoundedMockCtx({ tasks });

    const result = await getCompletionTrends(ctx, { days: 1 });

    expect(result.length).toBeGreaterThan(0);
    const today = result[result.length - 1];
    expect(today.completed + today.failed + today.created).toBeGreaterThan(0);
  });

  it('getBottlenecks handles large task sets without error', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>();
    for (let i = 0; i < 1500; i++) {
      tasks.set(`task-${i}`, {
        _id: `task-${i}`,
        projectSlug: 'proj',
        trackId: `track-${i % 5}`,
        taskKey: `t${i}`,
        status: i % 4 === 0 ? 'failed' : 'done',
        updatedAt: now - 3600000,
      });
    }
    const ctx = createBoundedMockCtx({ tasks });

    const result = await getBottlenecks(ctx, { days: 1 });

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('getQueueDepth handles large task sets without error', async () => {
    const now = Date.now();
    const tasks = new Map<string, any>();
    for (let i = 0; i < 1500; i++) {
      tasks.set(`task-${i}`, {
        _id: `task-${i}`,
        projectSlug: 'proj',
        trackId: 'track-1',
        taskKey: `t${i}`,
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'in_progress' : 'done',
        updatedAt: now - 3600000,
      });
    }
    const ctx = createBoundedMockCtx({ tasks });

    const result = await getQueueDepth(ctx, { days: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].pending + result[0].inProgress + result[0].completed).toBeGreaterThan(0);
  });
});

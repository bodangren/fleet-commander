import { describe, expect, it, mock } from 'bun:test';
import { upsertTask, upsertIssue, upsertWorkRun, getBootstrapSummary } from './fleetCatalog';

function createFleetCatalogMockCtx(tables: Record<string, Map<string, any>> = {}) {
  const defaultTables: Record<string, Map<string, any>> = {
    tasks: new Map(),
    issues: new Map(),
    workRuns: new Map(),
    projects: new Map(),
    settings: new Map(),
    agents: new Map(),
    tracks: new Map(),
    systemMetadata: new Map(),
    ...tables,
  };

  const db = {
    query: (table: string) => {
      const getBaseDocs = () => {
        const map = defaultTables[table];
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
          };
          if (cb) cb(q);

          const getDocs = () => {
            const map = defaultTables[table];
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
            unique: async () => {
              const results = getDocs();
              return results[0] ?? null;
            },
            first: async () => {
              const results = getDocs();
              return results[0] ?? null;
            },
            take: async (n: number) => getDocs().slice(0, n),
          };
        },
      };
    },
    get: async (id: string) => {
      for (const map of Object.values(defaultTables)) {
        if (map.has(id)) return map.get(id) ?? null;
      }
      return null;
    },
    insert: async (table: string, doc: any) => {
      const allSize = Object.values(defaultTables).reduce((sum, m) => sum + m.size, 0);
      const id = `${table.slice(0, -1)}-${allSize + 1}`;
      const map = defaultTables[table];
      if (map) map.set(id, { _id: id, ...doc });
      return id;
    },
    patch: async (id: string, patch: any) => {
      for (const map of Object.values(defaultTables)) {
        if (map.has(id)) {
          const existing = map.get(id);
          map.set(id, { ...existing, ...patch });
          return;
        }
      }
    },
    delete: async (id: string) => {
      for (const map of Object.values(defaultTables)) {
        if (map.has(id)) {
          map.delete(id);
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

describe('fleetCatalog counter maintenance', () => {
  describe('upsertTask counter', () => {
    it('increments task counter on first insert', async () => {
      const ctx = createFleetCatalogMockCtx();

      await upsertTask(ctx, {
        projectSlug: 'proj',
        trackId: 'track-1',
        taskKey: 'task-new',
        title: 'New Task',
        status: 'todo',
        dependencies: [],
      });

      const counterRow = await ctx.db
        .query('systemMetadata')
        .withIndex('by_key', (q: any) => q.eq('key', 'count:tasks'))
        .first();
      expect(counterRow).not.toBeNull();
      expect(JSON.parse(counterRow.valueJson)).toBe(1);
    });

    it('does not increment counter on update (existing task)', async () => {
      const tasks = new Map<string, any>([
        ['task-1', { _id: 'task-1', taskKey: 'task-existing', projectSlug: 'proj', title: 'Old', status: 'todo', updatedAt: Date.now() }],
      ]);
      const ctx = createFleetCatalogMockCtx({ tasks });

      await upsertTask(ctx, {
        projectSlug: 'proj',
        trackId: 'track-1',
        taskKey: 'task-existing',
        title: 'Updated Task',
        status: 'in_progress',
        dependencies: [],
      });

      const counterRow = await ctx.db
        .query('systemMetadata')
        .withIndex('by_key', (q: any) => q.eq('key', 'count:tasks'))
        .first();
      expect(counterRow).toBeNull();
    });
  });

  describe('upsertIssue counter', () => {
    it('increments issue counter on first insert', async () => {
      const ctx = createFleetCatalogMockCtx();

      await upsertIssue(ctx, {
        projectSlug: 'proj',
        issueId: 'issue-new',
        title: 'New Issue',
        body: 'Details',
        status: 'open',
        openedAt: Date.now(),
      });

      const counterRow = await ctx.db
        .query('systemMetadata')
        .withIndex('by_key', (q: any) => q.eq('key', 'count:issues'))
        .first();
      expect(counterRow).not.toBeNull();
      expect(JSON.parse(counterRow.valueJson)).toBe(1);
    });

    it('does not increment counter on update (existing issue)', async () => {
      const issues = new Map<string, any>([
        ['issue-1', { _id: 'issue-1', issueId: 'issue-existing', projectSlug: 'proj', title: 'Old', body: '', status: 'open', openedAt: Date.now(), updatedAt: Date.now() }],
      ]);
      const ctx = createFleetCatalogMockCtx({ issues });

      await upsertIssue(ctx, {
        projectSlug: 'proj',
        issueId: 'issue-existing',
        title: 'Updated Issue',
        body: 'Updated',
        status: 'resolved',
        openedAt: Date.now(),
      });

      const counterRow = await ctx.db
        .query('systemMetadata')
        .withIndex('by_key', (q: any) => q.eq('key', 'count:issues'))
        .first();
      expect(counterRow).toBeNull();
    });
  });

  describe('upsertWorkRun counter', () => {
    it('increments workRun counter on first insert', async () => {
      const ctx = createFleetCatalogMockCtx();

      await upsertWorkRun(ctx, {
        projectSlug: 'proj',
        runId: 'run-new',
        status: 'running',
        startedAt: Date.now(),
      });

      const counterRow = await ctx.db
        .query('systemMetadata')
        .withIndex('by_key', (q: any) => q.eq('key', 'count:workRuns'))
        .first();
      expect(counterRow).not.toBeNull();
      expect(JSON.parse(counterRow.valueJson)).toBe(1);
    });

    it('does not increment counter on update (existing run)', async () => {
      const workRuns = new Map<string, any>([
        ['run-1', { _id: 'run-1', runId: 'run-existing', projectSlug: 'proj', status: 'running', startedAt: Date.now() }],
      ]);
      const ctx = createFleetCatalogMockCtx({ workRuns });

      await upsertWorkRun(ctx, {
        projectSlug: 'proj',
        runId: 'run-existing',
        status: 'succeeded',
        startedAt: Date.now(),
      });

      const counterRow = await ctx.db
        .query('systemMetadata')
        .withIndex('by_key', (q: any) => q.eq('key', 'count:workRuns'))
        .first();
      expect(counterRow).toBeNull();
    });
  });

  describe('getBootstrapSummary with counters', () => {
    it('reads denormalized counters for large tables', async () => {
      const systemMetadata = new Map<string, any>([
        ['sm-1', { _id: 'sm-1', key: 'count:tasks', valueJson: '42', updatedAt: Date.now() }],
        ['sm-2', { _id: 'sm-2', key: 'count:issues', valueJson: '7', updatedAt: Date.now() }],
        ['sm-3', { _id: 'sm-3', key: 'count:executionLogs', valueJson: '0', updatedAt: Date.now() }],
        ['sm-4', { _id: 'sm-4', key: 'count:workRuns', valueJson: '15', updatedAt: Date.now() }],
      ]);
      const ctx = createFleetCatalogMockCtx({ systemMetadata });

      const summary = await getBootstrapSummary(ctx, {});

      expect(summary.tasks).toBe(42);
      expect(summary.issues).toBe(7);
      expect(summary.executionLogs).toBe(0);
      expect(summary.workRuns).toBe(15);
    });

    it('returns 0 for missing counters', async () => {
      const ctx = createFleetCatalogMockCtx();

      const summary = await getBootstrapSummary(ctx, {});

      expect(summary.tasks).toBe(0);
      expect(summary.issues).toBe(0);
      expect(summary.workRuns).toBe(0);
    });
  });
});

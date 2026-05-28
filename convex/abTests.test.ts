import { describe, expect, it } from 'bun:test';
import {
  listAbTestsHandler,
  getAbTestHandler,
  createAbTestHandler,
  updateAbTestStatusHandler,
  deleteAbTestHandler,
  recordExperimentRunHandler,
  getExperimentResultsHandler,
} from './abTests';

function createMockCtx() {
  const tables: Record<string, Map<string, any>> = {};

  function getTable(name: string) {
    if (!tables[name]) tables[name] = new Map();
    return tables[name];
  }

  const db = {
    query: (table: string) => ({
      order: (_dir: string) => ({
        collect: async () => {
          const map = getTable(table);
          return Array.from(map.values()).reverse();
        },
      }),
      collect: async () => Array.from(getTable(table).values()),
      withIndex: (_index: string, cb?: (q: any) => any) => {
        const filters: Array<{ field: string; value: any }> = [];
        const q = {
          eq: (field: string, value: any) => {
            filters.push({ field, value });
            return q;
          },
        };
        if (cb) cb(q);
        return {
          collect: async () => {
            return Array.from(getTable(table).values()).filter((doc: any) =>
              filters.every((f) => doc[f.field] === f.value),
            );
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
        map.delete(id);
      }
    },
  };

  return { db, auth: { getUserIdentity: async () => null } } as any;
}

const sampleExperiment = {
  name: 'Claude vs GPT-4 Executor',
  agentRole: 'executor' as const,
  controlModel: 'claude-sonnet',
  treatmentModel: 'gpt-4o',
  splitRatio: 50,
};

describe('abTests', () => {
  describe('createAbTestHandler', () => {
    it('creates an experiment with draft status', async () => {
      const ctx = createMockCtx();
      const id = await createAbTestHandler(ctx, sampleExperiment);
      expect(id).toBeDefined();
      const doc = await ctx.db.get(id);
      expect(doc.name).toBe('Claude vs GPT-4 Executor');
      expect(doc.status).toBe('draft');
      expect(doc.agentRole).toBe('executor');
    });
  });

  describe('listAbTestsHandler', () => {
    it('returns all experiments ordered by createdAt desc', async () => {
      const ctx = createMockCtx();
      await createAbTestHandler(ctx, sampleExperiment);
      await createAbTestHandler(ctx, { ...sampleExperiment, name: 'Test 2' });

      const result = await listAbTestsHandler(ctx, {});
      expect(result.length).toBe(2);
    });

    it('filters by status', async () => {
      const ctx = createMockCtx();
      const id = await createAbTestHandler(ctx, sampleExperiment);
      await updateAbTestStatusHandler(ctx, { id, status: 'running' });

      const drafts = await listAbTestsHandler(ctx, { status: 'draft' });
      expect(drafts.length).toBe(0);

      const running = await listAbTestsHandler(ctx, { status: 'running' });
      expect(running.length).toBe(1);
    });
  });

  describe('getAbTestHandler', () => {
    it('returns experiment by id', async () => {
      const ctx = createMockCtx();
      const id = await createAbTestHandler(ctx, sampleExperiment);
      const result = await getAbTestHandler(ctx, { id });
      expect(result).toBeDefined();
      expect(result!.name).toBe('Claude vs GPT-4 Executor');
    });

    it('returns null when not found', async () => {
      const ctx = createMockCtx();
      const result = await getAbTestHandler(ctx, { id: 'nonexistent' as any });
      expect(result).toBeNull();
    });
  });

  describe('updateAbTestStatusHandler', () => {
    it('updates status and sets completedAt when completed', async () => {
      const ctx = createMockCtx();
      const id = await createAbTestHandler(ctx, sampleExperiment);

      await updateAbTestStatusHandler(ctx, { id, status: 'completed' });
      const doc = await ctx.db.get(id);
      expect(doc.status).toBe('completed');
      expect(doc.completedAt).toBeDefined();
    });

    it('does not set completedAt for non-completed status', async () => {
      const ctx = createMockCtx();
      const id = await createAbTestHandler(ctx, sampleExperiment);

      await updateAbTestStatusHandler(ctx, { id, status: 'running' });
      const doc = await ctx.db.get(id);
      expect(doc.status).toBe('running');
      expect(doc.completedAt).toBeUndefined();
    });
  });

  describe('deleteAbTestHandler', () => {
    it('deletes the experiment', async () => {
      const ctx = createMockCtx();
      const id = await createAbTestHandler(ctx, sampleExperiment);
      await deleteAbTestHandler(ctx, { id });
      const doc = await ctx.db.get(id);
      expect(doc).toBeNull();
    });
  });
});

describe('experimentRuns', () => {
  describe('recordExperimentRunHandler', () => {
    it('records a run for control variant', async () => {
      const ctx = createMockCtx();
      const expId = await createAbTestHandler(ctx, sampleExperiment);

      const runId = await recordExperimentRunHandler(ctx, {
        experimentId: expId,
        variant: 'control',
        taskDescription: 'Build a login form',
        model: 'claude-sonnet',
        agentRole: 'executor',
        cost: 1.5,
        durationMs: 2000,
        output: 'Login form built successfully',
        rejected: false,
        similarityScore: 0.85,
      });

      expect(runId).toBeDefined();
      const doc = await ctx.db.get(runId);
      expect(doc.variant).toBe('control');
      expect(doc.cost).toBe(1.5);
      expect(doc.similarityScore).toBe(0.85);
    });

    it('records a run for treatment variant', async () => {
      const ctx = createMockCtx();
      const expId = await createAbTestHandler(ctx, sampleExperiment);

      const runId = await recordExperimentRunHandler(ctx, {
        experimentId: expId,
        variant: 'treatment',
        taskDescription: 'Build a login form',
        model: 'gpt-4o',
        agentRole: 'executor',
        cost: 2.0,
        durationMs: 1500,
        output: 'Login form created',
        rejected: true,
      });

      const doc = await ctx.db.get(runId);
      expect(doc.variant).toBe('treatment');
      expect(doc.rejected).toBe(true);
      expect(doc.similarityScore).toBeUndefined();
    });
  });

  describe('getExperimentResultsHandler', () => {
    it('returns experiment with runs and summary', async () => {
      const ctx = createMockCtx();
      const expId = await createAbTestHandler(ctx, sampleExperiment);

      await recordExperimentRunHandler(ctx, {
        experimentId: expId,
        variant: 'control',
        taskDescription: 'Build a login form',
        model: 'claude-sonnet',
        agentRole: 'executor',
        cost: 1.5,
        durationMs: 2000,
        output: 'Login form built',
        rejected: false,
        similarityScore: 0.9,
      });

      await recordExperimentRunHandler(ctx, {
        experimentId: expId,
        variant: 'treatment',
        taskDescription: 'Build a login form',
        model: 'gpt-4o',
        agentRole: 'executor',
        cost: 2.0,
        durationMs: 1500,
        output: 'Login form created',
        rejected: true,
        similarityScore: 0.9,
      });

      const results = await getExperimentResultsHandler(ctx, { experimentId: expId });
      expect(results.experiment).toBeDefined();
      expect(results.runs.length).toBe(2);
      expect(results.summary.controlRuns).toBe(1);
      expect(results.summary.treatmentRuns).toBe(1);
      expect(results.summary.controlAvgCost).toBe(1.5);
      expect(results.summary.treatmentAvgCost).toBe(2.0);
      expect(results.summary.controlRejectionRate).toBe(0);
      expect(results.summary.treatmentRejectionRate).toBe(1);
      expect(results.summary.avgSimilarity).toBe(0.9);
    });

    it('returns empty summary when no runs exist', async () => {
      const ctx = createMockCtx();
      const expId = await createAbTestHandler(ctx, sampleExperiment);

      const results = await getExperimentResultsHandler(ctx, { experimentId: expId });
      expect(results.runs.length).toBe(0);
      expect(results.summary.controlRuns).toBe(0);
      expect(results.summary.treatmentRuns).toBe(0);
      expect(results.summary.avgSimilarity).toBe(0);
    });

    it('returns null experiment when not found', async () => {
      const ctx = createMockCtx();
      const results = await getExperimentResultsHandler(ctx, {
        experimentId: 'nonexistent' as any,
      });
      expect(results.experiment).toBeNull();
    });
  });
});

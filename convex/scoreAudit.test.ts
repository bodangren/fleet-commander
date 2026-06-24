import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'bun:test';
import {
  createScoreAuditHandler,
  listScoreAuditByTaskHandler,
} from './scoreAudit';

/**
 * Mock Convex context with a chainable `query().withIndex().order().take()` API.
 * Persists into an in-memory `scoreAudit` map so the insert + read round-trip
 * can be exercised without a live Convex deployment.
 */
function createMockCtx() {
  const scoreAudit = new Map<string, any>();
  let insertSeq = 0;

  const db = {
    insert: async (table: string, doc: any) => {
      insertSeq += 1;
      const id = `${table}-${insertSeq}`;
      if (table === 'scoreAudit') scoreAudit.set(id, { _id: id, ...doc });
      return id;
    },
    query: (table: string) => {
      const getBaseDocs = () => {
        if (table === 'scoreAudit') return Array.from(scoreAudit.values());
        return [];
      };
      return {
        withIndex: (_index: string, cb?: (q: any) => any) => {
          const filters: Array<{ field: string; value: any }> = [];
          const q = {
            eq: (field: string, value: any) => {
              filters.push({ field, value });
              return q;
            },
          };
          if (cb) cb(q);
          const getFiltered = () =>
            getBaseDocs().filter((doc: any) =>
              filters.every((f) => doc[f.field] === f.value),
            );
          return {
            order: (dir: 'asc' | 'desc') => ({
              take: async (n: number) => {
                let arr = getFiltered();
                if (dir === 'desc') arr = arr.reverse();
                return arr.slice(0, n);
              },
              collect: async () => {
                let arr = getFiltered();
                if (dir === 'desc') arr = arr.reverse();
                return arr;
              },
            }),
            collect: async () => getFiltered(),
          };
        },
      };
    },
  };

  return {
    ctx: { db, auth: { getUserIdentity: async () => ({ subject: 'user-1' }) } } as any,
    scoreAudit,
  };
}

const validPayload = {
  chosenTaskId: 'task-1',
  candidatesJson: '[{"taskId":"task-1"}]',
  breakdownJson: '{"priority":1}',
  justification: 'highest priority',
  weightsVersion: 1,
  llmTieBreak: false,
};

describe('createScoreAuditHandler', () => {
  it('persists a score audit row and returns the inserted entry', async () => {
    const { ctx, scoreAudit } = createMockCtx();

    const result = await createScoreAuditHandler(ctx, { ...validPayload });

    expect(scoreAudit.size).toBe(1);
    expect(result.chosenTaskId).toBe('task-1');
    expect(result.dispatchedAt).toBeNumber();
    expect(Array.from(scoreAudit.values())[0]).toMatchObject(result);
  });

  it('rejects an empty chosenTaskId with a clear error', async () => {
    const { ctx, scoreAudit } = createMockCtx();

    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, chosenTaskId: '' }),
    ).rejects.toThrow(ConvexError);
    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, chosenTaskId: '' }),
    ).rejects.toThrow(/chosenTaskId/);
    expect(scoreAudit.size).toBe(0);
  });

  it('rejects an empty candidatesJson with a clear error', async () => {
    const { ctx, scoreAudit } = createMockCtx();

    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, candidatesJson: '' }),
    ).rejects.toThrow(ConvexError);
    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, candidatesJson: '' }),
    ).rejects.toThrow(/candidatesJson/);
    expect(scoreAudit.size).toBe(0);
  });

  it('rejects an empty breakdownJson with a clear error', async () => {
    const { ctx, scoreAudit } = createMockCtx();

    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, breakdownJson: '' }),
    ).rejects.toThrow(ConvexError);
    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, breakdownJson: '' }),
    ).rejects.toThrow(/breakdownJson/);
    expect(scoreAudit.size).toBe(0);
  });

  it('rejects an empty justification with a clear error', async () => {
    const { ctx, scoreAudit } = createMockCtx();

    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, justification: '' }),
    ).rejects.toThrow(ConvexError);
    await expect(
      createScoreAuditHandler(ctx, { ...validPayload, justification: '' }),
    ).rejects.toThrow(/justification/);
    expect(scoreAudit.size).toBe(0);
  });
});

describe('scoreAudit consumer round-trip (AC4)', () => {
  it('listScoreAuditByTask returns the rows persisted by createScoreAudit', async () => {
    const { ctx } = createMockCtx();

    const first = await createScoreAuditHandler(ctx, {
      ...validPayload,
      chosenTaskId: 'task-A',
      justification: 'first dispatch',
    });
    const second = await createScoreAuditHandler(ctx, {
      ...validPayload,
      chosenTaskId: 'task-A',
      justification: 'second dispatch',
      weightsVersion: 2,
    });
    // Decoy for another task that must not surface in the task-A result set.
    await createScoreAuditHandler(ctx, {
      ...validPayload,
      chosenTaskId: 'task-B',
      justification: 'unrelated',
    });

    const rows = await listScoreAuditByTaskHandler(ctx, {
      chosenTaskId: 'task-A',
      limit: 10,
    });

    expect(rows.length).toBe(2);
    expect(rows.every((row) => row.chosenTaskId === 'task-A')).toBe(true);
    expect(rows[0].justification).toBe(second.justification);
    expect(rows[1].justification).toBe(first.justification);
    expect(rows[0].weightsVersion).toBe(2);
    expect(rows[1].weightsVersion).toBe(1);
  });

  it('listScoreAuditByTask returns an empty array when no audits exist for the task', async () => {
    const { ctx } = createMockCtx();

    const rows = await listScoreAuditByTaskHandler(ctx, {
      chosenTaskId: 'task-missing',
      limit: 10,
    });

    expect(rows).toEqual([]);
  });
});
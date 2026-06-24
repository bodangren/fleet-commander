import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'bun:test';
import { createScoreAuditHandler } from './scoreAudit';

function createMockCtx() {
  const scoreAudit = new Map<string, any>();
  const db = {
    insert: async (table: string, doc: any) => {
      const id = `${table}-${scoreAudit.size + 1}`;
      if (table === 'scoreAudit') scoreAudit.set(id, { _id: id, ...doc });
      return id;
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
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

describe('createScoreAuditHandler', () => {
  it('persists a score audit row and returns the inserted entry', async () => {
    const { ctx, scoreAudit } = createMockCtx();

    const result = await createScoreAuditHandler(ctx, {
      chosenTaskId: 'task-1',
      candidatesJson: '[{"taskId":"task-1"}]',
      breakdownJson: '{"priority":1}',
      justification: 'highest priority',
      weightsVersion: 1,
      llmTieBreak: false,
    });

    expect(scoreAudit.size).toBe(1);
    expect(result.chosenTaskId).toBe('task-1');
    expect(result.dispatchedAt).toBeNumber();
    expect(Array.from(scoreAudit.values())[0]).toMatchObject(result);
  });
});

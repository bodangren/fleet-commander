import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { checkBudget } from './checkBudget';

describe('checkBudget stage', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
    query: mock(async () => undefined as unknown),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
  });

  it('returns allowed when budget is missing', async () => {
    (mockClient.query as any).mockImplementation(async () => undefined);
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(true);
  });

  it('returns allowed when budget is allowed', async () => {
    (mockClient.query as any).mockImplementation(async () => ({
      allowed: true,
      reason: 'ok',
    }));
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(true);
  });

  it('returns blocked with reason when not allowed', async () => {
    (mockClient.query as any).mockImplementation(async () => ({
      allowed: false,
      reason: 'over budget',
      policy: 'advisory',
    }));
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('over budget');
      expect(result.policy).toBe('advisory');
    }
  });

  it('returns strict policy when budget policy is strict', async () => {
    (mockClient.query as any).mockImplementation(async () => ({
      allowed: false,
      reason: 'hard cap',
      policy: 'strict',
    }));
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.policy).toBe('strict');
    }
  });

  it('fails open when query throws (non-blocking)', async () => {
    (mockClient.query as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(true);
  });
});

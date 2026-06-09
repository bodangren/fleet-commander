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

  it('returns allowed when budget is missing (no sprint, no project budget)', async () => {
    (mockClient.query as any).mockImplementation(async () => undefined);
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(true);
  });

  it('returns allowed when project budget is allowed (no active sprint)', async () => {
    let callCount = 0;
    (mockClient.query as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return null;
      return { allowed: true, reason: 'Within budget', policy: 'advisory', spent: 10, cap: 100 };
    });
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(true);
  });

  it('returns blocked with reason when project budget is not allowed', async () => {
    let callCount = 0;
    (mockClient.query as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return null;
      return { allowed: false, reason: 'over budget', policy: 'advisory', spent: 100, cap: 80 };
    });
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('over budget');
      expect(result.policy).toBe('advisory');
    }
  });

  it('returns blocked when sprint budget is exceeded (sprint takes precedence)', async () => {
    let callCount = 0;
    (mockClient.query as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { _id: 'sprint1', projectId: 'proj1', name: 'Sprint 1', status: 'active', budget: 50, actualCost: 55, pointsDelivered: 0, taskCount: 5, completedCount: 0, createdAt: Date.now() };
      }
      if (callCount === 2) {
        return { allowed: false, reason: 'sprint over budget', policy: 'strict', spent: 55, cap: 50 };
      }
      return { allowed: true, reason: 'Within project budget', policy: 'advisory', spent: 10, cap: 100 };
    });
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('sprint over budget');
      expect(result.policy).toBe('strict');
    }
  });

  it('returns allowed when sprint budget allows but project budget would block (sprint override)', async () => {
    let callCount = 0;
    (mockClient.query as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { _id: 'sprint1', projectId: 'proj1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 10, pointsDelivered: 0, taskCount: 5, completedCount: 0, createdAt: Date.now() };
      }
      if (callCount === 2) {
        return { allowed: true, reason: 'Within sprint budget', policy: 'advisory', spent: 10, cap: 100 };
      }
      return { allowed: false, reason: 'project over budget', policy: 'strict', spent: 200, cap: 150 };
    });
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('project over budget');
    }
  });

  it('returns allowed when both sprint and project budgets allow', async () => {
    let callCount = 0;
    (mockClient.query as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { _id: 'sprint1', projectId: 'proj1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 10, pointsDelivered: 0, taskCount: 5, completedCount: 0, createdAt: Date.now() };
      }
      if (callCount === 2) {
        return { allowed: true, reason: 'Within sprint budget', policy: 'advisory', spent: 10, cap: 100 };
      }
      return { allowed: true, reason: 'Within project budget', policy: 'advisory', spent: 50, cap: 200 };
    });
    const result = await checkBudget(mockClient as any, 'p1', 't1');
    expect(result.allowed).toBe(true);
  });

  it('returns strict policy when budget policy is strict (no sprint)', async () => {
    let callCount = 0;
    (mockClient.query as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return null;
      return { allowed: false, reason: 'hard cap', policy: 'strict', spent: 100, cap: 100 };
    });
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
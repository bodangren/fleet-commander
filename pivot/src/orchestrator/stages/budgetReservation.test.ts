import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import {
  reserveBudgetAtDispatch,
  reconcileBudgetOnComplete,
} from './budgetReservation';

describe('budgetReservation', () => {
  const mockClientRaw = {
    mutation: mock(async () => ({})) as any,
    query: mock(async () => undefined as unknown) as any,
  };
  const mockClient = mockClientRaw as unknown as ConvexHttpClient;

  beforeEach(() => {
    mockClientRaw.mutation.mockReset();
    mockClientRaw.query.mockReset();
  });

  describe('reserveBudgetAtDispatch', () => {
    it('returns reserved=true when no sprint and project budget allows', async () => {
      let queryCount = 0;
      mockClientRaw.query.mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) return null;
        return undefined;
      });
      mockClientRaw.mutation.mockImplementation(async () => ({ reserved: true, reservationId: 'r1' }));

      const result = await reserveBudgetAtDispatch(mockClient, 'p1', 't1', 0.5);
      expect(result.reserved).toBe(true);
      expect(result.reservationId).toContain('dispatch');
    });

    it('returns reserved=false when project budget is exceeded', async () => {
      let queryCount = 0;
      mockClientRaw.query.mockImplementation(async () => {
        queryCount++;
        return queryCount === 1 ? null : undefined;
      });
      let mutationCount = 0;
      mockClientRaw.mutation.mockImplementation(async () => {
        mutationCount++;
        if (mutationCount === 1) {
          return { reserved: false, reservationId: 'r1', reason: 'Budget exceeded' };
        }
        return { reserved: true, reservationId: 'r1' };
      });

      const result = await reserveBudgetAtDispatch(mockClient, 'p1', 't1', 0.5);
      expect(result.reserved).toBe(false);
      expect(result.reason).toBe('Budget exceeded');
    });

    it('returns reserved=false when sprint budget is exceeded', async () => {
      mockClientRaw.query.mockImplementation(async () => ({
        _id: 'sprint1', projectId: 'proj1', name: 'Sprint 1', status: 'active',
        budget: 100, actualCost: 10, pointsDelivered: 0, taskCount: 5, completedCount: 0, createdAt: Date.now(),
      }));
      mockClientRaw.mutation.mockImplementation(async () => ({
        reserved: false, reservationId: 'r1', reason: 'Sprint budget exceeded',
      }));

      const result = await reserveBudgetAtDispatch(mockClient, 'p1', 't1', 0.5);
      expect(result.reserved).toBe(false);
      expect(result.reason).toContain('Sprint');
    });

    it('reserves both sprint and project budgets when sprint is active', async () => {
      const sprint = {
        _id: 'sprint1', projectId: 'proj1', name: 'Sprint 1', status: 'active',
        budget: 100, actualCost: 10, pointsDelivered: 0, taskCount: 5, completedCount: 0, createdAt: Date.now(),
      };
      let queryCount = 0;
      mockClientRaw.query.mockImplementation(async () => {
        queryCount++;
        if (queryCount <= 1) return sprint;
        return undefined;
      });
      let mutationCount = 0;
      mockClientRaw.mutation.mockImplementation(async () => {
        mutationCount++;
        return { reserved: true, reservationId: `r${mutationCount}` };
      });

      const result = await reserveBudgetAtDispatch(mockClient, 'p1', 't1', 0.5);
      expect(result.reserved).toBe(true);
      expect(mockClient.mutation).toHaveBeenCalledTimes(2);
    });

    it('fails open when mutations throw (non-blocking)', async () => {
      mockClientRaw.query.mockImplementation(async () => {
        throw new Error('Convex unreachable');
      });

      const result = await reserveBudgetAtDispatch(mockClient, 'p1', 't1', 0.5);
      expect(result.reserved).toBe(true);
    });
  });

  describe('reconcileBudgetOnComplete', () => {
    it('reconciles both sprint and project when sprint is active', async () => {
      const sprint = {
        _id: 'sprint1', projectId: 'proj1', name: 'Sprint 1', status: 'active',
        budget: 100, actualCost: 10, pointsDelivered: 0, taskCount: 5, completedCount: 0, createdAt: Date.now(),
      };
      let queryCount = 0;
      mockClientRaw.query.mockImplementation(async () => {
        queryCount++;
        if (queryCount <= 1) return sprint;
        return undefined;
      });

      await reconcileBudgetOnComplete(mockClient, 'p1', 'corr-1', 0.08);
      expect(mockClient.mutation).toHaveBeenCalledTimes(2);
    });

    it('reconciles only project when no sprint', async () => {
      let queryCount = 0;
      mockClientRaw.query.mockImplementation(async () => {
        queryCount++;
        if (queryCount === 1) return null;
        return undefined;
      });

      await reconcileBudgetOnComplete(mockClient, 'p1', 'corr-2', 0.08);
      expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    });

    it('does not throw on Convex errors (non-blocking)', async () => {
      mockClientRaw.query.mockImplementation(async () => {
        throw new Error('Convex unreachable');
      });

      await expect(reconcileBudgetOnComplete(mockClient, 'p1', 'corr-3', 0.08)).resolves.toBeUndefined();
    });
  });
});
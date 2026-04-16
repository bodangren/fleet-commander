import { describe, expect, it } from 'bun:test';
import {
  applyBudgetPenalty,
  shouldEscalateRetry,
  selectHarnessByEconomics,
  requiredReviewDepth,
  isBudgetBreached,
  computeRemainingBudget,
  computeSpendRate,
  isWithinPeriod,
  validateBudgetScope,
} from './economic';
import type { BudgetEntry } from './economic';

describe('economic modulators', () => {
  describe('applyBudgetPenalty', () => {
    const baseScore = 100;

    it('returns base score when budget is not breached', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 300,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      const score = applyBudgetPenalty(baseScore, budget, 50);
      expect(score).toBeLessThan(baseScore);
    });

    it('returns 0 when strict budget is exhausted', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 100,
        spent: 100,
        policy: 'strict',
        updatedAt: Date.now(),
      };
      const score = applyBudgetPenalty(baseScore, budget, 50);
      expect(score).toBe(0);
    });

    it('returns low score when over budget', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 100,
        spent: 150,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      const score = applyBudgetPenalty(baseScore, budget, 50);
      expect(score).toBe(0);
    });

    it('applies higher penalty for higher cost tasks', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 500,
        spent: 400,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      const lowCostPenalty = applyBudgetPenalty(baseScore, budget, 10);
      const highCostPenalty = applyBudgetPenalty(baseScore, budget, 100);
      expect(highCostPenalty).toBeLessThan(lowCostPenalty);
    });

    it('advisory policy allows tasks when not over cap', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 500,
        policy: 'advisory',
        updatedAt: Date.now(),
      };
      const score = applyBudgetPenalty(baseScore, budget, 50);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('shouldEscalateRetry', () => {
    it('returns retry when retry count is below threshold', () => {
      const history: Array<{ taskId: string; action: string }> = [
        { taskId: 'task-1', action: 'retry' },
        { taskId: 'task-1', action: 'retry' },
      ];
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      expect(shouldEscalateRetry(history, 'task-1', budget)).toBe('retry');
    });

    it('returns escalate when retry count exceeds maxRetries', () => {
      const history: Array<{ taskId: string; action: string }> = [
        { taskId: 'task-1', action: 'retry' },
        { taskId: 'task-1', action: 'retry' },
        { taskId: 'task-1', action: 'retry' },
      ];
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      expect(shouldEscalateRetry(history, 'task-1', budget)).toBe('escalate');
    });

    it('returns escalate when budget is exhausted (strict policy)', () => {
      const history: Array<{ taskId: string; action: string }> = [
        { taskId: 'task-1', action: 'retry' },
      ];
      const budget = { spent: 1000, cap: 1000, policy: 'strict' as const };
      expect(shouldEscalateRetry(history, 'task-1', budget)).toBe('escalate');
    });

    it('returns retry when budget is exhausted (soft policy)', () => {
      const history: Array<{ taskId: string; action: string }> = [
        { taskId: 'task-1', action: 'retry' },
      ];
      const budget = { spent: 1000, cap: 1000, policy: 'soft' as const };
      expect(shouldEscalateRetry(history, 'task-1', budget)).toBe('retry');
    });

    it('returns escalate action when should escalate', () => {
      const history: Array<{ taskId: string; action: string }> = [
        { taskId: 'task-1', action: 'retry' },
        { taskId: 'task-1', action: 'retry' },
        { taskId: 'task-1', action: 'retry' },
      ];
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      const result = shouldEscalateRetry(history, 'task-1', budget);
      expect(result).toBe('escalate');
    });

    it('returns retry action when should continue retrying', () => {
      const history: Array<{ taskId: string; action: string }> = [];
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      const result = shouldEscalateRetry(history, 'task-1', budget);
      expect(result).toBe('retry');
    });
  });

  describe('selectHarnessByEconomics', () => {
    const harnesses = [
      { name: 'expensive-harness', costWeight: 1.0, supportedTaskClasses: ['feature', 'bug'] as const },
      { name: 'cheap-harness', costWeight: 0.3, supportedTaskClasses: ['feature', 'bug', 'chore'] as const },
    ];

    it('selects cheap harness for low-risk task when budget is tight', () => {
      const task = { taskKey: 'chore-1', taskClass: 'chore' as const, riskLevel: 'low' as const };
      const budget = { spent: 900, cap: 1000, policy: 'soft' as const };
      const selected = selectHarnessByEconomics(task, harnesses, budget);
      expect(selected).toBe('cheap-harness');
    });

    it('selects expensive harness for high-risk task regardless of budget', () => {
      const task = { taskKey: 'bug-1', taskClass: 'bug' as const, riskLevel: 'high' as const };
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      const selected = selectHarnessByEconomics(task, harnesses, budget);
      expect(selected).toBe('expensive-harness');
    });

    it('returns undefined when no suitable harness found', () => {
      const task = { taskKey: 'review-1', taskClass: 'review' as const, riskLevel: 'low' as const };
      const harnessesWithNoReview = [
        { name: 'expensive-harness', costWeight: 1.0, supportedTaskClasses: ['feature', 'bug'] as const },
        { name: 'cheap-harness', costWeight: 0.3, supportedTaskClasses: ['feature', 'bug', 'chore'] as const },
      ];
      const budget = { spent: 100, cap: 1000, policy: 'soft' as const };
      const selected = selectHarnessByEconomics(task, harnessesWithNoReview, budget);
      expect(selected).toBeUndefined();
    });

    it('selects cheapest available when budget is very tight', () => {
      const task = { taskKey: 'feature-1', taskClass: 'feature' as const, riskLevel: 'low' as const };
      const budget = { spent: 999, cap: 1000, policy: 'soft' as const };
      const selected = selectHarnessByEconomics(task, harnesses, budget);
      expect(selected).toBe('cheap-harness');
    });
  });

  describe('requiredReviewDepth', () => {
    it('returns lightweight for low-risk low-cost tasks', () => {
      const result = requiredReviewDepth('low', 'low');
      expect(result).toBe('lightweight');
    });

    it('returns multi_agent for high-risk high-cost tasks', () => {
      const result = requiredReviewDepth('high', 'high');
      expect(result).toBe('multi_agent');
    });

    it('returns standard for medium combinations', () => {
      const result = requiredReviewDepth('medium', 'medium');
      expect(result).toBe('standard');
    });

    it('escalates review depth based on cost', () => {
      const lowRiskHighCost = requiredReviewDepth('low', 'high');
      const lowRiskLowCost = requiredReviewDepth('low', 'low');
      const depthOrder = { lightweight: 1, standard: 2, multi_agent: 3 };
      expect(depthOrder[lowRiskHighCost]).toBeGreaterThan(depthOrder[lowRiskLowCost]);
    });
  });
});

describe('budget utilities', () => {
  describe('isBudgetBreached', () => {
    it('returns false when spent < cap', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 300,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(false);
    });

    it('returns true when spent >= cap for strict policy', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 1000,
        policy: 'strict',
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(true);
    });

    it('returns true when spent > cap for soft policy', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 1001,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(true);
    });

    it('returns true only when over cap for advisory policy', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 1000,
        policy: 'advisory',
        updatedAt: Date.now(),
      };
      expect(isBudgetBreached(budget)).toBe(false);
      const overBudget = { ...budget, spent: 1001 };
      expect(isBudgetBreached(overBudget)).toBe(true);
    });
  });

  describe('computeRemainingBudget', () => {
    it('returns cap - spent', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 300,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      expect(computeRemainingBudget(budget)).toBe(700);
    });

    it('returns negative when over budget', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 1200,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      expect(computeRemainingBudget(budget)).toBe(-200);
    });
  });

  describe('computeSpendRate', () => {
    it('returns spend per day within period', () => {
      const now = Date.now();
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: now - 86400000 * 2,
        periodEnd: now,
        cap: 1000,
        spent: 200,
        policy: 'soft',
        updatedAt: now,
      };
      const rate = computeSpendRate(budget, now);
      expect(rate).toBe(100);
    });

    it('returns 0 when period has not started', () => {
      const now = Date.now();
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: now + 86400000,
        periodEnd: now + 86400000 * 2,
        cap: 1000,
        spent: 0,
        policy: 'soft',
        updatedAt: now,
      };
      const rate = computeSpendRate(budget, now);
      expect(rate).toBe(0);
    });
  });

  describe('isWithinPeriod', () => {
    it('returns true when now is within period', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() - 86400000,
        periodEnd: Date.now() + 86400000,
        cap: 1000,
        spent: 0,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      expect(isWithinPeriod(budget)).toBe(true);
    });

    it('returns false when before period', () => {
      const budget: BudgetEntry = {
        scope: 'global',
        periodStart: Date.now() + 86400000,
        periodEnd: Date.now() + 86400000 * 2,
        cap: 1000,
        spent: 0,
        policy: 'soft',
        updatedAt: Date.now(),
      };
      expect(isWithinPeriod(budget)).toBe(false);
    });
  });

  describe('validateBudgetScope', () => {
    it('accepts global scope', () => {
      expect(validateBudgetScope('global')).toBe(true);
    });

    it('accepts project scope', () => {
      expect(validateBudgetScope('project:my-project')).toBe(true);
    });

    it('accepts sprint scope', () => {
      expect(validateBudgetScope('sprint:sprint-42')).toBe(true);
    });

    it('rejects invalid scope', () => {
      expect(validateBudgetScope('invalid')).toBe(false);
      expect(validateBudgetScope('project:')).toBe(false);
      expect(validateBudgetScope(':name')).toBe(false);
    });
  });
});
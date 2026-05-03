import { describe, expect, it } from 'bun:test';
import {
  isBudgetBreached,
  computeRemainingBudget,
  computeSpendRate,
  isWithinPeriod,
  checkBudgetAllowance,
  checkBudgetThreshold,
  computeMaxRetryCostExposure,
  resetBudgetPeriod,
  type BudgetEntry,
} from './budget';

function makeBudget(overrides: Partial<BudgetEntry> = {}): BudgetEntry {
  return {
    scope: 'project:test',
    periodStart: Date.now() - 86400000,
    periodEnd: Date.now() + 86400000,
    cap: 100,
    spent: 50,
    policy: 'strict',
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('isBudgetBreached', () => {
  it('returns true when strict budget is at cap', () => {
    expect(isBudgetBreached(makeBudget({ policy: 'strict', spent: 100, cap: 100 }))).toBe(true);
  });

  it('returns false when strict budget is below cap', () => {
    expect(isBudgetBreached(makeBudget({ policy: 'strict', spent: 99, cap: 100 }))).toBe(false);
  });

  it('returns true when soft budget exceeds cap', () => {
    expect(isBudgetBreached(makeBudget({ policy: 'soft', spent: 101, cap: 100 }))).toBe(true);
  });

  it('returns true when soft budget is at cap', () => {
    expect(isBudgetBreached(makeBudget({ policy: 'soft', spent: 100, cap: 100 }))).toBe(true);
  });

  it('returns true when advisory budget exceeds cap', () => {
    expect(isBudgetBreached(makeBudget({ policy: 'advisory', spent: 101, cap: 100 }))).toBe(true);
  });
});

describe('computeRemainingBudget', () => {
  it('returns positive remaining', () => {
    expect(computeRemainingBudget(makeBudget({ spent: 30, cap: 100 }))).toBe(70);
  });

  it('returns negative when over budget', () => {
    expect(computeRemainingBudget(makeBudget({ spent: 110, cap: 100 }))).toBe(-10);
  });
});

describe('computeSpendRate', () => {
  it('returns 0 if before period start', () => {
    const budget = makeBudget({ periodStart: Date.now() + 10000, spent: 50 });
    expect(computeSpendRate(budget)).toBe(0);
  });

  it('calculates daily spend rate', () => {
    const DAY = 86400000;
    const now = Date.now();
    const budget = makeBudget({ periodStart: now - DAY, periodEnd: now + DAY, spent: 100 });
    const rate = computeSpendRate(budget, now);
    expect(rate).toBeCloseTo(100, 0);
  });
});

describe('isWithinPeriod', () => {
  it('returns true when now is within period', () => {
    expect(isWithinPeriod(makeBudget())).toBe(true);
  });

  it('returns false when now is after period end', () => {
    expect(isWithinPeriod(makeBudget({ periodEnd: Date.now() - 1000 }))).toBe(false);
  });
});

describe('checkBudgetAllowance', () => {
  it('allows dispatch when within budget', () => {
    const result = checkBudgetAllowance(makeBudget({ spent: 50, cap: 100 }), 0.01);
    expect(result.allowed).toBe(true);
  });

  it('blocks strict budget when over cap', () => {
    const result = checkBudgetAllowance(makeBudget({ policy: 'strict', spent: 100, cap: 100 }), 0.01);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.policy).toBe('strict');
    }
  });

  it('blocks soft budget when over cap', () => {
    const result = checkBudgetAllowance(makeBudget({ policy: 'soft', spent: 100, cap: 100 }), 0.01);
    expect(result.allowed).toBe(false);
  });

  it('allows advisory budget when over cap', () => {
    const result = checkBudgetAllowance(makeBudget({ policy: 'advisory', spent: 100, cap: 100 }), 0.01);
    expect(result.allowed).toBe(true);
  });

  it('allows dispatch outside budget period', () => {
    const result = checkBudgetAllowance(
      makeBudget({ periodEnd: Date.now() - 10000, policy: 'strict', spent: 200, cap: 100 }),
      0.01,
    );
    expect(result.allowed).toBe(true);
  });
});

describe('checkBudgetThreshold', () => {
  it('returns breached at 80% default threshold', () => {
    const { breached, utilization } = checkBudgetThreshold(makeBudget({ spent: 80, cap: 100 }));
    expect(breached).toBe(true);
    expect(utilization).toBeCloseTo(0.8);
  });

  it('returns not breached below threshold', () => {
    const { breached } = checkBudgetThreshold(makeBudget({ spent: 79, cap: 100 }));
    expect(breached).toBe(false);
  });

  it('supports custom threshold', () => {
    const { breached } = checkBudgetThreshold(makeBudget({ spent: 95, cap: 100 }), 0.9);
    expect(breached).toBe(true);
  });

  it('handles zero cap', () => {
    const { breached, utilization } = checkBudgetThreshold(makeBudget({ cap: 0 }));
    expect(breached).toBe(false);
    expect(utilization).toBe(0);
  });
});

describe('computeMaxRetryCostExposure', () => {
  it('computes cost from retry config', () => {
    const exposure = computeMaxRetryCostExposure(3, 60000, 10);
    expect(exposure).toBeCloseTo(0.5, 2);
  });

  it('returns 0 for no retries', () => {
    expect(computeMaxRetryCostExposure(0, 60000, 10)).toBe(0);
  });
});

describe('resetBudgetPeriod', () => {
  it('resets daily period', () => {
    const now = Date.now();
    const result = resetBudgetPeriod(makeBudget(), 'daily', now);
    expect(result.periodStart).toBe(now);
    expect(result.periodEnd).toBe(now + 86400000);
    expect(result.spent).toBe(0);
  });

  it('resets monthly period to first of month', () => {
    const now = new Date('2026-05-15T12:00:00Z').getTime();
    const result = resetBudgetPeriod(makeBudget(), 'monthly', now);
    expect(result.spent).toBe(0);
    const startMonth = new Date(result.periodStart).getMonth();
    const endMonth = new Date(result.periodEnd).getMonth();
    expect(startMonth).toBe(4); // May
    expect(endMonth).toBe(5); // June
  });
});

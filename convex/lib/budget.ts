export type BudgetPolicy = 'strict' | 'soft' | 'advisory';

export interface BudgetEntry {
  scope: string;
  periodStart: number;
  periodEnd: number;
  cap: number;
  spent: number;
  policy: BudgetPolicy;
  updatedAt: number;
}

export function isBudgetBreached(budget: BudgetEntry): boolean {
  if (budget.policy === 'strict') {
    return budget.spent >= budget.cap;
  }
  if (budget.policy === 'advisory') {
    return budget.spent > budget.cap;
  }
  return budget.spent >= budget.cap;
}

export function computeRemainingBudget(budget: BudgetEntry): number {
  return budget.cap - budget.spent;
}

export function computeSpendRate(budget: BudgetEntry, now: number = Date.now()): number {
  if (now < budget.periodStart) {
    return 0;
  }
  const effectiveEnd = Math.min(now, budget.periodEnd);
  const elapsed = effectiveEnd - budget.periodStart;
  if (elapsed <= 0) {
    return 0;
  }
  const days = elapsed / (24 * 60 * 60 * 1000);
  return budget.spent / days;
}

export function isWithinPeriod(budget: BudgetEntry, now: number = Date.now()): boolean {
  return now >= budget.periodStart && now <= budget.periodEnd;
}

export function validateBudgetScope(scope: string): boolean {
  if (scope === 'global') {
    return true;
  }
  const parts = scope.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [type, name] = parts;
  return (type === 'project' || type === 'sprint') && name.length > 0;
}

export type BudgetCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; policy: BudgetPolicy; spent: number; cap: number };

export function checkBudgetAllowance(budget: BudgetEntry, estimatedCost: number): BudgetCheckResult {
  if (!isWithinPeriod(budget)) {
    return { allowed: true };
  }

  const projectedSpend = budget.spent + estimatedCost;

  if (budget.policy === 'strict' && projectedSpend > budget.cap) {
    return {
      allowed: false,
      reason: `Hard budget cap exceeded: projected $${projectedSpend.toFixed(4)} > $${budget.cap.toFixed(4)}`,
      policy: budget.policy,
      spent: budget.spent,
      cap: budget.cap,
    };
  }

  if (budget.policy === 'soft' && projectedSpend > budget.cap) {
    return {
      allowed: false,
      reason: `Soft budget limit reached: projected $${projectedSpend.toFixed(4)} > $${budget.cap.toFixed(4)}`,
      policy: budget.policy,
      spent: budget.spent,
      cap: budget.cap,
    };
  }

  return { allowed: true };
}

export function checkBudgetThreshold(
  budget: BudgetEntry,
  threshold: number = 0.8,
): { breached: boolean; utilization: number } {
  if (budget.cap <= 0) {
    return { breached: false, utilization: 0 };
  }
  const utilization = budget.spent / budget.cap;
  return { breached: utilization >= threshold, utilization };
}

export function computeMaxRetryCostExposure(
  maxRetries: number,
  maxDelayMs: number,
  hourlyRate: number,
): number {
  const totalDelayHours = (maxRetries * maxDelayMs) / (1000 * 60 * 60);
  return totalDelayHours * hourlyRate;
}

export function resetBudgetPeriod(
  budget: BudgetEntry,
  periodType: 'daily' | 'weekly' | 'monthly',
  now: number = Date.now(),
): { periodStart: number; periodEnd: number; spent: number } {
  const DAY = 86400000;

  switch (periodType) {
    case 'daily':
      return {
        periodStart: now,
        periodEnd: now + DAY,
        spent: 0,
      };
    case 'weekly': {
      const dayOfWeek = new Date(now).getDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const periodStart = now - daysSinceMonday * DAY;
      return {
        periodStart,
        periodEnd: periodStart + 7 * DAY,
        spent: 0,
      };
    }
    case 'monthly': {
      const d = new Date(now);
      const periodStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return { periodStart, periodEnd, spent: 0 };
    }
  }
}

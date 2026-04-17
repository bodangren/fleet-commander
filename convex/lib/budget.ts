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

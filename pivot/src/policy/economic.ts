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

export type RecoveryAction = 'retry' | 'escalate' | 'split' | 'replan' | 'human_review';

export type ReviewDepth = 'lightweight' | 'standard' | 'multi_agent';

export type TaskClass = 'feature' | 'bug' | 'chore' | 'review';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface HarnessCandidate {
  name: string;
  costWeight: number;
  supportedTaskClasses: readonly TaskClass[];
}

export interface TaskContext {
  taskKey: string;
  taskClass: TaskClass;
  riskLevel: RiskLevel;
}

export function applyBudgetPenalty(
  baseScore: number,
  budget: BudgetEntry,
  taskExpectedCost: number,
): number {
  const remaining = computeRemainingBudget(budget);
  if (remaining <= 0) {
    return 0;
  }

  if (budget.policy === 'strict' && remaining < taskExpectedCost) {
    return 0;
  }

  const utilizationRatio = budget.spent / budget.cap;
  const penaltyMultiplier = Math.max(0, 1 - utilizationRatio);

  const costPenalty = taskExpectedCost > 0 ? taskExpectedCost / 1000 : 0;
  const finalScore = baseScore * penaltyMultiplier * (1 - costPenalty * 0.5);

  return Math.max(0, Math.round(finalScore * 100) / 100);
}

const MAX_RETRIES = 3;

export function shouldEscalateRetry(
  history: Array<{ taskId: string; action: string }>,
  taskId: string,
  budget: { spent: number; cap: number; policy: BudgetPolicy },
): RecoveryAction {
  const taskHistory = history.filter((h) => h.taskId === taskId && h.action === 'retry');
  const retryCount = taskHistory.length;

  if (retryCount >= MAX_RETRIES) {
    return 'escalate';
  }

  if (budget.policy === 'strict' && budget.spent >= budget.cap) {
    return 'escalate';
  }

  return 'retry';
}

export function selectHarnessByEconomics(
  task: TaskContext,
  harnesses: HarnessCandidate[],
  budget: { spent: number; cap: number; policy: BudgetPolicy },
): string | undefined {
  const remaining = budget.cap - budget.spent;
  const available = harnesses.filter((h) =>
    h.supportedTaskClasses.includes(task.taskClass),
  );

  if (available.length === 0) {
    return undefined;
  }

  if (task.riskLevel === 'high') {
    const sorted = [...available].sort((a, b) => b.costWeight - a.costWeight);
    return sorted[0]?.name;
  }

  const utilizationRatio = budget.spent / budget.cap;

  if (utilizationRatio > 0.8 || remaining < 100) {
    const cheapest = [...available].sort((a, b) => a.costWeight - b.costWeight);
    return cheapest[0]?.name;
  }

  const midTier = available.find((h) => h.costWeight <= 0.7);
  return midTier?.name ?? available[0]?.name;
}

const REVIEW_DEPTH_MAP: Record<string, ReviewDepth> = {
  'low:low': 'lightweight',
  'low:medium': 'lightweight',
  'low:high': 'standard',
  'medium:low': 'lightweight',
  'medium:medium': 'standard',
  'medium:high': 'multi_agent',
  'high:low': 'standard',
  'high:medium': 'multi_agent',
  'high:high': 'multi_agent',
};

export function requiredReviewDepth(riskLevel: RiskLevel, costLevel: RiskLevel): ReviewDepth {
  const key = `${riskLevel}:${costLevel}`;
  return REVIEW_DEPTH_MAP[key] ?? 'standard';
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

export function deriveCostLevel(expectedCost: number): RiskLevel {
  if (expectedCost < 0.3) return 'low';
  if (expectedCost < 0.7) return 'medium';
  return 'high';
}

export function deriveRiskLevel(taskClass: TaskClass): RiskLevel {
  switch (taskClass) {
    case 'bug':
      return 'high';
    case 'feature':
      return 'medium';
    case 'chore':
    case 'review':
      return 'low';
  }
}
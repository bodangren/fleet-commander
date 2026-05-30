import type { BudgetPolicy, BudgetEntry } from '../../../convex/lib/budget.js';
import {
  isBudgetBreached,
  computeRemainingBudget,
  computeSpendRate,
  isWithinPeriod,
  validateBudgetScope,
} from '../../../convex/lib/budget.js';

export type { BudgetPolicy, BudgetEntry };
export {
  isBudgetBreached,
  computeRemainingBudget,
  computeSpendRate,
  isWithinPeriod,
  validateBudgetScope,
};

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

/**
 * Applies budget utilization penalty to score.
 * @param baseScore - Base score before penalty
 * @param budget - Budget entry
 * @param taskExpectedCost - Expected cost of task
 * @returns Penalized score
 */
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

/**
 * Determines retry escalation based on history and budget.
 * @param history - Task action history
 * @param taskId - Task identifier
 * @param budget - Budget with spent, cap, and policy
 * @returns Recommended recovery action
 */
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

/**
 * Selects harness based on economics and risk level.
 * @param task - Task context with class and risk level
 * @param harnesses - Available harness candidates
 * @param budget - Budget with spent and cap
 * @returns Selected harness name or undefined
 */
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

/**
 * Returns required review depth from risk/cost levels.
 * @param riskLevel - Risk level of the task
 * @param costLevel - Cost level derived from expected cost
 * @returns Required review depth
 */
export function requiredReviewDepth(riskLevel: RiskLevel, costLevel: RiskLevel): ReviewDepth {
  const key = `${riskLevel}:${costLevel}`;
  return REVIEW_DEPTH_MAP[key] ?? 'standard';
}

/**
 * Infers cost level (low/medium/high) from expected cost number.
 * @param expectedCost - Expected cost as a ratio (0-1 range)
 * @returns Cost level classification
 */
export function deriveCostLevel(expectedCost: number): RiskLevel {
  if (expectedCost < 0.3) return 'low';
  if (expectedCost < 0.7) return 'medium';
  return 'high';
}

/**
 * Derives risk level from task class (bug=high, feature=medium, chore/review=low).
 * @param taskClass - Task class
 * @returns Risk level classification
 */
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
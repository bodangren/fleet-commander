import type { Task } from '../orchestrator/types';
import type { DispatchPolicyStatsInput, HarnessReliabilityStatsInput } from './statsClient';
import { deriveTaskKind, deriveRepoType } from './rollup';
import type { AllocationPolicy } from './allocator';

/**
 * Return priority multiplier (0.5-3x) based on task status and structured priority tag
 * @param task - Task to evaluate
 * @returns Priority multiplier: 0.5 for blocked, 0.5 for low, 1 for normal, 2 for high, 3 for critical
 */
export function priorityWeight(task: Task): number {
  if (task.status === 'blocked') {
    return 0.5;
  }

  // Check structured #priority tag first
  const tagPriority = task.tags?.priority;
  if (tagPriority) {
    switch (tagPriority) {
      case 'critical':
        return 3;
      case 'high':
        return 2;
      case 'low':
        return 0.5;
      default:
        return 1;
    }
  }

  // Legacy: check title/assignee for priority:high string
  if (
    task.title.includes('priority:high') ||
    (task.assignee?.includes('priority:high') ?? false)
  ) {
    return 2;
  }
  return 1;
}

/**
 * Returns count of tasks that depend on this task (unblock impact)
 * @param task - Task to check dependencies for
 * @param allTasks - All tasks to search through
 * @returns Number of tasks that have this task as a dependency
 */
export function unblockImpact(task: Task, allTasks: Task[]): number {
  let count = 0;
  for (const t of allTasks) {
    if (t.taskKey !== task.taskKey && t.dependencies.includes(task.taskKey)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculate fitness score (1 minus review fail rate) for persona/taskKind/repoType bucket
 * @param persona - Persona type (architect, executor, reviewer, recovery)
 * @param taskKind - Task kind (bug, chore, feature, review)
 * @param repoType - Repo type (monorepo, multirepo, default)
 * @param policyStats - Array of dispatch policy statistics to search
 * @returns Fitness score (1 - reviewFailRate), or 0.5 if bucket not found or insufficient data
 */
export function personaFitness(
  persona: string,
  taskKind: string,
  repoType: string,
  policyStats: DispatchPolicyStatsInput[],
): number {
  const bucket = policyStats.find(
    (s) => s.persona === persona && s.taskKind === taskKind && s.repoType === repoType,
  );
  if (!bucket || bucket.insufficientData) {
    return 0.5;
  }
  return 1 - bucket.reviewFailRate;
}

/**
 * Return 7-day success rate for a given harness from reliability stats
 * @param harnessName - Name of the harness to look up
 * @param harnessStats - Array of harness reliability statistics to search
 * @returns Success rate (0-1), or 0.5 if harness not found
 */
export function harnessReliability(
  harnessName: string,
  harnessStats: HarnessReliabilityStatsInput[],
): number {
  const bucket = harnessStats.find((s) => s.harnessName === harnessName);
  if (!bucket) {
    return 0.5;
  }
  return bucket.successRate7d;
}

/**
 * Estimate task cost (1 minus p50 confidence) for a persona/taskKind/repoType bucket
 * @param persona - Persona type (architect, executor, reviewer, recovery)
 * @param taskKind - Task kind (bug, chore, feature, review)
 * @param repoType - Repo type (monorepo, multirepo, default)
 * @param policyStats - Array of dispatch policy statistics to search
 * @returns Cost efficiency score (1 - p50Cost), or 0.5 if bucket not found or insufficient data
 */
export function expectedCost(
  persona: string,
  taskKind: string,
  repoType: string,
  policyStats: DispatchPolicyStatsInput[],
): number {
  const bucket = policyStats.find(
    (s) => s.persona === persona && s.taskKind === taskKind && s.repoType === repoType,
  );
  if (!bucket || bucket.insufficientData) {
    return 0.5;
  }
  return 1 - bucket.p50Cost;
}

/**
 * Return starvation bonus (0-1) based on how long since task was last dispatched
 * @param task - Task to evaluate
 * @param now - Current timestamp
 * @returns Bonus multiplier: 0 if task was dispatched within 1 day, otherwise up to 1 based on age
 */
export function starvationBonus(task: Task, now: number): number {
  const lastAttempt = task.lastDispatchAttemptAt ?? task.updatedAt;
  const ageMs = now - lastAttempt;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = ageMs / dayMs;
  if (days <= 1) {
    return 0;
  }
  return Math.min(days * 0.1, 1);
}

/**
 * Return coverage regression rate for persona/taskKind/repoType bucket or 0 if insufficient data
 * @param persona - Persona type (architect, executor, reviewer, recovery)
 * @param taskKind - Task kind (bug, chore, feature, review)
 * @param repoType - Repo type (monorepo, multirepo, default)
 * @param policyStats - Array of dispatch policy statistics to search
 * @returns Coverage regression rate, or 0 if bucket not found or insufficient data
 */
export function regressionRisk(
  persona: string,
  taskKind: string,
  repoType: string,
  policyStats: DispatchPolicyStatsInput[],
): number {
  const bucket = policyStats.find(
    (s) => s.persona === persona && s.taskKind === taskKind && s.repoType === repoType,
  );
  if (!bucket || bucket.insufficientData) {
    return 0;
  }
  return bucket.coverageRegressionRate ?? 0;
}

/**
 * Return fatigue penalty (0.1 per retry) based on task retry count
 * @param task - Task to evaluate
 * @returns Fatigue penalty (retryCount * 0.1)
 */
export function retryFatigue(task: Task): number {
  const retries = task.retryCount ?? 0;
  return retries * 0.1;
}

/**
 * Check if task kind matches a pattern (supports wildcard *)
 * @param taskKind - Task kind to check
 * @param pattern - Pattern to match against (e.g., "bug:*" or "*")
 * @returns True if taskKind matches the pattern
 */
function taskKindMatchesPattern(taskKind: string, pattern: string): boolean {
  const [typePattern] = pattern.split(':');
  return typePattern === '*' || typePattern === taskKind;
}

/**
 * Calculate affinity score based on task kind pattern matching and harness preference rules
 * @param task - Task to evaluate
 * @param harnessName - Harness name to check affinity for
 * @param policy - Allocation policy containing affinity rules
 * @returns 1 if task matches an affinity rule for the harness, 0 otherwise
 */
export function affinityScore(task: Task, harnessName: string, policy: AllocationPolicy): number {
  const taskKind = deriveTaskKind(task.taskKey);
  for (const rule of policy.affinity) {
    if (taskKindMatchesPattern(taskKind, rule.ifTask) && harnessName === rule.preferHarness) {
      return 1;
    }
  }
  return 0;
}

export interface ScoreWeights {
  priorityWeight: number;
  unblockImpact: number;
  personaFitness: number;
  harnessReliability: number;
  expectedCost: number;
  starvationBonus: number;
  regressionRisk: number;
  retryFatigue: number;
  affinity: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  priorityWeight: 1,
  unblockImpact: 0.5,
  personaFitness: 1,
  harnessReliability: 1,
  expectedCost: 0.5,
  starvationBonus: 0.3,
  regressionRisk: -1,
  retryFatigue: -0.5,
  affinity: 0.5,
};

export interface ScoreCandidateContext {
  now?: number;
  allTasks?: Task[];
  persona?: string;
  weights?: Partial<ScoreWeights>;
  allocationPolicy?: AllocationPolicy;
}

export interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
}

/**
 * Compute weighted aggregate score for task-harness assignment using policy stats and weights
 * @param task - Task to score
 * @param harness - Harness candidate with name property
 * @param policyStats - Array of dispatch policy statistics
 * @param harnessStats - Array of harness reliability statistics
 * @param context - Scoring context with optional weights, allTasks, now, allocationPolicy
 * @returns ScoreResult with total score and breakdown of individual component scores
 */
export function scoreCandidate(
  task: Task,
  harness: { name: string },
  policyStats: DispatchPolicyStatsInput[],
  harnessStats: HarnessReliabilityStatsInput[],
  context: ScoreCandidateContext = {},
): ScoreResult {
  const now = context.now ?? Date.now();
  const allTasks = context.allTasks ?? [];
  const persona = context.persona ?? 'executor';
  const weights = { ...DEFAULT_WEIGHTS, ...context.weights };

  const taskKind = deriveTaskKind(task.taskKey);
  const repoType = deriveRepoType(task.projectSlug);

  const breakdown: Record<string, number> = {
    priorityWeight: priorityWeight(task),
    unblockImpact: unblockImpact(task, allTasks),
    personaFitness: personaFitness(persona, taskKind, repoType, policyStats),
    harnessReliability: harnessReliability(harness.name, harnessStats),
    expectedCost: expectedCost(persona, taskKind, repoType, policyStats),
    starvationBonus: starvationBonus(task, now),
    regressionRisk: regressionRisk(persona, taskKind, repoType, policyStats),
    retryFatigue: retryFatigue(task),
  };

  if (context.allocationPolicy) {
    breakdown.affinity = affinityScore(task, harness.name, context.allocationPolicy);
  } else {
    breakdown.affinity = 0;
  }

  let score = 0;
  for (const [key, value] of Object.entries(breakdown)) {
    score += value * (weights[key as keyof ScoreWeights] ?? 0);
  }

  return { score, breakdown };
}

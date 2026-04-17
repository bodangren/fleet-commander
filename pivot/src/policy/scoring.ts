import type { Task } from '../orchestrator/types';
import type { DispatchPolicyStatsInput, HarnessReliabilityStatsInput } from './statsClient';
import { deriveTaskKind, deriveRepoType } from './rollup';
import type { AllocationPolicy } from './allocator';

export function priorityWeight(task: Task): number {
  if (task.status === 'blocked') {
    return 0.5;
  }
  if (
    task.title.includes('priority:high') ||
    (task.assignee?.includes('priority:high') ?? false)
  ) {
    return 2;
  }
  return 1;
}

export function unblockImpact(task: Task, allTasks: Task[]): number {
  let count = 0;
  for (const t of allTasks) {
    if (t.taskKey !== task.taskKey && t.dependencies.includes(task.taskKey)) {
      count++;
    }
  }
  return count;
}

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

export function starvationBonus(task: Task, now: number): number {
  const ageMs = now - task.updatedAt;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = ageMs / dayMs;
  if (days <= 1) {
    return 0;
  }
  return Math.min(days * 0.1, 1);
}

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
  return bucket.coverageRegressionRate;
}

export function retryFatigue(task: Task): number {
  const retries = task.retryCount ?? 0;
  return retries * 0.1;
}

function taskKindMatchesPattern(taskKind: string, pattern: string): boolean {
  const [typePattern] = pattern.split(':');
  return typePattern === '*' || typePattern === taskKind;
}

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

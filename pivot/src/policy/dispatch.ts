import type { Task } from '../orchestrator/types';
import type { DispatchPolicyStatsInput, HarnessReliabilityStatsInput } from './statsClient';
import { scoreCandidate, type ScoreWeights } from './scoring';
import type { AllocationPolicy } from './allocator';

export interface SelectBestCandidateOptions {
  epsilon?: number;
  now?: number;
  persona?: string;
  weights?: Partial<ScoreWeights>;
  allocationPolicy?: AllocationPolicy;
}

export interface SelectedCandidate {
  task: Task;
  trackId: string;
  score: number;
  breakdown: Record<string, number>;
  justification: string;
  llmTieBreak: boolean;
}

export async function selectBestCandidate(
  eligibleTasks: Task[],
  harness: { name: string },
  policyStats: DispatchPolicyStatsInput[],
  harnessStats: HarnessReliabilityStatsInput[],
  options: SelectBestCandidateOptions = {},
): Promise<SelectedCandidate | null> {
  if (eligibleTasks.length === 0) {
    return null;
  }

  const scored = eligibleTasks.map((task) => ({
    task,
    ...scoreCandidate(task, harness, policyStats, harnessStats, {
      now: options.now,
      allTasks: eligibleTasks,
      persona: options.persona,
      weights: options.weights,
      allocationPolicy: options.allocationPolicy,
    }),
  }));

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const runnerUp = scored[1];
  const epsilon = options.epsilon ?? 0.1;
  const llmTieBreak =
    runnerUp !== undefined && Math.abs(top.score - runnerUp.score) < epsilon;

  const justification = llmTieBreak
    ? `Top tie between ${top.task.taskKey} and ${runnerUp.task.taskKey} (gap ${(top.score - runnerUp.score).toFixed(3)})`
    : `Highest score ${top.score.toFixed(3)} for ${top.task.taskKey}`;

  return {
    task: top.task,
    trackId: top.task.trackId,
    score: top.score,
    breakdown: top.breakdown,
    justification,
    llmTieBreak,
  };
}

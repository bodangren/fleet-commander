import { ConvexHttpClient } from 'convex/browser';
import { createScoreAudit } from '../../policy/policyClient';
import { scoreCandidates } from './scoreCandidates';
import { logAndCaptureError } from '../logger';
import type { Task } from '../types';

/**
 * Result of the candidate selection stage.
 */
export interface CandidateSelection {
  task: Task;
  score: number;
  justification: string;
  breakdown: Record<string, number>;
  llmTieBreak: boolean;
  trackId: string;
}

/**
 * Scores eligible candidates and persists a score audit record.
 * Returns null when no task is selected.
 *
 * @param client - Convex HTTP client
 * @param projectSlug - project identifier
 * @param eligibleTasks - tasks that passed constraint filtering
 * @param trackStatuses - track status map for legacy evaluator fallback
 */
export async function selectCandidate(
  client: ConvexHttpClient,
  projectSlug: string,
  eligibleTasks: Task[],
  trackStatuses: Map<string, string>,
): Promise<CandidateSelection | null> {
  const selected = await scoreCandidates(
    client,
    projectSlug,
    eligibleTasks,
    trackStatuses,
  );

  if (!selected) {
    return null;
  }

  try {
    await createScoreAudit(client, {
      chosenTaskId: selected.task.taskKey,
      candidatesJson: JSON.stringify(eligibleTasks.map((c) => c.taskKey)),
      breakdownJson: JSON.stringify(selected.breakdown),
      justification: selected.justification,
      weightsVersion: 1,
      llmTieBreak: selected.llmTieBreak,
    });
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Score audit persistence failed',
      { projectSlug, taskKey: selected.task.taskKey, operation: 'persistScoreAudit' },
      err,
    );
  }

  return {
    task: selected.task,
    score: selected.score,
    justification: selected.justification,
    breakdown: selected.breakdown as Record<string, number>,
    llmTieBreak: selected.llmTieBreak,
    trackId: selected.trackId,
  };
}

/**
 * Pure function that determines the post-execution task status transition.
 *
 * This captures the decision logic currently inlined in `runProject` so it
 * can be tested in isolation and reused when the orchestrator shell is thinned.
 *
 * The function is intentionally narrow: it answers "given the execution
 * outcome, what status should the task move to?" Pre-dispatch transitions
 * (todo→in_progress) and dependency-based reconciliation (ready↔blocked)
 * are handled elsewhere.
 */

import type { TaskStatus } from '../types';

/**
 * Inputs for the status-transition decision.
 */
export interface TransitionInput {
  /** Whether the execution succeeded. */
  succeeded: boolean;
  /** Whether all retry attempts have been exhausted. */
  retriesExhausted: boolean;
  /** Whether a coverage threshold was violated (if applicable). */
  coverageViolated?: boolean;
  /** Whether the task requires human review before merging. */
  reviewRequired?: boolean;
}

/**
 * Result of the transition decision.
 */
export interface TransitionDecision {
  /** The new status the task should move to, or null if no change. */
  nextStatus: TaskStatus | null;
  /** Human-readable reason for the transition (for logging). */
  reason: string;
}

/**
 * Determines the post-execution task status transition.
 *
 * @param input - Execution outcome details
 * @returns The recommended status transition and reason
 */
export function resolvePostExecutionStatus(
  input: TransitionInput,
): TransitionDecision {
  if (input.coverageViolated) {
    return { nextStatus: 'blocked', reason: 'Coverage threshold violated' };
  }

  if (input.succeeded) {
    if (input.reviewRequired) {
      return { nextStatus: 'for_review', reason: 'Execution succeeded, awaiting review' };
    }
    return { nextStatus: 'done', reason: 'Execution succeeded' };
  }

  if (input.retriesExhausted) {
    return { nextStatus: 'blocked', reason: 'All retry attempts exhausted' };
  }

  return { nextStatus: null, reason: 'Retrying' };
}

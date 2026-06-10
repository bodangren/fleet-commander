import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import type { Task } from '../types';
import { logAndCaptureError } from '../logger';
import { reconcileBudgetOnComplete } from './budgetReservation';
import type { PipelineRunLifecycle } from './pipelineRunLifecycle';
import { updateTaskStatus as stageUpdateTaskStatus } from './updateTaskStatus';

export interface ClaimForExecutionResult {
  /** True if the task is now owned by this runner and execution may proceed. */
  claimed: boolean;
  /** When `claimed` is false, a human-readable reason suitable for RunResult.error. */
  error?: string;
}

export interface ClaimForExecutionDeps {
  walAdapter: {
    append: (entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => { id: string; commit: () => void } | { id: string };
    commit: (id: string) => void;
  };
}

/**
 * Atomically claims the task for execution.
 *
 * On a structured `{ claimed: false }` response from `tasks.claimTaskForExecution`,
 * releases the budget reservation, logs the rejection, and returns `{ claimed: false }`
 * so the caller can short-circuit. When the mutation is unreachable or returns
 * unstructured data (mocked endpoints, legacy harnesses, Convex offline), falls
 * back to the legacy non-atomic `updateTaskStatus('in_progress')` write so
 * dispatch is not blocked.
 *
 * @param client - Convex HTTP client used for the claim + reconcile calls.
 * @param projectSlug - Project that owns the task.
 * @param task - Task being claimed (mutated in place: `status` is set to
 *   `'in_progress'` on a successful claim).
 * @param runId - Stable identifier for the current orchestrator cycle.
 * @param reservationId - Budget reservation to release on a lost claim.
 * @param lifecycle - Pipeline lifecycle used to append a "could not be claimed" log
 *   entry when the row is owned by another runner.
 * @param deps - Injected adapters (WAL) so the helper stays test-friendly.
 * @returns `{ claimed: true }` to proceed with execution or `{ claimed: false, error }`
 *   to short-circuit the dispatch.
 */
export async function claimTaskForExecution(
  client: ConvexHttpClient,
  projectSlug: string,
  task: Task,
  runId: string,
  reservationId: string,
  lifecycle: PipelineRunLifecycle,
  deps: ClaimForExecutionDeps,
): Promise<ClaimForExecutionResult> {
  let claim: { claimed?: boolean; currentStatus?: string; reason?: string } | undefined;
  try {
    claim = (await client.mutation(api.tasks.claimTaskForExecution, {
      projectSlug,
      trackId: task.trackId,
      taskKey: task.taskKey,
      expectedStatus: 'ready',
      runId,
    })) as { claimed: boolean; currentStatus?: string; reason?: string } | undefined;
  } catch (err) {
    claim = undefined;
    await logAndCaptureError(
      client,
      'debug',
      'claimTaskForExecution failed; falling back to non-atomic status update',
      { projectSlug, taskKey: task.taskKey, operation: 'claimTaskForExecution' },
      err,
    );
  }

  if (claim && typeof claim.claimed === 'boolean') {
    if (!claim.claimed) {
      await reconcileBudgetOnComplete(client, projectSlug, reservationId, 0);
      await lifecycle.appendLog(
        'failed',
        `Task ${task.taskKey} could not be claimed (current status: ${claim.currentStatus ?? 'unknown'})`,
        undefined,
        task.trackId,
      );
      return {
        claimed: false,
        error: `Task ${task.taskKey} already claimed by another runner`,
      };
    }
    task.status = 'in_progress';
    return { claimed: true };
  }

  await stageUpdateTaskStatus(client, task, 'in_progress', undefined, deps.walAdapter);
  return { claimed: true };
}

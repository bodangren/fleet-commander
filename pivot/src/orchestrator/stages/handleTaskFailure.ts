import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError, type LogContext } from '../logger';

/**
 * Arguments for the task-failure aftermath helper.
 */
export interface TaskFailureContext {
  projectSlug: string;
  taskKey: string;
  taskTitle: string;
  assignee?: string;
  error: string;
  failureType?: string;
  exitCode?: number;
  durationMs?: number;
  attempt?: number;
  maxRetries?: number;
}

/**
 * Runs the standard post-failure sequence by recording the recovery event
 * and preserving the task's blocked state after retry exhaustion.
 *
 * @param client - Convex HTTP client
 * @param ctx - Task failure context with project/task details
 */
export async function handleTaskFailure(
  client: ConvexHttpClient,
  ctx: TaskFailureContext,
): Promise<void> {
  // Log recovery event
  try {
    await client.mutation(api.recoveryLog.logRecoveryEvent, {
      taskId: ctx.taskKey,
      agentId: ctx.assignee ?? 'unknown',
      eventType: 'blocked',
      details: `Task ${ctx.taskKey} blocked after ${(ctx.attempt ?? 1)} failed attempts`,
    });
  } catch (err) {
    await logAndCaptureError(
      client,
      'warning',
      'Recovery logging failed for blocked task',
      { projectSlug: ctx.projectSlug, taskKey: ctx.taskKey, agentId: ctx.assignee, operation: 'logRecoveryEvent' },
      err,
    );
  }

}

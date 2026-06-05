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
 * Runs the standard post-failure sequence: notify task failure, record
 * recovery event, and optionally notify backoff exhausted.
 *
 * All operations are best-effort — failures are logged and swallowed so
 * that a notification outage never blocks the orchestrator.
 *
 * @param client - Convex HTTP client
 * @param ctx - Task failure context with project/task details
 */
export async function handleTaskFailure(
  client: ConvexHttpClient,
  ctx: TaskFailureContext,
): Promise<void> {
  // Notify task failure
  try {
    await client.mutation(api.notifications.notifyTaskFailed, {
      userId: `owner:${ctx.projectSlug}`,
      taskKey: ctx.taskKey,
      taskTitle: ctx.taskTitle,
      projectSlug: ctx.projectSlug,
      error: ctx.error,
    });
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Task failure notification failed',
      { projectSlug: ctx.projectSlug, taskKey: ctx.taskKey, operation: 'notifyTaskFailed' },
      err,
    );
  }

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

  // Notify backoff exhausted (only when maxRetries is provided)
  if (ctx.maxRetries !== undefined) {
    try {
      await client.mutation(api.notifications.notifyBackoffExhausted, {
        userId: `owner:${ctx.projectSlug}`,
        taskKey: ctx.taskKey,
        maxRetries: ctx.maxRetries,
      });
    } catch (err) {
      await logAndCaptureError(
        client,
        'debug',
        'Backoff exhausted notification failed',
        { projectSlug: ctx.projectSlug, taskKey: ctx.taskKey, operation: 'notifyBackoffExhausted' },
        err,
      );
    }
  }
}

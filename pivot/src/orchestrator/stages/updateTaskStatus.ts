import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';
import type { Task, TaskStatus } from '../types';

/**
 * Updates a task's status in Convex. Falls back to WAL if Convex is
 * unreachable. Failures are logged and swallowed.
 */
export async function updateTaskStatus(
  client: ConvexHttpClient,
  task: Task,
  newStatus: TaskStatus,
  sessionId?: string,
  wal?: {
    append: (entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => { id: string; commit: () => void } | { id: string };
    commit: (id: string) => void;
  },
): Promise<void> {
  const args = {
    projectSlug: task.projectSlug,
    trackId: task.trackId,
    taskKey: task.taskKey,
    title: task.title,
    status: newStatus,
    assignee: task.assignee,
    dependencies: task.dependencies,
    sessionId: sessionId ?? task.sessionId,
  };
  const walEntry = wal?.append({
    type: 'mutation',
    target: 'fleetCatalog.upsertTask',
    args: args as unknown as Record<string, unknown>,
  });
  try {
    await client.mutation(api.fleetCatalog.upsertTask, args);
    if (wal && walEntry) {
      wal.commit(walEntry.id);
    }
  } catch (err) {
    console.warn(
      `[WAL] fleetCatalog.upsertTask failed, event queued: ${walEntry?.id ?? 'no-wal'}`,
    );
    await logAndCaptureError(
      client,
      'debug',
      'updateTaskStatus failed',
      {
        projectSlug: task.projectSlug,
        taskKey: task.taskKey,
        operation: 'updateTaskStatus',
      },
      err,
    );
  }
}

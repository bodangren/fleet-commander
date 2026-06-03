import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';

/**
 * Appends a stage transition log to Convex with WAL fallback.
 * Used for queued/running/succeeded/failed/cancelled states.
 */
export async function appendRunLog(
  client: ConvexHttpClient,
  args: {
    projectSlug: string;
    runId: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    summary: string;
    rawOutput?: string;
    trackId?: string;
  },
  wal: {
    append: (entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => { id: string; commit: () => void } | { id: string };
    commit: (id: string) => void;
  },
): Promise<void> {
  const walEntry = wal.append({
    type: 'mutation',
    target: 'executionLogs.appendLog',
    args: args as unknown as Record<string, unknown>,
  });
  try {
    await client.mutation(api.executionLogs.appendLog, args);
    wal.commit(walEntry.id);
  } catch (err) {
    console.warn(
      `[WAL] executionLogs.appendLog failed, event queued: ${walEntry.id}`,
    );
    await logAndCaptureError(
      client,
      'debug',
      'appendLog failed',
      {
        projectSlug: args.projectSlug,
        taskKey: undefined,
        operation: 'appendLog',
      },
      err,
    );
  }
}

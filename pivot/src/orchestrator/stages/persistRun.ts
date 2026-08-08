import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';

/**
 * Fields captured per pipeline stage for telemetry.
 */
export interface TimingFields {
  loadMs?: number;
  scoreMs?: number;
  executeMs?: number;
  persistMs?: number;
  hookBeforeMs?: number;
  hookAfterMs?: number;
  totalMs?: number;
}

/**
 * Status written to fleetCatalog.workRuns for a run.
 */
export type PersistRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/**
 * Persists a work run record to Convex. Falls back to WAL if Convex is
 * unreachable. Failures are logged and swallowed.
 */
export async function persistRun(
  client: ConvexHttpClient,
  args: {
    projectSlug: string;
    runId: string;
    status: PersistRunStatus;
    selectedTaskKey?: string;
    startedAt?: number;
    finishedAt?: number;
    timings?: TimingFields;
  },
  wal: {
    append: (entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => { id: string; commit: () => void } | { id: string };
    commit: (id: string) => void;
  },
): Promise<void> {
  const walEntry = wal.append({
    type: 'mutation',
    target: 'fleetCatalog.upsertWorkRun',
    args: args as unknown as Record<string, unknown>,
  });
  try {
    await client.mutation(api.fleetCatalog.upsertWorkRun, {
      projectSlug: args.projectSlug,
      runId: args.runId,
      status: args.status,
      selectedTaskKey: args.selectedTaskKey,
      startedAt: args.startedAt ?? Date.now(),
      finishedAt: args.finishedAt,
      ...(args.timings ?? {}),
    });
    wal.commit(walEntry.id);
  } catch (err) {
    console.warn(
      `[WAL] fleetCatalog.upsertWorkRun failed, event queued: ${walEntry.id}`,
    );
    await logAndCaptureError(
      client,
      'debug',
      'persistWorkRun failed',
      {
        projectSlug: args.projectSlug,
        taskKey: args.selectedTaskKey,
        operation: 'persistWorkRun',
      },
      err,
    );
  }
}

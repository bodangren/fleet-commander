import { ConvexHttpClient } from 'convex/browser';
import { persistRun, type PersistRunStatus, type TimingFields } from './persistRun';
import { appendRunLog } from './appendRunLog';
import { type PipelineTimings } from './aggregateCost';

type WalAdapter = {
  append: (entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => { id: string; commit: () => void } | { id: string };
  commit: (id: string) => void;
};

/**
 * Encapsulates the create → append → finalize lifecycle of a pipeline run.
 *
 * Binds `projectSlug`, `runId`, and the WAL adapter once so that callers only
 * need to supply the per-step arguments (status, summary, timings, etc.).
 */
export class PipelineRunLifecycle {
  constructor(
    private readonly client: ConvexHttpClient,
    private readonly projectSlug: string,
    private readonly runId: string,
    private readonly wal: WalAdapter,
  ) {}

  /**
   * Marks the run as 'running' in the work-run catalog.
   */
  async start(taskKey: string): Promise<void> {
    await persistRun(
      this.client,
      {
        projectSlug: this.projectSlug,
        runId: this.runId,
        status: 'running',
        selectedTaskKey: taskKey,
      },
      this.wal,
    );
  }

  /**
   * Appends a stage-transition log entry.
   */
  async appendLog(
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled',
    summary: string,
    rawOutput?: string,
    trackId?: string,
  ): Promise<void> {
    await appendRunLog(
      this.client,
      {
        projectSlug: this.projectSlug,
        runId: this.runId,
        status,
        summary,
        rawOutput,
        trackId,
      },
      this.wal,
    );
  }

  /**
   * Finalizes the run with a terminal status and timing data.
   */
  async finalize(
    status: Extract<PersistRunStatus, 'succeeded' | 'failed'>,
    taskKey: string,
    timings?: PipelineTimings,
  ): Promise<void> {
    await persistRun(
      this.client,
      {
        projectSlug: this.projectSlug,
        runId: this.runId,
        status,
        selectedTaskKey: taskKey,
        finishedAt: Date.now(),
        timings,
      },
      this.wal,
    );
  }
}

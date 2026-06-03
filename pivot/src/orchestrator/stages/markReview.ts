import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';
import type { IssueHooks, Task, ReviewResult } from '../types';

/**
 * Invokes the agent review hook (when provided) and persists its outcome to the
 * run log. Errors are logged but never thrown — review failure must not break
 * a successful run.
 */
export async function markReview(
  client: ConvexHttpClient,
  args: {
    projectSlug: string;
    runId: string;
    task: Task;
    output: string;
    hooks?: IssueHooks;
  },
  appendLog: (
    client: ConvexHttpClient,
    a: {
      projectSlug: string;
      runId: string;
      status: 'succeeded' | 'failed';
      summary: string;
      rawOutput?: string;
      trackId?: string;
    },
  ) => Promise<void>,
): Promise<ReviewResult | null> {
  if (!args.hooks?.runReview) return null;
  try {
    const reviewResult = await args.hooks.runReview(
      args.projectSlug,
      args.task.taskKey,
      args.task.title,
      args.output,
    );
    await appendLog(client, {
      projectSlug: args.projectSlug,
      runId: args.runId,
      status: 'succeeded',
      summary: `Review completed: ${reviewResult.status}`,
      rawOutput: JSON.stringify({
        status: 'agent-reviewed',
        agentStatus: reviewResult.status,
        reviewDepth: reviewResult.depth,
        agentComments: reviewResult.agentComments,
      }),
      trackId: args.task.trackId,
    });
    console.log(`Task ${args.task.taskKey} reviewed: ${reviewResult.status}`);
    return reviewResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logAndCaptureError(
      client,
      'warning',
      `Review hook failed: ${msg}`,
      {
        projectSlug: args.projectSlug,
        taskKey: args.task.taskKey,
        operation: 'runReview',
      },
      err,
    );
    return null;
  }
}

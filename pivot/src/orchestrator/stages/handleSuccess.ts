import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logAndCaptureError } from '../logger';
import {
  recordCircuitSuccess,
  updateTaskStatus as stageUpdateTaskStatus,
  markReview,
} from './index';
import { resolvePostExecutionStatus } from './resolveTransition';
import { createDelegationIssues } from '../issues';
import {
  validateAndPersist,
  createRunContractIfNeeded,
  RunContractValidationError,
} from '../runContract';
import { enforceCoverageThreshold } from '../coverageEnforcement';
import { runHooks, type HarnessHooks } from '../hookRunner';
import { append as walAppend, markCommitted as walCommit } from '../../failover/wal';
import type { Task, IssueHooks, ExecutionResult, CoverageHooks, GitHooks, PipelineDispatchStage } from '../types';
import type { PipelineRunLifecycle } from './pipelineRunLifecycle';
import type { TimingMarkers } from './aggregateCost';

const walAdapter = {
  append: walAppend,
  commit: walCommit,
};

/**
 * Runs the post-success sequence: record outcome, circuit success, afterRun
 * hook, delegation issues, run contract validation, review, coverage
 * enforcement, status update, notifications, git commit, and lifecycle
 * finalization.
 *
 * @param dispatchStage - Which pipeline stage this success is for
 *   (executor, reviewer, merger). Determines post-success status transition.
 * @returns Object with `coverageViolated` flag and the recorded `costUSD`
 *   from `api.costs.recordCost` (0 when no cost was recorded, e.g. zero-token
 *   runs or when the call failed).
 */
export async function handleSuccess(
  client: ConvexHttpClient,
  projectSlug: string,
  runId: string,
  task: Task,
  lastResult: ExecutionResult,
  startMs: number,
  rootPath: string | undefined,
  harnessHooks: HarnessHooks,
  hooks: IssueHooks | undefined,
  gitHooks: GitHooks | undefined,
  coverageHooks: CoverageHooks | undefined,
  beforeCoverage: number | undefined,
  lifecycle: PipelineRunLifecycle,
  markers?: TimingMarkers,
  dispatchStage: PipelineDispatchStage = 'executor',
  effectiveAgent?: string,
): Promise<{ coverageViolated: boolean; costUSD: number }> {
  const durationMs = Date.now() - startMs;

  // Record real cost from token telemetry. The Convex mutation computes
  // costUSD from the model's price card and increments budgets.spent
  // atomically. Best-effort: a Convex failure must not block dispatch.
  let recordedCostUSD = 0;
  if (
    lastResult.inputTokens !== undefined &&
    lastResult.outputTokens !== undefined &&
    lastResult.model &&
    (lastResult.inputTokens > 0 || lastResult.outputTokens > 0)
  ) {
    try {
      const recorded = await client.mutation(api.costs.recordCost, {
        agentId: effectiveAgent ?? task.assignee ?? 'unknown',
        projectSlug,
        taskId: task.taskKey,
        model: lastResult.model,
        inputTokens: lastResult.inputTokens,
        outputTokens: lastResult.outputTokens,
        sessionResumed: Boolean(lastResult.sessionId),
      });
      recordedCostUSD = recorded?.costUSD ?? 0;
    } catch (err) {
      await logAndCaptureError(
        client,
        'debug',
        'recordCost failed',
        { projectSlug, taskKey: task.taskKey, operation: 'recordCost' },
        err,
      );
    }
  }

  // Record dispatch outcome for weight tuning
  try {
    await client.mutation(api.scoreAudit.recordOutcome, {
      chosenTaskId: task.taskKey,
      outcome: 'accepted',
    });
  } catch {
    // Non-critical
  }

  // Record circuit breaker success for the effective agent (reviewer/merger override)
  const agent = effectiveAgent ?? task.assignee;
  if (agent) {
    await recordCircuitSuccess(client, agent, projectSlug, task.taskKey);
  }

  // Lifecycle: run afterRun hook on success
  const hookAfterStartMs = Date.now();
  if (harnessHooks?.afterRun && rootPath) {
    const hookErr = await runHooks(harnessHooks, 'afterRun', rootPath);
    if (markers) {
      markers.hookAfterStartMs = hookAfterStartMs;
      markers.hookAfterEndMs = Date.now();
    }
    if (hookErr) {
      console.warn(
        `afterRun hook failed for task ${task.taskKey}: exit ${hookErr.exitCode}, stderr: ${hookErr.stderr}`,
      );
      try {
        await client.mutation(api.notifications.notifyHookFailure, {
          userId: 'admin:system',
          hookName: 'afterRun',
          taskKey: task.taskKey,
          exitCode: hookErr.exitCode,
          stderr: hookErr.stderr,
        });
      } catch {
        // Non-critical
      }
    }
  } else if (markers) {
    markers.hookAfterStartMs = hookAfterStartMs;
    markers.hookAfterEndMs = Date.now();
  }

  await lifecycle.appendLog(
    'succeeded',
    `Task ${task.taskKey} completed in ${durationMs}ms`,
    lastResult.output,
    task.trackId,
  );

  // Parse and auto-create delegation issues from agent output
  let issueCount = 0;
  if (hooks?.createDelegations) {
    issueCount = await hooks.createDelegations(
      projectSlug,
      task.taskKey,
      lastResult.output,
    );
  } else {
    issueCount = await createDelegationIssues(
      client,
      projectSlug,
      task.taskKey,
      lastResult.output,
    );
  }
  if (issueCount > 0) {
    console.log(
      `Auto-created ${issueCount} delegation issue(s) from agent output for task ${task.taskKey}`,
    );
  }

  // Validate and persist run contract from executor output
  try {
    const parsedOutput = JSON.parse(lastResult.output);
    await createRunContractIfNeeded(
      client,
      task.taskKey,
      projectSlug,
      task.title,
      [task.trackId],
      [],
    );
    await validateAndPersist(client, task.taskKey, 'executor', parsedOutput);
  } catch (err) {
    if (err instanceof RunContractValidationError) {
      console.warn(
        `Run contract validation failed for task ${task.taskKey}: ${err.message}`,
      );
      try {
        await client.mutation(api.runContracts.appendRecoveryOutput, {
          taskId: task.taskKey,
          action: 'human_review',
          reason: `Executor output validation failed: ${err.message}`,
        });
      } catch (innerErr) {
        await logAndCaptureError(
          client,
          'warning',
          'Recovery output append failed',
          { projectSlug, taskKey: task.taskKey, operation: 'appendRecoveryOutput' },
          innerErr,
        );
      }
      try {
        await client.mutation(api.recoveryLog.logRecoveryEvent, {
          taskId: task.taskKey,
          agentId: task.assignee ?? 'unknown',
          eventType: 'blocked',
          details: `Run contract validation failed for task ${task.taskKey}: ${err.message}`,
        });
      } catch (innerErr) {
        await logAndCaptureError(
          client,
          'warning',
          'Recovery event logging failed',
          { projectSlug, taskKey: task.taskKey, operation: 'logRecoveryEvent' },
          innerErr,
        );
      }
    }
    // JSON.parse errors or other errors are ignored — not all agents emit structured output yet
  }

  // Run review hooks if available (TD-008)
  await markReview(
    client,
    { projectSlug, runId, task, output: lastResult.output, hooks },
    async (_c, a) => {
      await lifecycle.appendLog(a.status, a.summary, a.rawOutput, a.trackId);
    },
  );

  // Coverage threshold enforcement (best-effort)
  if (lastResult.coveragePercentage !== undefined) {
    try {
      const { violated } = await enforceCoverageThreshold(
        client,
        projectSlug,
        task.taskKey,
        task.title,
        task.trackId,
        lastResult.coveragePercentage,
        beforeCoverage,
        coverageHooks,
      );
      if (violated) {
        await lifecycle.appendLog(
          'failed',
          `Coverage threshold violation for task ${task.taskKey}: ${lastResult.coveragePercentage.toFixed(1)}%`,
          undefined,
          task.trackId,
        );
        const coverageDecision = resolvePostExecutionStatus({
          succeeded: false,
          retriesExhausted: false,
          coverageViolated: true,
        });
        await stageUpdateTaskStatus(client, task, coverageDecision.nextStatus!, undefined, walAdapter);
        return { coverageViolated: true, costUSD: recordedCostUSD };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logAndCaptureError(
        client,
        'warning',
        `Coverage enforcement failed: ${msg}`,
        { projectSlug, taskKey: task.taskKey, operation: 'enforceCoverageThreshold' },
        err,
      );
    }
  }

  // Mark task status based on pipeline stage — executor success transitions
  // to review (if reviewerId) or done, reviewer success transitions to
  // merge (if mergerId) or done, merger success always transitions to done.
  let successDecision: ReturnType<typeof resolvePostExecutionStatus>;
  if (dispatchStage === 'reviewer') {
    if (task.mergerId) {
      // Reviewer passed, need merger next. Set assignee to mergerId so the
      // next orchestrator cycle routes this task to the merger stage.
      const mergeTask = { ...task, assignee: task.mergerId };
      await stageUpdateTaskStatus(client, mergeTask, 'review', lastResult.sessionId, walAdapter);
      successDecision = { nextStatus: 'review', reason: 'Reviewer passed, awaiting merger' };
    } else {
      successDecision = resolvePostExecutionStatus({
        succeeded: true,
        retriesExhausted: false,
      });
    }
  } else if (dispatchStage === 'merger') {
    successDecision = resolvePostExecutionStatus({
      succeeded: true,
      retriesExhausted: false,
    });
  } else {
    successDecision = resolvePostExecutionStatus({
      succeeded: true,
      retriesExhausted: false,
      reviewRequired: !!task.reviewerId,
      mergeRequired: !!task.mergerId && !task.reviewerId,
    });
  }
  if (successDecision.nextStatus && dispatchStage !== 'reviewer') {
    await stageUpdateTaskStatus(client, task, successDecision.nextStatus, lastResult.sessionId, walAdapter);
  }

  // Notify task completion
  try {
    if (task.assignee) {
      await client.mutation(api.notifications.notifyTaskCompleted, {
        userId: task.assignee,
        taskKey: task.taskKey,
        taskTitle: task.title,
        projectSlug,
      });
    }
    await client.mutation(api.notifications.notifyTaskCompleted, {
      userId: `owner:${projectSlug}`,
      taskKey: task.taskKey,
      taskTitle: task.title,
      projectSlug,
    });
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Task completion notification failed',
      { projectSlug, taskKey: task.taskKey, operation: 'notifyTaskCompleted' },
      err,
    );
  }

  // Git: commit changes for task if git hooks are provided
  if (gitHooks?.onTaskComplete && rootPath) {
    try {
      await gitHooks.onTaskComplete(
        projectSlug,
        rootPath,
        task.taskKey,
        task.title,
        true,
        task.trackId,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logAndCaptureError(
        client,
        'warning',
        `Git onTaskComplete failed: ${msg}`,
        { projectSlug, taskKey: task.taskKey, operation: 'gitOnTaskComplete' },
        err,
      );
    }
  }

  return { coverageViolated: false, costUSD: recordedCostUSD };
}

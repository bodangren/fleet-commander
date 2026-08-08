import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { executeTaskViaPi } from '../piExecutor';
import { RetryManager } from '../retryManager';
import { logAndCaptureError } from '../logger';
import {
  recordCircuitFailure,
  updateTaskStatus as stageUpdateTaskStatus,
} from './index';
import { resolvePostExecutionStatus } from './resolveTransition';
import { handleTaskFailure } from './handleTaskFailure';
import { append as walAppend, markCommitted as walCommit } from '../../failover/wal';
import type {
  OrchestratorConfig,
  ExecutionResult,
  Task,
  IssueHooks,
  ExecuteFn,
  ExecutionOptions,
} from '../types';
import type { TrackContextPayload } from './loadAndFilterTasks';
import type { PipelineRunLifecycle } from './pipelineRunLifecycle';

const walAdapter = {
  append: walAppend,
  commit: walCommit,
};

/**
 * Result of the execute-with-retry stage.
 */
export interface RetryExecutionResult {
  lastResult: ExecutionResult | null;
  attempts: number;
}

/**
 * Builds the full agent prompt by prepending the parent track's specification
 * and implementation-plan markdown to the task title. The combined prompt is
 * truncated to `contextMaxChars` characters, with a `[truncated]` suffix when
 * the cap is hit.
 *
 * Exposed for unit testing.
 *
 * @param task - The task being dispatched
 * @param trackContext - Optional cached spec + plan markdown for task.trackId
 * @param contextMaxChars - Maximum total prompt length in chars
 */
export function buildAgentPrompt(
  task: Task,
  trackContext: TrackContextPayload | undefined,
  contextMaxChars: number,
): string {
  if (!trackContext) {
    return task.title;
  }

  const full =
    `# Task: ${task.title}\n` +
    `# Specification\n${trackContext.specMarkdown}\n` +
    `# Implementation Plan\n${trackContext.planMarkdown}\n`;

  if (full.length <= contextMaxChars) {
    return full;
  }

  const suffix = '\n[truncated]';
  const head = full.slice(0, Math.max(0, contextMaxChars - suffix.length));
  return head + suffix;
}

/**
 * Runs the execution retry loop: calls executeFn (or the Pi executor) up to
 * maxRetries+1 times, handling session continuity, failure recording, and
 * blocker creation on exhausted retries.
 *
 * @param client - Convex HTTP client
 * @param projectSlug - project identifier
 * @param task - the selected task (mutated: sessionId updated on success)
 * @param config - orchestrator config (retry params, timeout, and token cap)
 * @param hooks - optional issue hooks for blocker creation
 * @param executeFn - optional custom execute function
 * @param lifecycle - pipeline run lifecycle for log appending
 * @param trackContext - optional parent-track context payload to prepend
 * @param contextMaxChars - maximum prompt length when trackContext is present
 * @param projectPath - resolved project directory for the execution backend
 */
export async function executeWithRetry(
  client: ConvexHttpClient,
  projectSlug: string,
  task: Task,
  config: OrchestratorConfig,
  hooks: IssueHooks | undefined,
  executeFn: ExecuteFn | undefined,
  lifecycle: PipelineRunLifecycle,
  contractMaxExecutionMs: number | undefined,
  contractMaxTokens: number | undefined,
  trackContext?: TrackContextPayload,
  contextMaxChars = 16_000,
  projectPath?: string,
): Promise<RetryExecutionResult> {
  const retryManager = new RetryManager({
    maxRetries: config.maxRetries,
    baseDelayMs: config.baseDelayMs,
    maxDelayMs: config.maxDelayMs,
    jitterMs: 0,
  });

  // Contract values are untrusted runtime overrides. A non-positive value
  // would disable the backend's bounded timeout/token checks, so fall back to
  // the configured defaults instead.
  const effectiveTimeoutMs =
    contractMaxExecutionMs !== undefined && Number.isFinite(contractMaxExecutionMs) && contractMaxExecutionMs > 0
      ? contractMaxExecutionMs
      : config.commandTimeoutMs;
  const effectiveMaxTokens =
    contractMaxTokens !== undefined && Number.isFinite(contractMaxTokens) && contractMaxTokens > 0
      ? contractMaxTokens
      : config.maxTokens;
  const promptText = buildAgentPrompt(task, trackContext, contextMaxChars);
  let lastResult: ExecutionResult | null = null;
  // The Pi backend has no live session to resume, so continuity across retries
  // is carried as the previous attempt's output. Captured before dispatch so
  // the attempt cannot read its own result.
  let previousOutput: string | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = retryManager.calculateSymphonyBackoff(attempt);
      console.log(
        `Retrying task ${task.taskKey} (attempt ${attempt}/${config.maxRetries}, delay ${delay}ms)`,
      );
      await sleep(delay);

      await client.mutation(api.recoveryLog.logRecoveryEvent, {
        taskId: task.taskKey,
        agentId: task.assignee ?? 'unknown',
        eventType: 'retry',
        details: `Retry attempt ${attempt} for task ${task.taskKey}`,
      });
    }

    const executionOptions: ExecutionOptions = {
      sessionId: task.sessionId,
      projectPath,
      maxTokens: effectiveMaxTokens,
    };

    lastResult = executeFn
      ? await executeFn(
          client,
          task.assignee ?? '',
          promptText,
          task.taskKey,
          effectiveTimeoutMs,
          executionOptions,
        )
      : await executeTaskViaPi(
          client,
          task.assignee ?? '',
          promptText,
          task.taskKey,
          effectiveTimeoutMs,
          effectiveMaxTokens,
          { sessionId: task.sessionId, continuationOutput: previousOutput, projectPath },
        );

    previousOutput = lastResult.output || undefined;

    // Preserve sessionId from execution result for continuity on retries
    if (lastResult.sessionId) {
      const isResumed = Boolean(task.sessionId) && lastResult.sessionId === task.sessionId;
      if (task.sessionId && lastResult.sessionId !== task.sessionId) {
        console.warn(
          `Session continuity violation for task ${task.taskKey}: expected ${task.sessionId}, got ${lastResult.sessionId}`,
        );
      }
      task.sessionId = lastResult.sessionId;
      try {
        await stageUpdateTaskStatus(client, task, 'in_progress', lastResult.sessionId, walAdapter);
      } catch (err) {
        await logAndCaptureError(
          client,
          'debug',
          'Failed to persist sessionId after execution',
          { projectSlug, taskKey: task.taskKey, operation: 'persistSessionId' },
          err,
        );
      }
      if (isResumed && attempt > 0) {
        try {
          await client.mutation(api.notifications.notifySessionResumed, {
            userId: task.assignee ?? 'debug:system',
            taskKey: task.taskKey,
            sessionId: lastResult.sessionId,
          });
        } catch {
          // Non-critical: debug channel, opt-in
        }
      }
    }

    if (lastResult.status === 'succeeded') {
      console.log(
        `Task ${task.taskKey} completed successfully (attempt ${attempt + 1}, duration: ${lastResult.durationMs}ms)`,
      );
      break;
    }

    // Execution failed
    console.log(
      `Task ${task.taskKey} failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${lastResult.error}`,
    );

    await lifecycle.appendLog(
      'failed',
      `Attempt ${attempt + 1} failed: ${lastResult.error}`,
      lastResult.output,
      task.trackId,
    );

    if (task.assignee) {
      await recordCircuitFailure(
        client,
        task.assignee,
        lastResult.failureType,
        projectSlug,
        task.taskKey,
      );
    }

    // Last attempt exhausted — create blocker
    if (attempt === config.maxRetries) {
      if (hooks?.createBlocker) {
        await hooks.createBlocker(
          projectSlug,
          task.taskKey,
          task.title,
          lastResult.error ?? 'unknown',
          lastResult.failureType ?? 'unknown',
          lastResult.exitCode,
          lastResult.durationMs,
          attempt + 1,
        );
      } else {
        const { createBlockerIssue } = await import('../issues');
        await createBlockerIssue(
          client,
          projectSlug,
          task.taskKey,
          task.title,
          lastResult.error ?? 'unknown',
          lastResult.failureType ?? 'unknown',
          lastResult.exitCode,
          lastResult.durationMs,
          attempt + 1,
        );
      }

      const failureDecision = resolvePostExecutionStatus({
        succeeded: false,
        retriesExhausted: true,
      });
      await stageUpdateTaskStatus(client, task, failureDecision.nextStatus!, undefined, walAdapter);

      await handleTaskFailure(client, {
        projectSlug,
        taskKey: task.taskKey,
        taskTitle: task.title,
        assignee: task.assignee,
        error: lastResult.error ?? 'unknown',
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
      });
    }
  }

  return { lastResult, attempts: Math.min(lastResult ? 1 : 0, 1) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { ConvexHttpClient } from 'convex/browser';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { loadTasks, loadTrackStatuses, loadActiveProjects } from './candidates';
import { getBestTask } from './evaluator';
import { executeTask } from './executor';
import {
  createBlockerIssue,
  createDelegationIssues,
} from './issues';
import type {
  OrchestratorConfig,
  ExecutionResult,
  Task,
  CandidateTask,
  IssueHooks,
  ExecuteFn,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { RetryManager } from './retryManager';
import { DEFAULT_RETRY_CONFIG } from './types';

interface RunResult {
  projectSlug: string;
  taskKey: string | null;
  status: 'succeeded' | 'failed' | 'no_tasks';
  error?: string;
}

/**
 * Appends an execution log to Convex.
 */
async function appendLog(
  client: ConvexHttpClient,
  projectSlug: string,
  runId: string,
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled',
  summary: string,
  rawOutput?: string,
  trackId?: string,
): Promise<void> {
  await client.mutation(api.executionLogs.appendLog, {
    projectSlug,
    runId,
    status,
    summary,
    rawOutput,
    trackId,
  });
}

/**
 * Persists a work run record to Convex.
 */
async function persistWorkRun(
  client: ConvexHttpClient,
  projectSlug: string,
  runId: string,
  status: 'queued' | 'running' | 'succeeded' | 'failed',
  selectedTaskKey?: string,
  finishedAt?: number,
): Promise<void> {
  await client.mutation(api.fleetCatalog.upsertWorkRun, {
    projectSlug,
    runId,
    status,
    selectedTaskKey,
    startedAt: Date.now(),
    finishedAt,
  });
}

/**
 * Updates a task status in Convex.
 */
async function updateTaskStatus(
  client: ConvexHttpClient,
  task: Task,
  newStatus: 'todo' | 'ready' | 'in_progress' | 'blocked' | 'done',
): Promise<void> {
  await client.mutation(api.fleetCatalog.upsertTask, {
    projectSlug: task.projectSlug,
    trackId: task.trackId,
    taskKey: task.taskKey,
    title: task.title,
    status: newStatus,
    assignee: task.assignee,
    dependencies: task.dependencies,
  });
}

/**
 * Sleep for the given milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a single orchestrator cycle for one project.
 * Selects the best task, executes it with retry logic,
 * persists results, and handles failure/blocker creation.
 */
export async function runProject(
  client: ConvexHttpClient,
  projectSlug: string,
  config: OrchestratorConfig = DEFAULT_CONFIG,
  hooks?: IssueHooks,
  executeFn?: ExecuteFn,
): Promise<RunResult> {
  const runId = `run-${projectSlug}-${Date.now()}`;

  const tasks = await loadTasks(client, projectSlug);
  const trackStatuses = await loadTrackStatuses(client, projectSlug);
  const candidate = getBestTask(tasks, trackStatuses);

  if (!candidate) {
    return { projectSlug, taskKey: null, status: 'no_tasks' };
  }

  const { task } = candidate;

  // Check circuit breaker before dispatching
  if (task.assignee) {
    try {
      await client.mutation(api.circuitBreakers.initCircuitBreaker, {
        agentId: task.assignee,
      });
      const circuitState = await client.mutation(api.circuitBreakers.evaluateCircuitState, {
        agentId: task.assignee,
      });
      if (circuitState === 'open') {
        console.log(
          `Circuit breaker open for agent ${task.assignee}, skipping task ${task.taskKey}`,
        );
        return {
          projectSlug,
          taskKey: task.taskKey,
          status: 'failed',
          error: `Circuit breaker open for agent ${task.assignee}`,
        };
      }
    } catch {
      // Circuit breaker check is best-effort; continue if unavailable
    }
  }

  console.log(
    `Dispatcher selected task ${task.taskKey} (score: ${candidate.score}, reason: ${candidate.rationale})`,
  );

  await appendLog(
    client,
    projectSlug,
    runId,
    'running',
    `Dispatching task ${task.taskKey}: ${task.title}`,
    undefined,
    task.trackId,
  );

  await persistWorkRun(client, projectSlug, runId, 'running', task.taskKey);

  // Mark task as in_progress
  await updateTaskStatus(client, task, 'in_progress');

  const startMs = Date.now();
  let lastResult: ExecutionResult | null = null;
  const retryManager = new RetryManager(DEFAULT_RETRY_CONFIG);

  // Record task start time
  await client.mutation(api.taskRecovery.setTaskStartedAt, {
    projectSlug,
    trackId: task.trackId,
    taskKey: task.taskKey,
    startedAt: startMs,
  });

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = retryManager.calculateBackoff(attempt - 1);
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

    lastResult = executeFn
      ? await executeFn(
          client,
          task.assignee ?? '',
          task.title,
          task.taskKey,
          config.commandTimeoutMs,
        )
      : await executeTask(
          client,
          task.assignee ?? '',
          task.title,
          task.taskKey,
          config.commandTimeoutMs,
        );

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

    await appendLog(
      client,
      projectSlug,
      runId,
      'failed',
      `Attempt ${attempt + 1} failed: ${lastResult.error}`,
      lastResult.output,
      task.trackId,
    );

    // Record circuit breaker failure
    if (task.assignee) {
      try {
        await client.mutation(api.circuitBreakers.recordCircuitFailure, {
          agentId: task.assignee,
        });
      } catch {
        // Circuit breaker recording is best-effort
      }
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

      // Mark task as blocked
      await updateTaskStatus(client, task, 'blocked');

      // Log recovery event
      try {
        await client.mutation(api.recoveryLog.logRecoveryEvent, {
          taskId: task.taskKey,
          agentId: task.assignee ?? 'unknown',
          eventType: 'blocked',
          details: `Task ${task.taskKey} blocked after ${attempt + 1} failed attempts`,
        });
      } catch {
        // Recovery logging is best-effort
      }

      await persistWorkRun(
        client,
        projectSlug,
        runId,
        'failed',
        task.taskKey,
        Date.now(),
      );

      return {
        projectSlug,
        taskKey: task.taskKey,
        status: 'failed',
        error: lastResult.error,
      };
    }
  }

  if (!lastResult || lastResult.status !== 'succeeded') {
    return {
      projectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: 'task execution produced no result',
    };
  }

  // Success path
  const durationMs = Date.now() - startMs;

  // Record circuit breaker success
  if (task.assignee) {
    try {
      await client.mutation(api.circuitBreakers.recordCircuitSuccess, {
        agentId: task.assignee,
      });
    } catch {
      // Circuit breaker recording is best-effort
    }
  }

  await appendLog(
    client,
    projectSlug,
    runId,
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

  // Run review hooks if available (TD-008)
  if (hooks?.runReview) {
    try {
      const reviewResult = await hooks.runReview(
        projectSlug,
        task.taskKey,
        task.title,
        lastResult.output,
      );
      await appendLog(
        client,
        projectSlug,
        runId,
        'succeeded',
        `Review completed: ${reviewResult.status}`,
        JSON.stringify({
          status: 'agent-reviewed',
          agentStatus: reviewResult.status,
          reviewDepth: reviewResult.depth,
          agentComments: reviewResult.agentComments,
        }),
        task.trackId,
      );
      console.log(
        `Task ${task.taskKey} reviewed: ${reviewResult.status}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Review hook failed for task ${task.taskKey}: ${msg}`);
    }
  }

  // Mark task as done
  await updateTaskStatus(client, task, 'done');

  await persistWorkRun(
    client,
    projectSlug,
    runId,
    'succeeded',
    task.taskKey,
    Date.now(),
  );

  return { projectSlug, taskKey: task.taskKey, status: 'succeeded' };
}

/**
 * Runs a single orchestrator cycle across all active projects.
 * Returns results for each project that was processed.
 */
export async function runAllProjects(
  config: OrchestratorConfig = DEFAULT_CONFIG,
): Promise<RunResult[]> {
  const client = createConvexClient();
  const projects = await loadActiveProjects(client);
  const results: RunResult[] = [];

  for (const project of projects) {
    try {
      const result = await runProject(client, project.slug, config);
      results.push(result);
      if (result.status !== 'no_tasks') {
        console.log(
          `Project ${project.slug}: ${result.status}${result.taskKey ? ` (task: ${result.taskKey})` : ''}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== `no tasks available for project ${project.slug}`) {
        console.error(`AutoRunner: project ${project.slug}: ${msg}`);
      }
      results.push({
        projectSlug: project.slug,
        taskKey: null,
        status: 'failed',
        error: msg,
      });
    }
  }

  return results;
}

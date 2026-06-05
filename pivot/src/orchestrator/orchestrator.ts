import { ConvexHttpClient } from 'convex/browser';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { loadTasks, loadTrackStatuses, loadActiveProjects, loadProject } from './candidates';
import { executeTask } from './executor';
import { createScoreAudit } from '../policy/policyClient';
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
  GitHooks,
  CoverageHooks,
} from './types';
import { enforceCoverageThreshold } from './coverageEnforcement';
import { DEFAULT_CONFIG } from './types';
import { RetryManager } from './retryManager';
import { logAndCaptureError } from './logger';
import {
  validateAndPersist,
  createRunContractIfNeeded,
  RunContractValidationError,
  appendDispatchRejections,
} from './runContract';
import { filterEligibleTasks, type ConstraintContext } from './constraints';
import { append as walAppend, markCommitted as walCommit } from '../failover/wal';
import { resolveHarnessHooks } from './resolver';
import { runHooks } from './hookRunner';
import {
  checkBudget,
  checkCircuit,
  recordCircuitFailure,
  recordCircuitSuccess,
  scoreCandidates,
  persistRun as stagePersistRun,
  appendRunLog,
  updateTaskStatus as stageUpdateTaskStatus,
  markReview,
} from './stages';
import { aggregateCost, type TimingMarkers, type PipelineTimings } from './stages/aggregateCost';
import { PipelineRunLifecycle } from './stages/pipelineRunLifecycle';

export interface RunResult {
  projectSlug: string;
  taskKey: string | null;
  status: 'succeeded' | 'failed' | 'no_tasks';
  error?: string;
}

const walAdapter = {
  append: walAppend,
  commit: walCommit,
};

/**
 * Updates a task status in Convex with WAL fallback.
 */
async function updateTaskStatus(
  client: ConvexHttpClient,
  task: Task,
  newStatus: 'todo' | 'ready' | 'in_progress' | 'blocked' | 'done',
  sessionId?: string,
): Promise<void> {
  await stageUpdateTaskStatus(client, task, newStatus, sessionId, walAdapter);
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
  gitHooks?: GitHooks,
  coverageHooks?: CoverageHooks,
): Promise<RunResult> {
  const runId = `run-${projectSlug}-${Date.now()}`;
  const lifecycle = new PipelineRunLifecycle(client, projectSlug, runId, walAdapter);
  const markers: TimingMarkers = { pipelineStartMs: Date.now() };
  // sessionResumeMs removed — was a stub metric (see remediation_20260504_audit)

  markers.loadStartMs = Date.now();
  const project = await loadProject(client, projectSlug);
  const rootPath = project?.rootPath;

  const tasks = await loadTasks(client, projectSlug);
  const trackStatuses = await loadTrackStatuses(client, projectSlug);
  markers.loadEndMs = Date.now();

  const allTasks = new Map<string, Task>();
  for (const t of tasks) {
    allTasks.set(t.taskKey, t);
  }

  const constraintContext: ConstraintContext = {
    allTasks,
  };

  markers.scoreStartMs = Date.now();

  const { eligible, rejections } = filterEligibleTasks(
    tasks,
    constraintContext,
    trackStatuses,
  );

  // Persist dispatch rejections to run contracts
  if (rejections.length > 0) {
    const grouped = new Map<string, import('./constraints').DispatchRejection[]>();
    for (const r of rejections) {
      const list = grouped.get(r.taskKey) ?? [];
      list.push(r);
      grouped.set(r.taskKey, list);
    }
    for (const [taskKey, taskRejections] of grouped) {
      const task = allTasks.get(taskKey);
      if (task) {
        try {
          await createRunContractIfNeeded(
            client,
            taskKey,
            projectSlug,
            task.title,
            [task.trackId],
            [],
          );
          await appendDispatchRejections(client, taskKey, taskRejections);
        } catch (err) {
          await logAndCaptureError(
            client,
            'warning',
            'Failed to persist dispatch rejections',
            { projectSlug, taskKey, operation: 'persistRejections' },
            err,
          );
        }
      }
    }
  }

  const selected = await scoreCandidates(
    client,
    projectSlug,
    eligible.map((c) => c.task),
    trackStatuses,
  );

  markers.scoreEndMs = Date.now();

  if (!selected) {
    return { projectSlug, taskKey: null, status: 'no_tasks' };
  }

  // Persist score audit
  try {
    await createScoreAudit(client, {
      chosenTaskId: selected.task.taskKey,
      candidatesJson: JSON.stringify(eligible.map((c) => c.task.taskKey)),
      breakdownJson: JSON.stringify(selected.breakdown),
      justification: selected.justification,
      weightsVersion: 1,
      llmTieBreak: selected.llmTieBreak,
    });
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Score audit persistence failed',
      { projectSlug, taskKey: selected.task.taskKey, operation: 'persistScoreAudit' },
      err,
    );
  }

  const task = selected.task;

  // Check circuit breaker before dispatching
  const circuit = await checkCircuit(client, task.assignee, projectSlug, task.taskKey);
  if (!circuit.allowed) {
    console.log(
      `Circuit breaker open for agent ${task.assignee}, skipping task ${task.taskKey}`,
    );
    return {
      projectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: circuit.reason,
    };
  }

  // Budget enforcement: check project budget before dispatching
  const budget = await checkBudget(client, projectSlug, task.taskKey);
  if (!budget.allowed && budget.policy === 'strict') {
    return {
      projectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: budget.reason,
    };
  }

  console.log(
    `Dispatcher selected task ${task.taskKey} (score: ${selected.score.toFixed(3)}, reason: ${selected.justification})`,
  );

  await lifecycle.appendLog(
    'running',
    `Dispatching task ${task.taskKey}: ${task.title}`,
    undefined,
    task.trackId,
  );

  await lifecycle.start(task.taskKey);

  // Mark task as in_progress
  await updateTaskStatus(client, task, 'in_progress');

  // Lifecycle: load harness hooks before any worktree creation hook can run.
  let harnessHooks;
  try {
    harnessHooks = await resolveHarnessHooks(client, task.assignee ?? '');
  } catch {
    harnessHooks = {};
  }

  // Git: create branch for task if git hooks are provided
  if (gitHooks?.onTaskStart && rootPath) {
    try {
      const { branchName, branchCreated } = await gitHooks.onTaskStart(
        projectSlug,
        rootPath,
        task.taskKey,
        task.title,
      );
      console.log(`Git: branch ${branchName} created for task ${task.taskKey}`);
      if (branchCreated && harnessHooks.afterCreate) {
        const hookErr = await runHooks(harnessHooks, 'afterCreate', rootPath);
        if (hookErr) {
          console.warn(
            `afterCreate hook failed for task ${task.taskKey}: exit ${hookErr.exitCode}, stderr: ${hookErr.stderr}`,
          );
          await logAndCaptureError(
            client,
            'warning',
            `afterCreate hook failed: ${hookErr.stderr || hookErr.command}`,
            { projectSlug, taskKey: task.taskKey, operation: 'afterCreateHook' },
            new Error(hookErr.stderr || `exit ${hookErr.exitCode}`),
          );
          try {
            await client.mutation(api.notifications.notifyHookFailure, {
              userId: 'admin:system',
              hookName: 'afterCreate',
              taskKey: task.taskKey,
              exitCode: hookErr.exitCode,
              stderr: hookErr.stderr,
            });
          } catch {
            // Non-critical
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logAndCaptureError(
        client,
        'warning',
        `Git onTaskStart failed: ${msg}`,
        { projectSlug, taskKey: task.taskKey, operation: 'gitOnTaskStart' },
        err,
      );
    }
  }

  const hookBeforeStartMs = Date.now();
  if (harnessHooks.beforeRun && rootPath) {
    const hookErr = await runHooks(harnessHooks, 'beforeRun', rootPath);
    markers.hookBeforeEndMs = Date.now();
    markers.hookBeforeStartMs = hookBeforeStartMs;
    if (hookErr) {
      console.warn(
        `beforeRun hook failed for task ${task.taskKey}: exit ${hookErr.exitCode}, stderr: ${hookErr.stderr}`,
      );
      await logAndCaptureError(
        client,
        'warning',
        `beforeRun hook failed: ${hookErr.stderr || hookErr.command}`,
        { projectSlug, taskKey: task.taskKey, operation: 'beforeRunHook' },
        new Error(hookErr.stderr || `exit ${hookErr.exitCode}`),
      );
      try {
        await client.mutation(api.notifications.notifyHookFailure, {
          userId: 'admin:system',
          hookName: 'beforeRun',
          taskKey: task.taskKey,
          exitCode: hookErr.exitCode,
          stderr: hookErr.stderr,
        });
      } catch {
        // Non-critical
      }
    }
  } else {
    markers.hookBeforeStartMs = hookBeforeStartMs;
    markers.hookBeforeEndMs = Date.now();
  }

  markers.executeStartMs = Date.now();
  const startMs = markers.executeStartMs;
  let lastResult: ExecutionResult | null = null;
  const retryManager = new RetryManager({
    maxRetries: config.maxRetries,
    baseDelayMs: config.baseDelayMs,
    maxDelayMs: config.maxDelayMs,
    jitterMs: 0,
  });

  let beforeCoverage: number | undefined;
  try {
    const latest = await client.query(api.coverageRecords.getLatestCoverage, {
      projectSlug,
    });
    beforeCoverage = latest?.percentage;
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Coverage lookup failed',
      { projectSlug, taskKey: task.taskKey, operation: 'coverageLookup' },
      err,
    );
  }

  // Load run contract for SLA and session continuity enforcement
  let contractMaxExecutionMs: number | undefined;
  let contractMaxTokens: number | undefined;
  let previousRecoveryAction: string | undefined;
  try {
    const contract = await client.query(api.runContracts.getRunContract, {
      taskId: task.taskKey,
    });
    if (contract) {
      contractMaxExecutionMs = contract.maxExecutionMs ?? undefined;
      contractMaxTokens = contract.maxTokens ?? undefined;
      previousRecoveryAction = contract.recoveryAction ?? undefined;
    }
  } catch (err) {
    await logAndCaptureError(
      client,
      'debug',
      'Run contract lookup failed',
      { projectSlug, taskKey: task.taskKey, operation: 'getRunContract' },
      err,
    );
  }

  // Session continuity enforcement: clear sessionId if previous recovery was replan or split
  if (previousRecoveryAction === 'replan' || previousRecoveryAction === 'split') {
    const originalSessionId = task.sessionId;
    try {
      await updateTaskStatus(client, task, 'in_progress', undefined);
      task.sessionId = undefined;
    } catch (err) {
      task.sessionId = originalSessionId;
      await logAndCaptureError(
        client,
        'warning',
        'Failed to clear sessionId after replan/split',
        { projectSlug, taskKey: task.taskKey, operation: 'clearSessionId' },
        err,
      );
    }
  }

  const effectiveTimeoutMs = contractMaxExecutionMs ?? config.commandTimeoutMs;

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

    lastResult = executeFn
      ? await executeFn(
          client,
          task.assignee ?? '',
          task.title,
          task.taskKey,
          effectiveTimeoutMs,
          { sessionId: task.sessionId },
        )
      : await executeTask(
          client,
          task.assignee ?? '',
          task.title,
          task.taskKey,
          effectiveTimeoutMs,
          contractMaxTokens,
          { sessionId: task.sessionId },
        );

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
        await updateTaskStatus(client, task, 'in_progress', lastResult.sessionId);
      } catch (err) {
        await logAndCaptureError(
          client,
          'debug',
          'Failed to persist sessionId after execution',
          { projectSlug, taskKey: task.taskKey, operation: 'persistSessionId' },
          err,
        );
      }
      // Notify session resumption on retry
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

    // Record circuit breaker failure
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
      // Notify backoff exhausted
      try {
        await client.mutation(api.notifications.notifyBackoffExhausted, {
          userId: `owner:${projectSlug}`,
          taskKey: task.taskKey,
          maxRetries: config.maxRetries,
        });
      } catch (err) {
        await logAndCaptureError(
          client,
          'debug',
          'Backoff exhausted notification failed',
          { projectSlug, taskKey: task.taskKey, operation: 'notifyBackoffExhausted' },
          err,
        );
      }
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

      // Notify task failure
      try {
        await client.mutation(api.notifications.notifyTaskFailed, {
          userId: `owner:${projectSlug}`,
          taskKey: task.taskKey,
          taskTitle: task.title,
          projectSlug,
          error: lastResult.error,
        });
      } catch (err) {
        await logAndCaptureError(
          client,
          'debug',
          'Task failure notification failed',
          { projectSlug, taskKey: task.taskKey, operation: 'notifyTaskFailed' },
          err,
        );
      }

      // Log recovery event
      try {
        await client.mutation(api.recoveryLog.logRecoveryEvent, {
          taskId: task.taskKey,
          agentId: task.assignee ?? 'unknown',
          eventType: 'blocked',
          details: `Task ${task.taskKey} blocked after ${attempt + 1} failed attempts`,
        });
      } catch (err) {
        await logAndCaptureError(
          client,
          'warning',
          'Recovery logging failed for blocked task',
          { projectSlug, taskKey: task.taskKey, agentId: task.assignee, operation: 'logRecoveryEvent' },
          err,
        );
      }

      markers.executeEndMs = Date.now();
      const failedTimings = aggregateCost(markers);
      await lifecycle.finalize('failed', task.taskKey, failedTimings);

      // Record dispatch outcome for weight tuning
      try {
        await client.mutation(api.scoreAudit.recordOutcome, {
          chosenTaskId: task.taskKey,
          outcome: 'rejected',
        });
      } catch {
        // Non-critical: outcome recording failure doesn't block dispatch
      }

      return {
        projectSlug,
        taskKey: task.taskKey,
        status: 'failed',
        error: lastResult.error,
      };
    }
  }

  markers.executeEndMs = Date.now();

  if (!lastResult || lastResult.status !== 'succeeded') {
    const noResultTimings = aggregateCost(markers);
    await lifecycle.finalize('failed', task.taskKey, noResultTimings);

    // Notify task failure (no-result path)
    try {
      await client.mutation(api.notifications.notifyTaskFailed, {
        userId: `owner:${projectSlug}`,
        taskKey: task.taskKey,
        taskTitle: task.title,
        projectSlug,
        error: lastResult?.error ?? 'task execution produced no result',
      });
    } catch (err) {
      await logAndCaptureError(
        client,
        'debug',
        'Task failure notification failed',
        { projectSlug, taskKey: task.taskKey, operation: 'notifyTaskFailed' },
        err,
      );
    }

    return {
      projectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: 'task execution produced no result',
    };
  }

  // Success path
  const durationMs = Date.now() - startMs;

  // Record dispatch outcome for weight tuning
  try {
    await client.mutation(api.scoreAudit.recordOutcome, {
      chosenTaskId: task.taskKey,
      outcome: 'accepted',
    });
  } catch {
    // Non-critical
  }

  // Record circuit breaker success
  if (task.assignee) {
    await recordCircuitSuccess(client, task.assignee, projectSlug, task.taskKey);
  }

  // Lifecycle: run afterRun hook on success
  const hookAfterStartMs = Date.now();
  if (harnessHooks?.afterRun && rootPath) {
    const hookErr = await runHooks(harnessHooks, 'afterRun', rootPath);
    markers.hookAfterStartMs = hookAfterStartMs;
    markers.hookAfterEndMs = Date.now();
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
  } else {
    markers.hookAfterStartMs = hookAfterStartMs;
    markers.hookAfterEndMs = Date.now();
  }

  markers.persistStartMs = Date.now();

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

  // Coverage threshold enforcement (best-effort; does not block if Convex is unavailable)
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
        await updateTaskStatus(client, task, 'blocked');
        const coverageTimings = aggregateCost(markers);
        await lifecycle.finalize('failed', task.taskKey, coverageTimings);
        return {
          projectSlug,
          taskKey: task.taskKey,
          status: 'failed',
          error: `Coverage ${lastResult.coveragePercentage.toFixed(1)}% is below threshold`,
        };
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

  // Mark task as done
  await updateTaskStatus(client, task, 'done', lastResult.sessionId);

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

  markers.persistEndMs = Date.now();
  const successTimings = aggregateCost(markers);

  await lifecycle.finalize('succeeded', task.taskKey, successTimings);

  return { projectSlug, taskKey: task.taskKey, status: 'succeeded' };
}

/**
 * Runs a single orchestrator cycle across all active projects.
 * Returns results for each project that was processed.
 */
export async function runAllProjects(
  config: OrchestratorConfig = DEFAULT_CONFIG,
  hooks?: IssueHooks,
  gitHooks?: GitHooks,
  deps?: {
    createClient?: () => ConvexHttpClient;
    loadProjects?: (client: ConvexHttpClient) => ReturnType<typeof loadActiveProjects>;
    runProjectFn?: (
      client: ConvexHttpClient,
      projectSlug: string,
      config: OrchestratorConfig,
      hooks?: IssueHooks,
      executeFn?: ExecuteFn,
      gitHooks?: GitHooks,
    ) => Promise<RunResult>;
  },
): Promise<RunResult[]> {
  const client = deps?.createClient ? deps.createClient() : createConvexClient();
  const projects = deps?.loadProjects ? await deps.loadProjects(client) : await loadActiveProjects(client);
  const results: RunResult[] = [];

  for (const project of projects) {
    try {
      const result = deps?.runProjectFn
        ? await deps.runProjectFn(client, project.slug, config, hooks, undefined, gitHooks)
        : await runProject(client, project.slug, config, hooks, undefined, gitHooks);
      results.push(result);
      if (result.status !== 'no_tasks') {
        console.log(
          `Project ${project.slug}: ${result.status}${result.taskKey ? ` (task: ${result.taskKey})` : ''}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== `no tasks available for project ${project.slug}`) {
        await logAndCaptureError(
          client,
          'fatal',
          `Project orchestration failed: ${msg}`,
          { projectSlug: project.slug, operation: 'runProject' },
          err,
        );
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

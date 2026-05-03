import { ConvexHttpClient } from 'convex/browser';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { loadTasks, loadTrackStatuses, loadActiveProjects, loadProject } from './candidates';
import { getBestTask } from './evaluator';
import { executeTask } from './executor';
import { selectBestCandidate } from '../policy/dispatch';
import { listDispatchPolicyStats, listHarnessReliabilityStats } from '../policy/statsClient';
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
import { DEFAULT_RETRY_CONFIG } from './types';
import { logAndCaptureError } from './logger';
import {
  validateAndPersist,
  createRunContractIfNeeded,
  RunContractValidationError,
  appendDispatchRejections,
} from './runContract';
import { filterEligibleTasks, type ConstraintContext } from './constraints';
import { append as walAppend, markCommitted as walCommit } from '../failover/wal';
import { StalenessCache } from '../failover/policyCache';
import { loadDispatchOptions } from '../policy/weightPresets';
import { resolveHarnessHooks } from './resolver';
import { runHooks } from './hookRunner';

interface PolicyStatsCacheEntry {
  policyStats: Awaited<ReturnType<typeof listDispatchPolicyStats>>;
  harnessStats: Awaited<ReturnType<typeof listHarnessReliabilityStats>>;
}

const policyStatsCache = new StalenessCache<PolicyStatsCacheEntry>();

interface RunResult {
  projectSlug: string;
  taskKey: string | null;
  status: 'succeeded' | 'failed' | 'no_tasks';
  error?: string;
}

/**
 * Appends an execution log to Convex.
 * Falls back to WAL if Convex is unreachable.
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
  const args = { projectSlug, runId, status, summary, rawOutput, trackId };
  const walEntry = walAppend({ type: 'mutation', target: 'executionLogs.appendLog', args });
  try {
    await client.mutation(api.executionLogs.appendLog, args);
    walCommit(walEntry.id);
  } catch (err) {
    // WAL entry remains for replay on reconnect
    console.warn(`[WAL] executionLogs.appendLog failed, event queued: ${walEntry.id}`);
  }
}

/**
 * Persists a work run record to Convex.
 * Falls back to WAL if Convex is unreachable.
 */
async function persistWorkRun(
  client: ConvexHttpClient,
  projectSlug: string,
  runId: string,
  status: 'queued' | 'running' | 'succeeded' | 'failed',
  selectedTaskKey?: string,
  finishedAt?: number,
): Promise<void> {
  const args = { projectSlug, runId, status, selectedTaskKey, startedAt: Date.now(), finishedAt };
  const walEntry = walAppend({ type: 'mutation', target: 'fleetCatalog.upsertWorkRun', args });
  try {
    await client.mutation(api.fleetCatalog.upsertWorkRun, args);
    walCommit(walEntry.id);
  } catch (err) {
    console.warn(`[WAL] fleetCatalog.upsertWorkRun failed, event queued: ${walEntry.id}`);
  }
}

/**
 * Updates a task status in Convex.
 * Falls back to WAL if Convex is unreachable.
 */
async function updateTaskStatus(
  client: ConvexHttpClient,
  task: Task,
  newStatus: 'todo' | 'ready' | 'in_progress' | 'blocked' | 'done',
): Promise<void> {
  const args = {
    projectSlug: task.projectSlug,
    trackId: task.trackId,
    taskKey: task.taskKey,
    title: task.title,
    status: newStatus,
    assignee: task.assignee,
    dependencies: task.dependencies,
  };
  const walEntry = walAppend({ type: 'mutation', target: 'fleetCatalog.upsertTask', args });
  try {
    await client.mutation(api.fleetCatalog.upsertTask, args);
    walCommit(walEntry.id);
  } catch (err) {
    console.warn(`[WAL] fleetCatalog.upsertTask failed, event queued: ${walEntry.id}`);
  }
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

  const project = await loadProject(client, projectSlug);
  const rootPath = project?.rootPath;

  const tasks = await loadTasks(client, projectSlug);
  const trackStatuses = await loadTrackStatuses(client, projectSlug);

  const allTasks = new Map<string, Task>();
  for (const t of tasks) {
    allTasks.set(t.taskKey, t);
  }

  const constraintContext: ConstraintContext = {
    allTasks,
  };

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

  let selected: import('../policy/dispatch').SelectedCandidate | null = null;
  try {
    // Try cache first, then Convex
    const cached = policyStatsCache.get();
    let policyStats: PolicyStatsCacheEntry['policyStats'];
    let harnessStats: PolicyStatsCacheEntry['harnessStats'];

    if (cached && !cached.stale) {
      policyStats = cached.data.policyStats;
      harnessStats = cached.data.harnessStats;
    } else {
      [policyStats, harnessStats] = await Promise.all([
        listDispatchPolicyStats(client, 1000),
        listHarnessReliabilityStats(client, 100),
      ]);
      policyStatsCache.set({ policyStats, harnessStats });
    }

    selected = await selectBestCandidate(
      eligible.map((c) => c.task),
      { name: 'opencode' },
      policyStats,
      harnessStats,
      loadDispatchOptions(projectSlug),
    );
  } catch (err) {
    // If Convex failed, try stale cache before legacy fallback
    const stale = policyStatsCache.get();
    if (stale) {
      try {
        selected = await selectBestCandidate(
          eligible.map((c) => c.task),
          { name: 'opencode' },
          stale.data.policyStats,
          stale.data.harnessStats,
          loadDispatchOptions(projectSlug),
        );
        console.warn('[failover] Using stale policy cache (Convex unreachable)');
      } catch {
        // scoring itself failed even with cached data
      }
    }
    if (!selected) {
      await logAndCaptureError(
        client,
        'warning',
        'Adaptive scoring failed, falling back to legacy evaluator',
        { projectSlug, operation: 'selectBestCandidate' },
        err,
      );
      // Fallback to legacy evaluator if adaptive scoring fails
      const fallback = getBestTask(
        eligible.map((c) => c.task),
        trackStatuses,
      );
      if (fallback) {
        selected = {
          task: fallback.task,
          trackId: fallback.trackId,
          score: fallback.score,
          breakdown: {},
          justification: fallback.rationale,
          llmTieBreak: false,
        };
      }
    }
  }

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
    } catch (err) {
      await logAndCaptureError(
        client,
        'warning',
        'Circuit breaker evaluation failed',
        { projectSlug, taskKey: task.taskKey, agentId: task.assignee, operation: 'circuitBreaker' },
        err,
      );
    }
  }

  console.log(
    `Dispatcher selected task ${task.taskKey} (score: ${selected.score.toFixed(3)}, reason: ${selected.justification})`,
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

  // Git: create branch for task if git hooks are provided
  if (gitHooks?.onTaskStart && rootPath) {
    try {
      const { branchName } = await gitHooks.onTaskStart(
        projectSlug,
        rootPath,
        task.taskKey,
        task.title,
      );
      console.log(`Git: branch ${branchName} created for task ${task.taskKey}`);
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

  // Lifecycle: load harness hooks and run beforeRun
  let harnessHooks;
  try {
    harnessHooks = await resolveHarnessHooks(client, task.assignee ?? '');
  } catch {
    harnessHooks = {};
  }

  if (harnessHooks.beforeRun && rootPath) {
    const hookErr = await runHooks(harnessHooks, 'beforeRun', rootPath);
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
    }
  }

  const startMs = Date.now();
  let lastResult: ExecutionResult | null = null;
  const retryManager = new RetryManager(DEFAULT_RETRY_CONFIG);

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
      } catch (err) {
        await logAndCaptureError(
          client,
          'warning',
          'Circuit breaker failure recording failed',
          { projectSlug, taskKey: task.taskKey, agentId: task.assignee, operation: 'recordCircuitFailure' },
          err,
        );
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
      } catch (err) {
        await logAndCaptureError(
          client,
          'warning',
          'Recovery logging failed for blocked task',
          { projectSlug, taskKey: task.taskKey, agentId: task.assignee, operation: 'logRecoveryEvent' },
          err,
        );
      }

      await persistWorkRun(
        client,
        projectSlug,
        runId,
        'failed',
        task.taskKey,
        Date.now(),
      );

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
    try {
      await client.mutation(api.circuitBreakers.recordCircuitSuccess, {
        agentId: task.assignee,
      });
    } catch (err) {
      await logAndCaptureError(
        client,
        'warning',
        'Circuit breaker success recording failed',
        { projectSlug, taskKey: task.taskKey, agentId: task.assignee, operation: 'recordCircuitSuccess' },
        err,
      );
    }
  }

  // Lifecycle: run afterRun hook on success
  if (harnessHooks?.afterRun && rootPath) {
    const hookErr = await runHooks(harnessHooks, 'afterRun', rootPath);
    if (hookErr) {
      console.warn(
        `afterRun hook failed for task ${task.taskKey}: exit ${hookErr.exitCode}, stderr: ${hookErr.stderr}`,
      );
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
      await logAndCaptureError(
        client,
        'warning',
        `Review hook failed: ${msg}`,
        { projectSlug, taskKey: task.taskKey, operation: 'runReview' },
        err,
      );
    }
  }

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
        await appendLog(
          client,
          projectSlug,
          runId,
          'failed',
          `Coverage threshold violation for task ${task.taskKey}: ${lastResult.coveragePercentage.toFixed(1)}%`,
          undefined,
          task.trackId,
        );
        await updateTaskStatus(client, task, 'blocked');
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
  await updateTaskStatus(client, task, 'done');

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
  hooks?: IssueHooks,
  gitHooks?: GitHooks,
): Promise<RunResult[]> {
  const client = createConvexClient();
  const projects = await loadActiveProjects(client);
  const results: RunResult[] = [];

  for (const project of projects) {
    try {
      const result = await runProject(client, project.slug, config, hooks, undefined, gitHooks);
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

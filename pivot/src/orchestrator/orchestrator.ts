import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { createConvexClient } from '../convexClient';
import { config as appConfig } from '../config';
import { loadActiveProjects } from './candidates';
import type {
  OrchestratorConfig,
  IssueHooks,
  ExecuteFn,
  GitHooks,
  CoverageHooks,
  QualityWorkflowHooks,
} from './types';
import { DEFAULT_CONFIG, resolveDispatchStage } from './types';
import { logAndCaptureError } from './logger';
import { append as walAppend, markCommitted as walCommit } from '../failover/wal';
import {
  checkBudget,
  checkCircuit,
  updateTaskStatus as stageUpdateTaskStatus,
  reserveBudgetAtDispatch,
  reconcileBudgetOnComplete,
  ESTIMATED_COST_PER_DISPATCH,
  claimTaskForExecution,
} from './stages';
import { aggregateCost, type TimingMarkers } from './stages/aggregateCost';
import { PipelineRunLifecycle } from './stages/pipelineRunLifecycle';
import { loadAndFilterTasks } from './stages/loadAndFilterTasks';
import { selectCandidate } from './stages/selectCandidate';
import { prepareExecution, runBeforeHook } from './stages/prepareExecution';
import { executeWithRetry } from './stages/executeWithRetry';
import { handleSuccess } from './stages/handleSuccess';
import { handleTaskFailure } from './stages/handleTaskFailure';
import { runConfiguredQualityWorkflow } from './qualityWorkflowDispatch';

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

async function updateTaskStatus(
  client: ConvexHttpClient,
  task: import('./types').Task,
  newStatus: import('./types').TaskStatus,
  sessionId?: string,
): Promise<void> {
  await stageUpdateTaskStatus(client, task, newStatus, sessionId, walAdapter);
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
  qualityWorkflowHooks?: QualityWorkflowHooks,
): Promise<RunResult> {
  const runId = `run-${projectSlug}-${Date.now()}`;
  const lifecycle = new PipelineRunLifecycle(client, projectSlug, runId, walAdapter);
  const markers: TimingMarkers = { pipelineStartMs: Date.now() };

  markers.loadStartMs = Date.now();
  const { rootPath, eligible, trackStatuses, trackContexts } = await loadAndFilterTasks(client, projectSlug);
  markers.loadEndMs = Date.now();

  markers.scoreStartMs = Date.now();
  const selected = await selectCandidate(
    client,
    projectSlug,
    eligible.map((c) => c.task),
    trackStatuses,
  );
  markers.scoreEndMs = Date.now();

  if (!selected) {
    return { projectSlug, taskKey: null, status: 'no_tasks' };
  }

  const task = selected.task;
  const { stage: dispatchStage, agentOverride } = resolveDispatchStage(task);
  const effectiveAgent = agentOverride ?? task.assignee;

  const circuit = await checkCircuit(client, effectiveAgent, projectSlug, task.taskKey);
  if (!circuit.allowed) {
    console.log(`Circuit breaker open for agent ${effectiveAgent}, skipping task ${task.taskKey}`);
    return { projectSlug, taskKey: task.taskKey, status: 'failed', error: circuit.reason };
  }

  const budget = await checkBudget(client, projectSlug, task.taskKey);
  if (!budget.allowed && budget.policy === 'strict') {
    return { projectSlug, taskKey: task.taskKey, status: 'failed', error: budget.reason };
  }

  const reservation = await reserveBudgetAtDispatch(client, projectSlug, task.taskKey);
  if (!reservation.reserved && !budget.allowed && budget.policy === 'strict') {
    return { projectSlug, taskKey: task.taskKey, status: 'failed', error: reservation.reason ?? 'Budget reservation failed' };
  }

  console.log(
    `Dispatcher selected task ${task.taskKey} (score: ${selected.score.toFixed(3)}, reason: ${selected.justification}, stage: ${dispatchStage})`,
  );

  await lifecycle.appendLog('running', `Dispatching task ${task.taskKey}: ${task.title} [stage: ${dispatchStage}]`, undefined, task.trackId);
  await lifecycle.start(task.taskKey);

  if (dispatchStage === 'executor') {
    const claim = await claimTaskForExecution(
      client, projectSlug, task, runId, reservation.reservationId, lifecycle, { walAdapter },
    );
    if (!claim.claimed) {
      return { projectSlug, taskKey: task.taskKey, status: 'failed', error: claim.error };
    }
  }

  const { harnessHooks } = await prepareExecution(client, projectSlug, task, rootPath, gitHooks);

  const hookTimings = await runBeforeHook(client, projectSlug, task.taskKey, harnessHooks, rootPath);
  markers.hookBeforeStartMs = hookTimings.startMs;
  markers.hookBeforeEndMs = hookTimings.endMs;

  markers.executeStartMs = Date.now();
  const startMs = markers.executeStartMs;
  const { beforeCoverage, contractMaxExecutionMs, contractMaxTokens, previousRecoveryAction } =
    await loadPreExecutionState(client, projectSlug, task.taskKey);

  if (previousRecoveryAction === 'replan' || previousRecoveryAction === 'split') {
    const originalSessionId = task.sessionId;
    try {
      await updateTaskStatus(client, task, 'in_progress', undefined);
      task.sessionId = undefined;
    } catch (err) {
      task.sessionId = originalSessionId;
      await logAndCaptureError(
        client, 'warning', 'Failed to clear sessionId after replan/split',
        { projectSlug, taskKey: task.taskKey, operation: 'clearSessionId' }, err,
      );
    }
  }

  await client.mutation(api.taskRecovery.setTaskStartedAt, {
    projectSlug, trackId: task.trackId, taskKey: task.taskKey, startedAt: startMs,
  });

  const taskForExecution = agentOverride
    ? { ...task, assignee: agentOverride }
    : task;
  const taskContext = trackContexts.get(task.trackId);
  const { lastResult } = await executeWithRetry(
    client, projectSlug, taskForExecution, config, hooks, executeFn, lifecycle,
    contractMaxExecutionMs, contractMaxTokens,
    taskContext, appConfig.orchestrator.contextMaxChars,
  );
  markers.executeEndMs = Date.now();

  if (!lastResult || lastResult.status !== 'succeeded') {
    const failedTimings = aggregateCost(markers);
    await lifecycle.finalize('failed', task.taskKey, failedTimings);
    await reconcileBudgetOnComplete(client, projectSlug, reservation.reservationId, ESTIMATED_COST_PER_DISPATCH);
    await handleFailedResult(client, projectSlug, task, lastResult);
    return {
      projectSlug, taskKey: task.taskKey, status: 'failed',
      error: lastResult?.error ?? 'task execution produced no result',
    };
  }

  if (dispatchStage === 'executor') {
    const qualityResult = await runConfiguredQualityWorkflow(
      client,
      projectSlug,
      task,
      runId,
      rootPath ?? '',
      taskContext,
      qualityWorkflowHooks,
    );
    if (qualityResult) {
      if (qualityResult.status === 'failed') {
        const failedTimings = aggregateCost(markers);
        await lifecycle.finalize('failed', task.taskKey, failedTimings);
        await reconcileBudgetOnComplete(client, projectSlug, reservation.reservationId, ESTIMATED_COST_PER_DISPATCH);
        await updateTaskStatus(client, task, 'blocked');
        await handleTaskFailure(client, {
          projectSlug,
          taskKey: task.taskKey,
          taskTitle: task.title,
          assignee: task.assignee,
          error: qualityResult.error,
        });
        return {
          projectSlug,
          taskKey: task.taskKey,
          status: 'failed',
          error: qualityResult.error,
        };
      }
      await lifecycle.appendLog('running', qualityResult.summary, undefined, task.trackId);
    }
  }

  markers.persistStartMs = Date.now();
  const { coverageViolated, costUSD } = await handleSuccess(
    client, projectSlug, runId, task, lastResult, startMs,
    rootPath, harnessHooks, hooks, gitHooks, coverageHooks, beforeCoverage, lifecycle, markers,
    dispatchStage, effectiveAgent,
  );

  if (coverageViolated) {
    const coverageTimings = aggregateCost(markers);
    await lifecycle.finalize('failed', task.taskKey, coverageTimings);
    await reconcileBudgetOnComplete(client, projectSlug, reservation.reservationId, costUSD);
    return {
      projectSlug, taskKey: task.taskKey, status: 'failed',
      error: `Coverage ${lastResult.coveragePercentage!.toFixed(1)}% is below threshold`,
    };
  }

  markers.persistEndMs = Date.now();
  const successTimings = aggregateCost(markers);
  await lifecycle.finalize('succeeded', task.taskKey, successTimings);
  await reconcileBudgetOnComplete(client, projectSlug, reservation.reservationId, costUSD);

  return { projectSlug, taskKey: task.taskKey, status: 'succeeded' };
}

/**
 * Loads coverage and contract state needed before execution.
 */
async function loadPreExecutionState(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
): Promise<{
  beforeCoverage: number | undefined;
  contractMaxExecutionMs: number | undefined;
  contractMaxTokens: number | undefined;
  previousRecoveryAction: string | undefined;
}> {
  let beforeCoverage: number | undefined;
  let contractMaxExecutionMs: number | undefined;
  let contractMaxTokens: number | undefined;
  let previousRecoveryAction: string | undefined;

  try {
    const latest = await client.query(api.coverageRecords.getLatestCoverage, { projectSlug });
    beforeCoverage = latest?.percentage;
  } catch (err) {
    await logAndCaptureError(
      client, 'debug', 'Coverage lookup failed',
      { projectSlug, taskKey, operation: 'coverageLookup' }, err,
    );
  }

  try {
    const contract = await client.query(api.runContracts.getRunContract, { taskId: taskKey });
    if (contract) {
      contractMaxExecutionMs = contract.maxExecutionMs ?? undefined;
      contractMaxTokens = contract.maxTokens ?? undefined;
      previousRecoveryAction = contract.recoveryAction ?? undefined;
    }
  } catch (err) {
    await logAndCaptureError(
      client, 'debug', 'Run contract lookup failed',
      { projectSlug, taskKey, operation: 'getRunContract' }, err,
    );
  }

  return { beforeCoverage, contractMaxExecutionMs, contractMaxTokens, previousRecoveryAction };
}

/**
 * Handles a failed execution result: finalize lifecycle and record outcome.
 */
async function handleFailedResult(
  client: ConvexHttpClient,
  projectSlug: string,
  task: import('./types').Task,
  lastResult: import('./types').ExecutionResult | null,
): Promise<void> {
  await handleTaskFailure(client, {
    projectSlug,
    taskKey: task.taskKey,
    taskTitle: task.title,
    assignee: task.assignee,
    error: lastResult?.error ?? 'task execution produced no result',
  });
  try {
    await client.mutation(api.scoreAudit.recordOutcome, {
      chosenTaskId: task.taskKey, outcome: 'rejected',
    });
  } catch { /* Non-critical */ }
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

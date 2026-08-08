import { ConvexHttpClient } from 'convex/browser';
import { existsSync } from 'node:fs';
import { api } from '../../../convex/_generated/api';
import { createConvexClient } from '../convexClient';
import { config as appConfig } from '../config';
import { loadActiveProjects } from './candidates';
import type { OrchestratorConfig, IssueHooks, ExecuteFn, GitHooks, CoverageHooks, QualityWorkflowHooks } from './types';
import { DEFAULT_CONFIG, resolveDispatchStage } from './types';
import { logAndCaptureError } from './logger';
import { append as walAppend, markCommitted as walCommit } from '../failover/wal';
import { checkBudget, checkCircuit, updateTaskStatus as stageUpdateTaskStatus, reserveBudgetAtDispatch, reconcileBudgetOnComplete, ESTIMATED_COST_PER_DISPATCH, claimTaskForExecution } from './stages';
import { aggregateCost, type TimingMarkers } from './stages/aggregateCost';
import { PipelineRunLifecycle } from './stages/pipelineRunLifecycle';
import { loadAndFilterTasks } from './stages/loadAndFilterTasks';
import { selectCandidate } from './stages/selectCandidate';
import { prepareExecution, runBeforeHook } from './stages/prepareExecution';
import { executeWithRetry } from './stages/executeWithRetry';
import { handleSuccess } from './stages/handleSuccess';
import { handleTaskFailure } from './stages/handleTaskFailure';
import { runConfiguredQualityWorkflow } from './qualityWorkflowDispatch';
import { resolveAgentCommand } from './resolver';
import { checkPiAgentReadiness } from './piReadiness';

export interface RunResult {
  projectSlug: string;
  taskKey: string | null;
  status: 'succeeded' | 'failed' | 'no_tasks';
  error?: string;
}

export interface RunPreflightResult {
  ok: boolean;
  reason?: string;
}

export type RunPreflight = (client: ConvexHttpClient, projectSlug: string, task: import('./types').Task, rootPath: string | undefined) => Promise<RunPreflightResult>;

export interface ProjectRunScope {
  requiredTaskKey?: string;
  /** Git lifecycle used by a caller that has already prepared a task branch. */
  gitHooks?: GitHooks;
  /** Skip the normal task-start hook when the caller prepared the branch before claim. */
  skipGitStart?: boolean;
}

const walAdapter = {
  append: walAppend,
  commit: walCommit,
};

const defaultRunPreflight: RunPreflight = async (client, _projectSlug, task, rootPath) => {
  if (!rootPath || !existsSync(rootPath)) {
    return { ok: false, reason: 'Project path is missing or inaccessible.' };
  }

  if (!task.assignee) {
    return { ok: false, reason: `Task ${task.taskKey} has no assigned agent.` };
  }
  const resolved = await resolveAgentCommand(client, task.assignee);
  if (!resolved.providerId || !resolved.modelId) {
    return { ok: false, reason: `Agent "${task.assignee}" is not mapped to a provider/model.` };
  }
  const modelRef = `${resolved.providerId}/${resolved.modelId}`;
  const readiness = checkPiAgentReadiness(modelRef, process.env, undefined, task.assignee);
  return readiness.ok ? { ok: true } : { ok: false, reason: readiness.reason ?? `Pi readiness failed for ${modelRef}.` };
};

async function runPreflightWhenRequired(
  client: ConvexHttpClient,
  projectSlug: string,
  task: import('./types').Task,
  rootPath: string | undefined,
  preflight: RunPreflight | undefined,
): Promise<RunPreflightResult> {
  return (preflight ?? defaultRunPreflight)(client, projectSlug, task, rootPath);
}

async function updateTaskStatus(client: ConvexHttpClient, task: import('./types').Task, newStatus: import('./types').TaskStatus, sessionId?: string): Promise<void> {
  await stageUpdateTaskStatus(client, task, newStatus, sessionId, walAdapter);
}

async function selectScopedCandidate(
  client: ConvexHttpClient,
  projectSlug: string,
  eligible: Awaited<ReturnType<typeof loadAndFilterTasks>>['eligible'],
  trackStatuses: Map<string, string>,
  requiredTaskKey?: string,
) {
  const scopedEligible = requiredTaskKey
    ? eligible.filter(candidate => candidate.task.taskKey === requiredTaskKey)
    : eligible;
  return selectCandidate(client, projectSlug, scopedEligible.map(candidate => candidate.task), trackStatuses);
}

function noCandidateResult(projectSlug: string, requiredTaskKey?: string): RunResult {
  return requiredTaskKey
    ? {
        projectSlug,
        taskKey: requiredTaskKey,
        status: 'failed',
        error: `Requested task ${requiredTaskKey} is not eligible for execution.`,
      }
    : { projectSlug, taskKey: null, status: 'no_tasks' };
}

/**
 * Runs a single orchestrator cycle for one project.
 * Selects the best task, executes it with retry logic,
 * persists results, and handles failure/blocker creation.
 * @param client - Convex client used for project and run persistence
 * @param projectSlug - Canonical project slug to execute
 * @param config - Retry, timeout, and token limits for this cycle
 * @param hooks - Optional issue-reporting hooks
 * @param executeFn - Optional execution backend override
 * @param gitHooks - Optional Git lifecycle hooks
 * @param coverageHooks - Optional coverage collection hooks
 * @param qualityWorkflowHooks - Optional quality workflow hooks
 * @param preflight - Optional readiness check performed before task claim
 * @param scope - Optional exact-task and pre-prepared Git scope
 * @returns The selected task and terminal cycle result
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
  preflight?: RunPreflight,
  scope?: ProjectRunScope,
): Promise<RunResult> {
  const effectiveGitHooks = scope?.gitHooks ?? gitHooks;
  const markers: TimingMarkers = { pipelineStartMs: Date.now() };

  markers.loadStartMs = Date.now();
  const { projectSlug: resolvedProjectSlug, rootPath, eligible, trackStatuses, trackContexts } = await loadAndFilterTasks(client, projectSlug);
  markers.loadEndMs = Date.now();

  const runId = `run-${resolvedProjectSlug}-${Date.now()}`;
  const lifecycle = new PipelineRunLifecycle(client, resolvedProjectSlug, runId, walAdapter);

  markers.scoreStartMs = Date.now();
  const selected = await selectScopedCandidate(
    client,
    resolvedProjectSlug,
    eligible,
    trackStatuses,
    scope?.requiredTaskKey,
  );
  markers.scoreEndMs = Date.now();

  if (!selected) {
    return noCandidateResult(resolvedProjectSlug, scope?.requiredTaskKey);
  }

  const task = selected.task;
  const { stage: dispatchStage, agentOverride } = resolveDispatchStage(task);
  const taskForPreflight = agentOverride ? { ...task, assignee: agentOverride } : task;

  const readiness = await runPreflightWhenRequired(
    client,
    resolvedProjectSlug,
    taskForPreflight,
    rootPath,
    preflight,
  );
  if (!readiness.ok) {
    return {
      projectSlug: resolvedProjectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: readiness.reason ?? 'Run preflight failed.',
    };
  }

  const effectiveAgent = agentOverride ?? task.assignee;

  const circuit = await checkCircuit(client, effectiveAgent, resolvedProjectSlug, task.taskKey);
  if (!circuit.allowed) {
    console.log(`Circuit breaker open for agent ${effectiveAgent}, skipping task ${task.taskKey}`);
    return {
      projectSlug: resolvedProjectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: circuit.reason,
    };
  }

  const budget = await checkBudget(client, resolvedProjectSlug, task.taskKey);
  if (!budget.allowed && budget.policy === 'strict') {
    return {
      projectSlug: resolvedProjectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: budget.reason,
    };
  }

  const reservation = await reserveBudgetAtDispatch(client, resolvedProjectSlug, task.taskKey);
  if (!reservation.reserved && !budget.allowed && budget.policy === 'strict') {
    return {
      projectSlug: resolvedProjectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: reservation.reason ?? 'Budget reservation failed',
    };
  }

  console.log(`Dispatcher selected task ${task.taskKey} (score: ${selected.score.toFixed(3)}, reason: ${selected.justification}, stage: ${dispatchStage})`);

  await lifecycle.appendLog('running', `Dispatching task ${task.taskKey}: ${task.title} [stage: ${dispatchStage}]`, undefined, task.trackId);
  await lifecycle.start(task.taskKey);

  if (dispatchStage === 'executor') {
    const claim = await claimTaskForExecution(client, resolvedProjectSlug, task, runId, reservation.reservationId, lifecycle, { walAdapter });
    if (!claim.claimed) {
      return {
        projectSlug: resolvedProjectSlug,
        taskKey: task.taskKey,
        status: 'failed',
        error: claim.error,
      };
    }
  }

  const { harnessHooks } = await prepareExecution(client, resolvedProjectSlug, task, rootPath, effectiveGitHooks, scope?.skipGitStart);

  const hookTimings = await runBeforeHook(client, resolvedProjectSlug, task.taskKey, harnessHooks, rootPath);
  markers.hookBeforeStartMs = hookTimings.startMs;
  markers.hookBeforeEndMs = hookTimings.endMs;

  markers.executeStartMs = Date.now();
  const startMs = markers.executeStartMs;
  const { beforeCoverage, contractMaxExecutionMs, contractMaxTokens, previousRecoveryAction } = await loadPreExecutionState(client, resolvedProjectSlug, task.taskKey);

  await clearSessionAfterRecovery(client, resolvedProjectSlug, task, previousRecoveryAction);

  await client.mutation(api.taskRecovery.setTaskStartedAt, {
    projectSlug: resolvedProjectSlug,
    trackId: task.trackId,
    taskKey: task.taskKey,
    startedAt: startMs,
  });

  const taskForExecution = agentOverride ? { ...task, assignee: agentOverride } : task;
  const taskContext = trackContexts.get(task.trackId);
  const { lastResult } = await executeWithRetry(client, resolvedProjectSlug, taskForExecution, config, hooks, executeFn, lifecycle, contractMaxExecutionMs, contractMaxTokens, taskContext, appConfig.orchestrator.contextMaxChars, rootPath);
  markers.executeEndMs = Date.now();

  if (!lastResult || lastResult.status !== 'succeeded') {
    const failedTimings = aggregateCost(markers);
    await lifecycle.finalize('failed', task.taskKey, failedTimings);
    await reconcileBudgetOnComplete(client, resolvedProjectSlug, reservation.reservationId, ESTIMATED_COST_PER_DISPATCH);
    await handleFailedResult(client, resolvedProjectSlug, task, lastResult);
    return {
      projectSlug: resolvedProjectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: lastResult?.error ?? 'task execution produced no result',
    };
  }

  if (dispatchStage === 'executor') {
    const qualityResult = await runConfiguredQualityWorkflow(client, resolvedProjectSlug, task, runId, rootPath ?? '', taskContext, qualityWorkflowHooks);
    if (qualityResult) {
      if (qualityResult.status === 'failed') {
        const failedTimings = aggregateCost(markers);
        await lifecycle.finalize('failed', task.taskKey, failedTimings);
        await reconcileBudgetOnComplete(client, resolvedProjectSlug, reservation.reservationId, ESTIMATED_COST_PER_DISPATCH);
        await updateTaskStatus(client, task, 'blocked');
        await handleTaskFailure(client, {
          projectSlug: resolvedProjectSlug,
          taskKey: task.taskKey,
          taskTitle: task.title,
          assignee: task.assignee,
          error: qualityResult.error,
        });
        return {
          projectSlug: resolvedProjectSlug,
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
    client,
    resolvedProjectSlug,
    runId,
    task,
    lastResult,
    startMs,
    rootPath,
    harnessHooks,
    hooks,
    effectiveGitHooks,
    coverageHooks,
    beforeCoverage,
    lifecycle,
    markers,
    dispatchStage,
    effectiveAgent,
  );

  if (coverageViolated) {
    const coverageTimings = aggregateCost(markers);
    await lifecycle.finalize('failed', task.taskKey, coverageTimings);
    await reconcileBudgetOnComplete(client, resolvedProjectSlug, reservation.reservationId, costUSD);
    return {
      projectSlug: resolvedProjectSlug,
      taskKey: task.taskKey,
      status: 'failed',
      error: `Coverage ${lastResult.coveragePercentage!.toFixed(1)}% is below threshold`,
    };
  }

  markers.persistEndMs = Date.now();
  const successTimings = aggregateCost(markers);
  await lifecycle.finalize('succeeded', task.taskKey, successTimings);
  await reconcileBudgetOnComplete(client, resolvedProjectSlug, reservation.reservationId, costUSD);

  return { projectSlug: resolvedProjectSlug, taskKey: task.taskKey, status: 'succeeded' };
}

async function clearSessionAfterRecovery(
  client: ConvexHttpClient,
  projectSlug: string,
  task: import('./types').Task,
  recoveryAction: string | undefined,
): Promise<void> {
  if (recoveryAction !== 'replan' && recoveryAction !== 'split') return;

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
    await logAndCaptureError(client, 'debug', 'Coverage lookup failed', { projectSlug, taskKey, operation: 'coverageLookup' }, err);
  }

  try {
    const contract = await client.query(api.runContracts.getRunContract, { taskId: taskKey });
    if (contract) {
      contractMaxExecutionMs = contract.maxExecutionMs ?? undefined;
      contractMaxTokens = contract.maxTokens ?? undefined;
      previousRecoveryAction = contract.recoveryAction ?? undefined;
    }
  } catch (err) {
    await logAndCaptureError(client, 'debug', 'Run contract lookup failed', { projectSlug, taskKey, operation: 'getRunContract' }, err);
  }

  return { beforeCoverage, contractMaxExecutionMs, contractMaxTokens, previousRecoveryAction };
}

/**
 * Handles a failed execution result: finalize lifecycle and record outcome.
 */
async function handleFailedResult(client: ConvexHttpClient, projectSlug: string, task: import('./types').Task, lastResult: import('./types').ExecutionResult | null): Promise<void> {
  await handleTaskFailure(client, {
    projectSlug,
    taskKey: task.taskKey,
    taskTitle: task.title,
    assignee: task.assignee,
    error: lastResult?.error ?? 'task execution produced no result',
  });
  try {
    await client.mutation(api.scoreAudit.recordOutcome, {
      chosenTaskId: task.taskKey,
      outcome: 'rejected',
    });
  } catch {
    /* Non-critical */
  }
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
    runProjectFn?: (client: ConvexHttpClient, projectSlug: string, config: OrchestratorConfig, hooks?: IssueHooks, executeFn?: ExecuteFn, gitHooks?: GitHooks, qualityWorkflowHooks?: QualityWorkflowHooks) => Promise<RunResult>;
  },
  qualityWorkflowHooks?: QualityWorkflowHooks,
): Promise<RunResult[]> {
  const client = deps?.createClient ? deps.createClient() : createConvexClient();
  const projects = deps?.loadProjects ? await deps.loadProjects(client) : await loadActiveProjects(client);
  const results: RunResult[] = [];

  for (const project of projects) {
    try {
      const result = deps?.runProjectFn
        ? await deps.runProjectFn(client, project.slug, config, hooks, undefined, gitHooks, qualityWorkflowHooks)
        : await runProject(client, project.slug, config, hooks, undefined, gitHooks, undefined, qualityWorkflowHooks);
      results.push(result);
      if (result.status !== 'no_tasks') {
        console.log(`Project ${project.slug}: ${result.status}${result.taskKey ? ` (task: ${result.taskKey})` : ''}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== `no tasks available for project ${project.slug}`) {
        await logAndCaptureError(client, 'fatal', `Project orchestration failed: ${msg}`, { projectSlug: project.slug, operation: 'runProject' }, err);
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

import type {
  Agent,
  Task,
  StageResult,
  PipelineExecution,
  PipelineStage,
  StageExecutor,
  AgentRole,
} from './agentTypes.js';
import { STAGE_ORDER, MAX_RETRIES } from './agentTypes.js';
import { executeDispatch } from './stages/dispatch.js';
import { ArchitectExecutor } from './stages/architect.js';
import { ExecutorAgent } from './stages/executor.js';
import { ReviewerAgent } from './stages/reviewer.js';
import { MergerAgent } from './stages/merger.js';
import { sumStageCosts } from './costTracker.js';

export interface OrchestratorOptions {
  stages?: Partial<Record<Exclude<PipelineStage, 'dispatch'>, StageExecutor>>;
}

const ROLE_FOR_STAGE: Record<Exclude<PipelineStage, 'dispatch'>, AgentRole> = {
  architect: 'architect',
  executor: 'executor',
  reviewer: 'reviewer',
  merger: 'merger',
};

/**
 * Find the best available agent for a specific role.
 */
export function findAgentForStage(
  stage: Exclude<PipelineStage, 'dispatch'>,
  agents: Agent[],
  task: Task,
): Agent | undefined {
  const requiredRole = ROLE_FOR_STAGE[stage];
  const candidates = agents.filter(
    (a) =>
      a.role === requiredRole &&
      a.status === 'active' &&
      a.workload < a.maxWorkload,
  );

  if (candidates.length === 0) return undefined;

  // Simple scoring: skill overlap + availability
  const scored = candidates.map((agent) => {
    const overlap = task.description
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => agent.skills.some((s) => s.toLowerCase() === word)).length;
    const availability =
      1 - agent.workload / Math.max(agent.maxWorkload, 1);
    return { agent, score: overlap + availability * 5 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].agent;
}

/**
 * Determine which pipeline stage a task is currently in.
 */
export function getCurrentStage(task: Task): PipelineStage {
  switch (task.status) {
    case 'ready':
      return 'dispatch';
    case 'in_progress':
      // If no assignee, needs dispatch first
      if (!task.assigneeId) return 'dispatch';
      // If no pipeline runs yet, start with architect
      return 'architect';
    case 'review':
      return 'reviewer';
    case 'done':
    case 'blocked':
    case 'backlog':
      return 'dispatch'; // blocked/backlog tasks re-enter at dispatch
    default:
      return 'dispatch';
  }
}

/**
 * PipelineOrchestrator drives a single task through all 5 stages.
 * Pure logic — does NOT mutate Convex state.
 */
export class PipelineOrchestrator {
  private readonly stageExecutors: Record<
    Exclude<PipelineStage, 'dispatch'>,
    StageExecutor
  >;

  constructor(options: OrchestratorOptions = {}) {
    this.stageExecutors = {
      architect: options.stages?.architect ?? new ArchitectExecutor(),
      executor: options.stages?.executor ?? new ExecutorAgent(),
      reviewer: options.stages?.reviewer ?? new ReviewerAgent(),
      merger: options.stages?.merger ?? new MergerAgent(),
    };
  }

  /**
   * Run a single task through its pipeline stages.
   * Returns the full execution result without mutating state.
   */
  async runTask(
    task: Task,
    agents: Agent[],
    retryCount = 0,
  ): Promise<PipelineExecution> {
    const startedAt = Date.now();
    const stages: StageResult[] = [];
    let currentTask = task;

    // ── Dispatch ──
    const dispatchResult = executeDispatch(currentTask, agents);
    stages.push(dispatchResult.stageResult);

    if (!dispatchResult.assigned || !dispatchResult.agentId) {
      return this.buildResult(currentTask, stages, startedAt);
    }

    const primaryAgent = agents.find((a) => a._id === dispatchResult.agentId);
    if (!primaryAgent) {
      stages.push({
        stage: 'dispatch',
        status: 'failed',
        cost: 0,
        error: 'Assigned agent not found in agent list',
        startedAt,
        completedAt: Date.now(),
      });
      return this.buildResult(currentTask, stages, startedAt);
    }

    // Simulate updated task after dispatch
    currentTask = {
      ...currentTask,
      status: 'in_progress',
      assigneeId: primaryAgent._id,
    };

    // ── Run remaining stages in order ──
    const remainingStages: Array<Exclude<PipelineStage, 'dispatch'>> = [
      'architect',
      'executor',
      'reviewer',
      'merger',
    ];

    for (const stageName of remainingStages) {
      const stageAgent =
        stageName === 'executor'
          ? primaryAgent
          : findAgentForStage(stageName, agents, currentTask);

      if (!stageAgent) {
        stages.push({
          stage: stageName,
          status: 'failed',
          cost: 0,
          error: `No available ${ROLE_FOR_STAGE[stageName]} agent found`,
          startedAt: Date.now(),
          completedAt: Date.now(),
        });
        break;
      }

      const executor = this.stageExecutors[stageName];
      const result = await executor.execute(currentTask, stageAgent, {
        convexClient: null,
        previousStages: stages,
        retryCount,
      });

      stages.push(result);

      if (result.status === 'failed') {
        // Failure handling per spec:
        // - Architect/Executor/Reviewer fail → retry or block
        // - Merger fail → retry merger specifically
        if (retryCount >= MAX_RETRIES) {
          currentTask = { ...currentTask, status: 'blocked' };
        } else {
          currentTask = { ...currentTask, status: 'ready' };
        }
        break;
      }

      // Update task status after successful stage
      if (stageName === 'executor') {
        currentTask = { ...currentTask, status: 'review' };
      } else if (stageName === 'merger') {
        currentTask = { ...currentTask, status: 'done' };
      }
    }

    return this.buildResult(currentTask, stages, startedAt);
  }

  private buildResult(
    task: Task,
    stages: StageResult[],
    startedAt: number,
  ): PipelineExecution {
    const completedCosts = stages
      .filter((s) => s.status === 'completed')
      .map((s) => s.cost);

    return {
      taskId: task._id,
      stages,
      totalCost: sumStageCosts(completedCosts),
      finalStatus: task.status,
      startedAt,
      completedAt: Date.now(),
    };
  }
}

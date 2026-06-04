import type { Agent, Task, StageResult } from '../agentTypes.js';
import {
  selectModelForTask,
  buildFallbackChain,
  aggregateModelHistory,
  type RoutingPolicy,
  type ModelSelectionResult,
  type ModelHistoricalData,
  type FallbackChainEntry,
} from '../../policy/modelRouter.js';
import type { RunContractRecord } from '../../policy/rollup.js';
import { deriveTaskKind } from '../../policy/rollup.js';

export interface DispatchResult {
  assigned: boolean;
  agentId?: string;
  stageResult: StageResult;
  modelSelection?: ModelSelectionResult;
  fallbackChain?: FallbackChainEntry[];
}

/**
 * Calculate a match score between a task and an agent.
 * Higher score = better match.
 * Factors: skill overlap, current workload (prefer less busy), reliability.
 */
export function scoreAgentMatch(agent: Agent, task: Task): number {
  const skillOverlap = task.description
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => agent.skills.some((s) => s.toLowerCase() === word)).length;

  const workloadRatio = agent.workload / Math.max(agent.maxWorkload, 1);
  const availabilityBonus = (1 - workloadRatio) * 10;

  const reliabilityBonus = agent.reliability * 5;

  return skillOverlap + availabilityBonus + reliabilityBonus;
}

/**
 * Find the best available agent for a task.
 * Returns undefined if no suitable agent is found.
 */
export function findBestAgent(task: Task, agents: Agent[]): Agent | undefined {
  const available = agents.filter(
    (a) => a.status === 'active' && a.workload < a.maxWorkload,
  );

  if (available.length === 0) return undefined;

  const scored = available.map((agent) => ({
    agent,
    score: scoreAgentMatch(agent, task),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].agent;
}

/**
 * Execute the dispatch stage for a single task.
 * Finds the best agent, returns the assignment decision.
 * Does NOT mutate Convex state — pure logic.
 *
 * When a routing policy is provided, uses the model router to select
 * the optimal model and build a fallback chain.
 */
export function executeDispatch(
  task: Task,
  agents: Agent[],
  options?: {
    routingPolicy?: RoutingPolicy;
    historicalData?: ModelHistoricalData[];
    runRecords?: RunContractRecord[];
  },
): DispatchResult {
  if (task.status !== 'ready') {
    return {
      assigned: false,
      stageResult: {
        stage: 'dispatch',
        status: 'skipped',
        cost: 0,
        output: `Task status is ${task.status}, not ready`,
        startedAt: Date.now(),
        completedAt: Date.now(),
      },
    };
  }

  const agent = findBestAgent(task, agents);

  if (!agent) {
    return {
      assigned: false,
      stageResult: {
        stage: 'dispatch',
        status: 'skipped',
        cost: 0,
        output: 'No available agent found',
        startedAt: Date.now(),
        completedAt: Date.now(),
      },
    };
  }

  // Apply model routing if policy is set and not manual
  let modelSelection: ModelSelectionResult | undefined;
  let fallbackChain: FallbackChainEntry[] | undefined;

  if (options?.routingPolicy && options.routingPolicy !== 'manual') {
    const historicalData = options.historicalData ?? [];

    // If run records provided but no historical data, aggregate it
    const data =
      historicalData.length > 0
        ? historicalData
        : options.runRecords
          ? aggregateModelHistory(options.runRecords, (r) => r.harnessName ?? 'opencode')
          : [];

    const taskKey = task.taskKey ?? task._id ?? task.title;
    const taskType = deriveTaskKind(taskKey);
    modelSelection = selectModelForTask(
      agent.role,
      taskType,
      data,
      options.routingPolicy,
    );

    if (modelSelection.selectedModel) {
      fallbackChain = buildFallbackChain(
        modelSelection.selectedModel,
        modelSelection.rankedModels,
      );
    }
  }

  return {
    assigned: true,
    agentId: agent._id,
    stageResult: {
      stage: 'dispatch',
      status: 'completed',
      agentId: agent._id,
      cost: 0,
      output: modelSelection
        ? `Assigned to ${agent.name} (${agent.role}) — model: ${modelSelection.selectedModel} (${modelSelection.policy})`
        : `Assigned to ${agent.name} (${agent.role})`,
      startedAt: Date.now(),
      completedAt: Date.now(),
    },
    modelSelection,
    fallbackChain,
  };
}



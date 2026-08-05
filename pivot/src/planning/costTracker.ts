import {
  type PipelineStage,
  type Agent,
  type Task,
  STAGE_MULTIPLIERS,
} from './agentTypes.js';

/**
 * Calculate the cost for a single pipeline stage.
 * Cost = agent costPerPoint × task storyPoints × stage multiplier
 */
export function calculateStageCost(
  stage: Exclude<PipelineStage, 'dispatch'>,
  agent: Agent,
  task: Task,
): number {
  const multiplier = STAGE_MULTIPLIERS[stage];
  const rawCost = agent.costPerPoint * task.storyPoints * multiplier;
  return Math.round(rawCost * 100) / 100; // round to 2 decimals
}

/**
 * Calculate total estimated cost for a full pipeline execution.
 */
export function calculateTotalEstimate(
  agent: Agent,
  task: Task,
): number {
  const stages: Array<Exclude<PipelineStage, 'dispatch'>> = [
    'architect',
    'executor',
    'reviewer',
    'merger',
  ];
  const total = stages.reduce((sum, stage) => {
    return sum + calculateStageCost(stage, agent, task);
  }, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Sum costs from completed stage results.
 */
export function sumStageCosts(costs: number[]): number {
  const total = costs.reduce((sum, c) => sum + c, 0);
  return Math.round(total * 100) / 100;
}

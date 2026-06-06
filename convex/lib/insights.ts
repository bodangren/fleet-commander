// Pure calculation helpers for Insights views (Phase 5: Data Queries)
// Stubs — implementation follows in Green phase.

import type { Doc } from '../_generated/dataModel';

export interface SprintMetric {
  _id: string;
  name: string;
  status: string;
  budget: number;
  actualCost: number;
  pointsDelivered: number;
  pointsEstimated: number;
  taskCount: number;
  completedCount: number;
  velocity: number;
  costPerPoint: number;
  budgetAccuracy: number;
}

export interface CostTrendItem {
  sprintName: string;
  costPerPoint: number;
  pointsDelivered: number;
  targetCostPerPoint: number;
}

export interface AgentEfficiencyRow {
  agentName: string;
  model: string;
  totalPoints: number;
  totalCost: number;
  costPerPoint: number;
  reliability: number;
  valueScore: 'High Value' | 'Standard' | 'Premium';
}

export interface ROISummary {
  avgCostPerPoint: number;
  pointsPerDollar: number;
  estimatedProjectCost: number;
}

export interface OptimizationOpportunity {
  title: string;
  description: string;
  potentialSavings: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Compute sprint metrics including velocity, cost per point, and budget accuracy.
 * @param sprints - Array of sprint documents
 * @param tasks - Optional array of task documents used to derive pointsEstimated from storyPoints
 * @returns Array of SprintMetric objects with computed fields
 */
export function computeSprintMetrics(
  sprints: Doc<'sprints'>[],
  tasks?: { sprintId?: string | null; storyPoints?: number }[],
): SprintMetric[] {
  const pointsBySprint = new Map<string, number>();
  if (tasks) {
    for (const task of tasks) {
      if (task.sprintId) {
        pointsBySprint.set(
          task.sprintId,
          (pointsBySprint.get(task.sprintId) ?? 0) + (task.storyPoints ?? 0),
        );
      }
    }
  }

  return sprints.map((sprint) => {
    const costPerPoint =
      sprint.pointsDelivered > 0
        ? sprint.actualCost / sprint.pointsDelivered
        : 0;
    const budgetAccuracy =
      sprint.budget > 0
        ? Math.abs(sprint.budget - sprint.actualCost) / sprint.budget * 100
        : 0;
    const velocity =
      sprint.taskCount > 0
        ? sprint.pointsDelivered / sprint.taskCount
        : 0;
    return {
      _id: sprint._id,
      name: sprint.name,
      status: sprint.status,
      budget: sprint.budget ?? 0,
      actualCost: sprint.actualCost ?? 0,
      pointsDelivered: sprint.pointsDelivered ?? 0,
      pointsEstimated: pointsBySprint.get(sprint._id) ?? 0,
      taskCount: sprint.taskCount ?? 0,
      completedCount: sprint.completedCount ?? 0,
      velocity,
      costPerPoint,
      budgetAccuracy,
    };
  });
}

const DEFAULT_TARGET_COST_PER_POINT = 2;

/**
 * Compute cost trend per sprint with cost per point and target comparison.
 * @param sprints - Array of sprint documents
 * @param _costRecords - Cost records (unused in current implementation)
 * @returns Array of CostTrendItem objects
 */
export function computeCostTrend(sprints: Doc<'sprints'>[], _costRecords: Doc<'costRecords'>[]): CostTrendItem[] {
  if (sprints.length === 0) return [];
  return sprints.map((sprint) => {
    const costPerPoint =
      sprint.pointsDelivered > 0
        ? sprint.actualCost / sprint.pointsDelivered
        : 0;
    return {
      sprintName: sprint.name,
      costPerPoint,
      pointsDelivered: sprint.pointsDelivered ?? 0,
      targetCostPerPoint: DEFAULT_TARGET_COST_PER_POINT,
    };
  });
}

/**
 * Compute agent efficiency rows with total points, cost, and value score.
 * @param agents - Array of agent documents
 * @param tasks - Array of task documents with status and assigneeId
 * @param costRecords - Array of cost records with agentId and costUSD
 * @returns Array of AgentEfficiencyRow objects
 */
export function computeAgentEfficiency(
  agents: Doc<'agents'>[],
  tasks: Doc<'tasks'>[],
  costRecords: Doc<'costRecords'>[],
): AgentEfficiencyRow[] {
  if (agents.length === 0) return [];

  const costByAgent = new Map<string, number>();
  for (const r of costRecords) {
    costByAgent.set(r.agentId, (costByAgent.get(r.agentId) ?? 0) + r.costUSD);
  }

  const pointsByAgent = new Map<string, number>();
  for (const task of tasks) {
    if (task.status === 'done' && task.assigneeId) {
      pointsByAgent.set(
        task.assigneeId,
        (pointsByAgent.get(task.assigneeId) ?? 0) + (task.storyPoints ?? 0),
      );
    }
  }

  return agents.map((agent) => {
    const totalPoints = pointsByAgent.get(agent._id) ?? 0;
    const totalCost = costByAgent.get(agent._id) ?? 0;
    const costPerPoint = totalPoints > 0 ? totalCost / totalPoints : 0;
    return {
      agentName: agent.name,
      model: agent.model ?? '',
      totalPoints,
      totalCost,
      costPerPoint,
      reliability: agent.reliability ?? 0,
      valueScore: classifyValueScore(costPerPoint),
    };
  });
}

/**
 * Compute ROI summary with avg cost per point and estimated project cost.
 * @param costRecords - Array of cost records
 * @param sprints - Array of sprint documents
 * @returns ROISummary with avgCostPerPoint, pointsPerDollar, estimatedProjectCost
 */
export function computeROISummary(costRecords: Doc<'costRecords'>[], sprints: Doc<'sprints'>[]): ROISummary {
  if (sprints.length === 0) {
    return { avgCostPerPoint: 0, pointsPerDollar: 0, estimatedProjectCost: 0 };
  }

  let totalCost = 0;
  let totalPoints = 0;
  for (const sprint of sprints) {
    totalCost += sprint.actualCost ?? 0;
    totalPoints += sprint.pointsDelivered ?? 0;
  }

  const avgCostPerPoint =
    sprints.length > 0
      ? sprints.reduce(
          (sum, s) =>
            sum + (s.pointsDelivered > 0 ? s.actualCost / s.pointsDelivered : 0),
          0,
        ) / sprints.length
      : 0;
  const pointsPerDollar = avgCostPerPoint > 0 ? 1 / avgCostPerPoint : 0;
  const estimatedProjectCost = totalCost;

  return { avgCostPerPoint, pointsPerDollar, estimatedProjectCost };
}

/**
 * Identify cost optimization opportunities from agent efficiency data.
 * @param agentEfficiency - Array of agent efficiency rows
 * @returns Array of OptimizationOpportunity objects sorted by priority
 */
export function computeOptimizations(
  agentEfficiency: AgentEfficiencyRow[],
): OptimizationOpportunity[] {
  if (agentEfficiency.length === 0) return [];

  const optimizations: OptimizationOpportunity[] = [];

  const premiumAgents = agentEfficiency.filter((a) => a.valueScore === 'Premium');
  for (const agent of premiumAgents) {
    const savingsBase = agent.totalCost > 0 ? agent.totalCost : agent.costPerPoint * 10;
    optimizations.push({
      title: `Switch ${agent.agentName} to a more cost-effective model`,
      description: `${agent.agentName} has a cost per point of $${agent.costPerPoint.toFixed(2)}, significantly above the optimal threshold. Consider switching to a less expensive model to reduce costs.`,
      potentialSavings: Math.round(savingsBase * 0.2 * 100) / 100,
      priority: 'high',
    });
  }

  const standardAgents = agentEfficiency.filter((a) => a.valueScore === 'Standard');
  for (const agent of standardAgents) {
    const savingsBase = agent.totalCost > 0 ? agent.totalCost : agent.costPerPoint * 10;
    optimizations.push({
      title: `Optimize ${agent.agentName} cost efficiency`,
      description: `${agent.agentName} operates at a ${agent.valueScore.toLowerCase()} cost per point of $${agent.costPerPoint.toFixed(2)}. Review task allocation to improve efficiency.`,
      potentialSavings: Math.round(savingsBase * 0.1 * 100) / 100,
      priority: 'medium',
    });
  }

  return optimizations.sort(
    (a, b) =>
      (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1),
  );
}

const COST_BOUNDARIES = { HIGH_VALUE_MAX: 2, STANDARD_MAX: 3 } as const;

/**
 * Classify cost per point as High Value, Standard, or Premium.
 * @param costPerPoint - Cost per story point in USD
 * @returns Classification: 'High Value' (<=2), 'Standard' (<=3), or 'Premium' (>3)
 */
export function classifyValueScore(
  costPerPoint: number,
): 'High Value' | 'Standard' | 'Premium' {
  if (costPerPoint <= COST_BOUNDARIES.HIGH_VALUE_MAX) return 'High Value';
  if (costPerPoint <= COST_BOUNDARIES.STANDARD_MAX) return 'Standard';
  return 'Premium';
}

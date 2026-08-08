import type { Agent, Task } from './agentTypes.js';
import { calculateTotalEstimate } from './costTracker.js';
import { topologicalSort, computeCriticalPath } from '../orchestrator/dependencyUtils.js';
import type { Task as OrchestratorTask } from '../orchestrator/types.js';

export interface TaskRecommendation {
  taskId: string;
  taskTitle: string;
  storyPoints: number;
  priority: string;
  assignedAgentId?: string;
  assignedAgentName: string;
  agentRole: string;
  costPerPoint: number;
  estimatedCost: number;
  selected: boolean;
}

export interface AgentBreakdown {
  agentId: string;
  agentName: string;
  role: string;
  totalPoints: number;
  costPerPoint: number;
  totalCost: number;
  taskCount: number;
}

export interface SprintRecommendation {
  tasks: TaskRecommendation[];
  agentBreakdown: AgentBreakdown[];
  totalPoints: number;
  totalCost: number;
  taskCount: number;
  avgCostPerPoint: number;
  maxPointsAtBudget: (budget: number) => number;
  recommendedBudget: number;
  bufferPercent: number;
  makespan: number;
}

/**
 * Score a task for sprint inclusion.
 * Higher score = better candidate.
 */
export function scoreTaskForSprint(task: Task): number {
  const priorityWeights: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const priorityScore = priorityWeights[task.priority] ?? 1;
  const sizePenalty = task.storyPoints > 8 ? -2 : 0;

  return priorityScore * 10 + task.storyPoints + sizePenalty;
}

/**
 * Find the best agent for a specific task.
 * Prefers agents with matching skills and lower cost.
 */
export function findBestAgentForTask(
  task: Task,
  agents: Agent[],
): Agent | undefined {
  const available = agents.filter(
    (a) => a.status === 'active' && a.workload < a.maxWorkload,
  );

  if (available.length === 0) return undefined;

  const scored = available.map((agent) => {
    const overlap = task.description
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => agent.skills.some((s) => s.toLowerCase() === word)).length;

    const costScore = (5 - agent.costPerPoint) * 2; // lower cost = higher score
    const availability = 1 - agent.workload / Math.max(agent.maxWorkload, 1);
    const reliability = agent.reliability * 3;

    return {
      agent,
      score: overlap * 5 + costScore + availability * 3 + reliability,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].agent;
}

/**
 * Generate a sprint recommendation from backlog tasks and available agents.
 * Selects top tasks by score, assigns best agents, and calculates costs.
 * Orders tasks by topological order when dependencies are present.
 * Computes makespan as the critical path (longest weighted dependency path).
 */
export function generateRecommendation(
  tasks: Task[],
  agents: Agent[],
  budget?: number,
): SprintRecommendation {
  // Only consider backlog tasks
  const backlogTasks = tasks.filter((t) => t.status === 'backlog');

  // Build task map for dependency lookups
  const taskMap = new Map<string, Task>();
  for (const t of backlogTasks) {
    if (t.taskKey) taskMap.set(t.taskKey, t);
  }

  // Resolve dependencies: only include deps that exist in the sprint subgraph
  const resolvedDeps = new Map<string, string[]>();
  for (const t of backlogTasks) {
    if (!t.taskKey) continue;
    const deps = (t.dependencies ?? []).filter((d) => taskMap.has(d));
    resolvedDeps.set(t.taskKey, deps);
  }

  const sprintTasks = backlogTasks;

  // Detect cycles via topological sort (only among resolved deps)
  const topoInput = sprintTasks
    .filter((t) => t.taskKey)
    .map((t) => ({
      taskKey: t.taskKey!,
      dependencies: resolvedDeps.get(t.taskKey!) ?? [],
      storyPoints: t.storyPoints,
    })) as unknown as OrchestratorTask[];

  const topo = topologicalSort(topoInput);
  if (topo.hasCycle) {
    return {
      tasks: [],
      agentBreakdown: [],
      totalPoints: 0,
      totalCost: 0,
      taskCount: 0,
      avgCostPerPoint: 0,
      maxPointsAtBudget: () => 0,
      recommendedBudget: 0,
      bufferPercent: 0,
      makespan: 0,
    };
  }

  // Build ordered list: topological order, tie-broken by score (descending)
  const scoreMap = new Map<string, number>();
  for (const t of sprintTasks) {
    if (t.taskKey) scoreMap.set(t.taskKey, scoreTaskForSprint(t));
  }

  const topoOrder = new Map<string, number>();
  topo.sorted.forEach((key, idx) => topoOrder.set(key, idx));

  const ordered = [...sprintTasks].sort((a, b) => {
    const aKey = a.taskKey ?? '';
    const bKey = b.taskKey ?? '';
    const aIdx = topoOrder.get(aKey) ?? Infinity;
    const bIdx = topoOrder.get(bKey) ?? Infinity;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (scoreMap.get(bKey) ?? 0) - (scoreMap.get(aKey) ?? 0);
  });

  // Build recommendations within budget if provided
  const recommendations: TaskRecommendation[] = [];
  let totalCost = 0;
  let totalPoints = 0;

  for (const task of ordered) {
    const agent = findBestAgentForTask(task, agents);
    if (!agent) {
      recommendations.push({
        taskId: task._id,
        taskTitle: task.title,
        storyPoints: task.storyPoints,
        priority: task.priority,
        assignedAgentName: 'Unassigned',
        agentRole: 'unassigned',
        costPerPoint: 0,
        estimatedCost: 0,
        selected: false,
      });
      continue;
    }

    const estimatedCost = calculateTotalEstimate(agent, task);

    // If budget specified, skip tasks that would exceed it
    if (budget !== undefined && totalCost + estimatedCost > budget) {
      continue;
    }

    recommendations.push({
      taskId: task._id,
      taskTitle: task.title,
      storyPoints: task.storyPoints,
      priority: task.priority,
      assignedAgentId: agent._id,
      assignedAgentName: agent.name,
      agentRole: agent.role,
      costPerPoint: agent.costPerPoint,
      estimatedCost,
      selected: true,
    });

    totalCost += estimatedCost;
    totalPoints += task.storyPoints;
  }

  // Compute makespan: critical path through the sprint task dependency graph
  const makespanInput = sprintTasks
    .filter((t) => t.taskKey)
    .map((t) => ({
      taskKey: t.taskKey!,
      dependencies: resolvedDeps.get(t.taskKey!) ?? [],
      storyPoints: t.storyPoints,
    })) as unknown as OrchestratorTask[];

  const critPath = computeCriticalPath(makespanInput);
  const makespan = critPath.totalStoryPoints;

  // Build agent breakdown
  const breakdownMap = new Map<string, AgentBreakdown>();
  for (const rec of recommendations) {
    if (!rec.assignedAgentId) continue;
    const existing = breakdownMap.get(rec.assignedAgentId);
    if (existing) {
      existing.totalPoints += rec.storyPoints;
      existing.totalCost += rec.estimatedCost;
      existing.taskCount += 1;
    } else {
      breakdownMap.set(rec.assignedAgentId, {
        agentId: rec.assignedAgentId,
        agentName: rec.assignedAgentName,
        role: rec.agentRole,
        totalPoints: rec.storyPoints,
        costPerPoint: rec.costPerPoint,
        totalCost: rec.estimatedCost,
        taskCount: 1,
      });
    }
  }

  const agentBreakdown = Array.from(breakdownMap.values());
  const avgCostPerPoint =
    totalPoints > 0 ? Math.round((totalCost / totalPoints) * 100) / 100 : 0;

  // Recommended budget = total cost + 10% buffer
  const recommendedBudget = Math.round(totalCost * 1.1 * 100) / 100;
  const bufferPercent =
    totalCost > 0
      ? Math.round(((recommendedBudget - totalCost) / totalCost) * 100)
      : 0;

  return {
    tasks: recommendations,
    agentBreakdown,
    totalPoints,
    totalCost: Math.round(totalCost * 100) / 100,
    taskCount: recommendations.length,
    avgCostPerPoint,
    maxPointsAtBudget: (b: number) =>
      avgCostPerPoint > 0 ? Math.floor(b / avgCostPerPoint) : 0,
    recommendedBudget,
    bufferPercent,
    makespan,
  };
}

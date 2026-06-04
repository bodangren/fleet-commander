import type { Doc } from '../_generated/dataModel';

type Agent = Doc<'agents'>;
type Task = Doc<'tasks'>;
type CostRecord = Doc<'costRecords'>;
type Sprint = Doc<'sprints'>;

const MS_PER_DAY = 86_400_000;

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  role: string;
  model: string;
  costPerPoint: number;
  rejectionRate: number;
  throughput: number;
  mergeRate: number;
}

export interface AgentScore {
  agentId: string;
  agentName: string;
  role: string;
  model: string;
  compositeScore: number;
  metrics: AgentMetrics;
  breakdown: {
    costPerPoint: number;
    rejectionRate: number;
    throughput: number;
    mergeRate: number;
  };
}

export interface RankedAgent extends AgentScore {
  rank: number;
  trend: 'up' | 'down' | 'flat';
  previousRank: number | null;
  badges: string[];
}

export interface ScoreWeights {
  costPerPoint: number;
  rejectionRate: number;
  throughput: number;
  mergeRate: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  costPerPoint: 0.4,
  rejectionRate: 0.3,
  throughput: 0.2,
  mergeRate: 0.1,
};

/**
 * Normalize a raw metric to a 0-1 score.
 * @param value - Raw metric value
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @param higherIsBetter - When true, max maps to 1; when false, min maps to 1
 * @returns Normalized score clamped to [0, 1]
 */
export function normalizeMetric(
  value: number,
  min: number,
  max: number,
  higherIsBetter: boolean = false,
): number {
  if (max === min) return 1;
  const ratio = (value - min) / (max - min);
  const raw = higherIsBetter ? ratio : 1 - ratio;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Calculate composite performance score for an agent from pre-computed metrics.
 * @param metrics - Agent metrics (cost/point, rejection rate, throughput, merge rate)
 * @param weights - Optional custom weights (defaults to DEFAULT_SCORE_WEIGHTS)
 * @param bounds - Min/max bounds for normalization per metric
 * @returns AgentScore with composite score and breakdown
 */
export function calculateAgentScore(
  metrics: AgentMetrics,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
  bounds?: {
    costPerPoint: { min: number; max: number };
    rejectionRate: { min: number; max: number };
    throughput: { min: number; max: number };
    mergeRate: { min: number; max: number };
  },
): AgentScore {
  const defaultBounds = {
    costPerPoint: { min: 0, max: 10 },
    rejectionRate: { min: 0, max: 1 },
    throughput: { min: 0, max: 20 },
    mergeRate: { min: 0, max: 1 },
  };
  const b = bounds ?? defaultBounds;

  const breakdown = {
    costPerPoint: normalizeMetric(metrics.costPerPoint, b.costPerPoint.min, b.costPerPoint.max, false),
    rejectionRate: normalizeMetric(
      metrics.rejectionRate,
      b.rejectionRate.min,
      b.rejectionRate.max,
      false,
    ),
    throughput: normalizeMetric(metrics.throughput, b.throughput.min, b.throughput.max, true),
    mergeRate: normalizeMetric(metrics.mergeRate, b.mergeRate.min, b.mergeRate.max, true),
  };

  const compositeScore =
    breakdown.costPerPoint * weights.costPerPoint +
    breakdown.rejectionRate * weights.rejectionRate +
    breakdown.throughput * weights.throughput +
    breakdown.mergeRate * weights.mergeRate;

  return {
    agentId: metrics.agentId,
    agentName: metrics.agentName,
    role: metrics.role,
    model: metrics.model,
    compositeScore,
    metrics,
    breakdown,
  };
}

/**
 * Rank agents by composite score, compute trend arrows and badges.
 * @param currentScores - Current period AgentScore array
 * @param previousScores - Previous period AgentScore array (for trend computation)
 * @returns RankedAgent array sorted by compositeScore descending, with rank, trend, and badges
 */
export function rankAgents(
  currentScores: AgentScore[],
  previousScores: AgentScore[],
): RankedAgent[] {
  const previousRankMap = new Map<string, number>();
  const sortedPrevious = [...previousScores].sort(
    (a, b) => b.compositeScore - a.compositeScore,
  );
  sortedPrevious.forEach((agent, idx) => {
    previousRankMap.set(agent.agentId, idx + 1);
  });

  const sorted = [...currentScores].sort((a, b) => b.compositeScore - a.compositeScore);

  const ranked: RankedAgent[] = sorted.map((agent, idx) => {
    const rank = idx + 1;
    const previousRank = previousRankMap.get(agent.agentId) ?? null;

    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (previousRank !== null) {
      if (rank < previousRank) trend = 'up';
      else if (rank > previousRank) trend = 'down';
    }

    return { ...agent, rank, trend, previousRank, badges: [] };
  });

  return assignBadges(ranked);
}

/**
 * Assign performance badges to ranked agents.
 * @param ranked - RankedAgent array
 * @returns New array with badges assigned
 */
function assignBadges(ranked: RankedAgent[]): RankedAgent[] {
  if (ranked.length === 0) return ranked;

  const result = ranked.map((r) => ({ ...r, badges: [...r.badges] }));

  result[0].badges.push('top_performer');

  const bestEfficiency = result.reduce((best, curr) =>
    curr.metrics.costPerPoint < best.metrics.costPerPoint ? curr : best,
  );
  if (!bestEfficiency.badges.includes('most_efficient')) {
    bestEfficiency.badges.push('most_efficient');
  }

  const biggestImprover = result.reduce<RankedAgent | null>((best, curr) => {
    if (curr.previousRank === null) return best;
    const improvement = curr.previousRank - curr.rank;
    if (best === null) return curr;
    const bestImprovement = (best.previousRank ?? best.rank) - best.rank;
    return improvement > bestImprovement ? curr : best;
  }, null);
  if (biggestImprover && !biggestImprover.badges.includes('most_improved')) {
    biggestImprover.badges.push('most_improved');
  }

  return result;
}

/**
 * Aggregate raw task/cost/sprint data into AgentMetrics for a given time window.
 * @param agents - All agents
 * @param tasks - Tasks in the window
 * @param costRecords - Cost records in the window
 * @param sprints - Sprints in the window
 * @param windowDays - Window size in days
 * @returns AgentMetrics array with one entry per agent that has activity
 */
export function aggregateAgentMetrics(
  agents: Agent[],
  tasks: Task[],
  costRecords: CostRecord[],
  sprints: Sprint[],
  windowDays: number,
): AgentMetrics[] {
  const windowMs = windowDays * MS_PER_DAY;

  const totalSprintDays = sprints.reduce((sum, s) => {
    if (s.startedAt && s.closedAt) {
      return sum + (s.closedAt - s.startedAt) / MS_PER_DAY;
    }
    if (s.startedAt) {
      return sum + (Date.now() - s.startedAt) / MS_PER_DAY;
    }
    return sum;
  }, 0);
  const effectiveDays = totalSprintDays > 0 ? totalSprintDays : windowDays;

  const costByAgent = new Map<string, { totalCost: number; totalPoints: number }>();
  for (const cr of costRecords) {
    const existing = costByAgent.get(cr.agentId) ?? { totalCost: 0, totalPoints: 0 };
    existing.totalCost += cr.costUSD;
    costByAgent.set(cr.agentId, existing);
  }

  const pointsByAssignee = new Map<string, number>();
  const assignedByAssignee = new Map<string, number>();
  const doneByAssignee = new Map<string, number>();
  const rejectedByAssignee = new Map<string, number>();
  const mergedByAssignee = new Map<string, number>();

  for (const task of tasks) {
    const agentId = task.assigneeId;
    if (!agentId) continue;

    const points = task.storyPoints ?? 0;
    pointsByAssignee.set(agentId, (pointsByAssignee.get(agentId) ?? 0) + points);

    assignedByAssignee.set(agentId, (assignedByAssignee.get(agentId) ?? 0) + 1);

    if (task.status === 'done') {
      doneByAssignee.set(agentId, (doneByAssignee.get(agentId) ?? 0) + 1);
    }
    if (task.rejectionReason) {
      rejectedByAssignee.set(agentId, (rejectedByAssignee.get(agentId) ?? 0) + 1);
    }
    if (task.mergerId) {
      mergedByAssignee.set(agentId, (mergedByAssignee.get(agentId) ?? 0) + 1);
    }
  }

  return agents
    .map((agent) => {
      const agentId = agent._id;
      const costData = costByAgent.get(agentId);
      const totalPoints = pointsByAssignee.get(agentId) ?? 0;
      const totalCost = costData?.totalCost ?? 0;
      const costPerPoint = totalPoints > 0 ? totalCost / totalPoints : 0;

      const totalTasks = assignedByAssignee.get(agentId) ?? 0;
      const completedTasks = doneByAssignee.get(agentId) ?? 0;
      const rejectedTasks = rejectedByAssignee.get(agentId) ?? 0;
      const mergedTasks = mergedByAssignee.get(agentId) ?? 0;

      const rejectionRate = totalTasks > 0 ? rejectedTasks / totalTasks : 0;
      const throughput = effectiveDays > 0 ? completedTasks / effectiveDays : 0;
      const mergeRate = completedTasks > 0 ? mergedTasks / completedTasks : 0;

      return {
        agentId,
        agentName: agent.name,
        role: agent.role,
        model: agent.model,
        costPerPoint,
        rejectionRate,
        throughput,
        mergeRate,
      };
    })
    .filter(
      (m) =>
        m.costPerPoint > 0 || m.throughput > 0 || m.rejectionRate > 0 || m.mergeRate > 0,
    );
}

/**
 * Compute normalization bounds from a set of metrics.
 * @param allMetrics - Metrics from both current and previous windows
 * @returns Bounds object with min/max for each metric
 */
export function computeBounds(allMetrics: AgentMetrics[]): {
  costPerPoint: { min: number; max: number };
  rejectionRate: { min: number; max: number };
  throughput: { min: number; max: number };
  mergeRate: { min: number; max: number };
} {
  if (allMetrics.length === 0) {
    return {
      costPerPoint: { min: 0, max: 10 },
      rejectionRate: { min: 0, max: 1 },
      throughput: { min: 0, max: 20 },
      mergeRate: { min: 0, max: 1 },
    };
  }

  const vals = (fn: (m: AgentMetrics) => number) => allMetrics.map(fn);

  return {
    costPerPoint: {
      min: Math.min(...vals((m) => m.costPerPoint)),
      max: Math.max(...vals((m) => m.costPerPoint)),
    },
    rejectionRate: {
      min: Math.min(...vals((m) => m.rejectionRate)),
      max: Math.max(...vals((m) => m.rejectionRate)),
    },
    throughput: {
      min: Math.min(...vals((m) => m.throughput)),
      max: Math.max(...vals((m) => m.throughput)),
    },
    mergeRate: {
      min: Math.min(...vals((m) => m.mergeRate)),
      max: Math.max(...vals((m) => m.mergeRate)),
    },
  };
}

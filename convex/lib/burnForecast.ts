/**
 * Pure functions for budget burn forecasting.
 * Linear regression on task completion data to project budget exhaustion.
 */

export interface CompletedTaskData {
  actualCost: number;
  completedAt: number;
  storyPoints: number;
}

export interface TaskCandidate {
  taskId: string;
  title: string;
  costEstimate: number;
  storyPoints: number;
  status: string;
}

export interface BurnForecast {
  burnRatePerHour: number;
  projectedExhaustionMs: number | null;
  remainingBudget: number;
  confidence: number;
  dataPoints: number;
  atRisk: boolean;
}

export interface TaskRecommendation {
  taskId: string;
  title: string;
  costEstimate: number;
  storyPoints: number;
  action: 'keep' | 'drop';
  savingsEstimate: number;
  reason: string;
}

/**
 * Compute linear regression slope and intercept from x/y arrays.
 * Returns { slope, intercept } or null if insufficient data.
 */
export function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number } | null {
  const n = xs.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Compute R-squared (coefficient of determination) for a linear fit.
 */
export function computeRSquared(
  xs: number[],
  ys: number[],
  slope: number,
  intercept: number,
): number {
  const n = xs.length;
  if (n < 2) return 0;

  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }

  if (ssTot < 1e-10) return 1;
  return 1 - ssRes / ssTot;
}

/**
 * Compute budget burn forecast from completed task data.
 *
 * Uses linear regression on cumulative cost over time to project
 * when the budget will be exhausted.
 *
 * @param completedTasks - Array of completed tasks with actualCost and completedAt
 * @param budget - Total sprint budget
 * @param now - Current timestamp (defaults to Date.now())
 * @returns BurnForecast with burn rate, projected exhaustion, confidence, and risk flag
 */
export function computeBurnForecast(
  completedTasks: CompletedTaskData[],
  budget: number,
  now: number = Date.now(),
): BurnForecast {
  if (completedTasks.length < 3) {
    return {
      burnRatePerHour: 0,
      projectedExhaustionMs: null,
      remainingBudget: budget,
      confidence: 0,
      dataPoints: completedTasks.length,
      atRisk: false,
    };
  }

  const sorted = [...completedTasks].sort((a, b) => a.completedAt - b.completedAt);

  const startTime = sorted[0].completedAt;
  const xs: number[] = [];
  const ys: number[] = [];
  let cumulativeCost = 0;

  for (const task of sorted) {
    cumulativeCost += task.actualCost;
    const hoursElapsed = (task.completedAt - startTime) / (1000 * 60 * 60);
    xs.push(hoursElapsed);
    ys.push(cumulativeCost);
  }

  const regression = linearRegression(xs, ys);
  if (!regression) {
    return {
      burnRatePerHour: 0,
      projectedExhaustionMs: null,
      remainingBudget: budget - cumulativeCost,
      confidence: 0,
      dataPoints: sorted.length,
      atRisk: false,
    };
  }

  const { slope, intercept } = regression;
  const burnRatePerHour = slope;
  const rSquared = computeRSquared(xs, ys, slope, intercept);
  const confidence = Math.max(0, Math.min(1, rSquared));

  const remainingBudget = budget - cumulativeCost;

  let projectedExhaustionMs: number | null = null;
  let atRisk = false;

  if (burnRatePerHour > 0 && remainingBudget > 0) {
    const hoursUntilExhaustion = (remainingBudget - intercept) / burnRatePerHour;
    const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);
    const hoursFromNow = hoursUntilExhaustion - hoursSinceStart;
    if (hoursFromNow > 0) {
      projectedExhaustionMs = now + hoursFromNow * 60 * 60 * 1000;
    } else {
      atRisk = true;
    }
  } else if (remainingBudget <= 0) {
    atRisk = true;
  }

  if (burnRatePerHour > 0 && remainingBudget > 0) {
    const projectedSpend = burnRatePerHour * 24;
    if (projectedSpend > remainingBudget * 0.8) {
      atRisk = true;
    }
  }

  return {
    burnRatePerHour: Math.max(0, burnRatePerHour),
    projectedExhaustionMs,
    remainingBudget,
    confidence,
    dataPoints: sorted.length,
    atRisk,
  };
}

/**
 * Recommend which Ready tasks to keep or drop to fit remaining budget.
 * Uses a greedy approach: maximize story points within budget by preferring
 * tasks with the best points-per-dollar ratio.
 *
 * @param candidates - Array of Ready/pending tasks with cost estimates
 * @param remainingBudget - Budget remaining after current spend
 * @returns Array of TaskRecommendation with keep/drop actions
 */
export function recommendTaskCuts(
  candidates: TaskCandidate[],
  remainingBudget: number,
): TaskRecommendation[] {
  if (candidates.length === 0) return [];

  const totalEstimatedCost = candidates.reduce((sum, t) => sum + t.costEstimate, 0);

  if (totalEstimatedCost <= remainingBudget) {
    return candidates.map((t) => ({
      taskId: t.taskId,
      title: t.title,
      costEstimate: t.costEstimate,
      storyPoints: t.storyPoints,
      action: 'keep' as const,
      savingsEstimate: 0,
      reason: 'Within remaining budget',
    }));
  }

  const scored = candidates.map((t) => ({
    ...t,
    pointsPerDollar: t.costEstimate > 0 ? t.storyPoints / t.costEstimate : Infinity,
  }));

  scored.sort((a, b) => b.pointsPerDollar - a.pointsPerDollar);

  const recommendations: TaskRecommendation[] = [];
  let budgetRemaining = remainingBudget;

  for (const task of scored) {
    if (task.costEstimate <= budgetRemaining) {
      recommendations.push({
        taskId: task.taskId,
        title: task.title,
        costEstimate: task.costEstimate,
        storyPoints: task.storyPoints,
        action: 'keep',
        savingsEstimate: 0,
        reason: `Best value: ${task.pointsPerDollar.toFixed(2)} pts/$`,
      });
      budgetRemaining -= task.costEstimate;
    } else {
      recommendations.push({
        taskId: task.taskId,
        title: task.title,
        costEstimate: task.costEstimate,
        storyPoints: task.storyPoints,
        action: 'drop',
        savingsEstimate: task.costEstimate,
        reason: `Exceeds remaining budget ($${budgetRemaining.toFixed(2)} left)`,
      });
    }
  }

  return recommendations;
}

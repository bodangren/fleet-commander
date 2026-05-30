export interface CostMetricRecord {
  taskId: string;
  costUSD: number;
}

export interface CostMetricTask {
  _id: string;
  status: string;
}

export interface CostPerTaskMetric {
  totalCostUSD: number;
  completedTasks: number;
  costPerTask: number;
}

/**
 * Aggregates cost records and tasks into total cost, completed count, and cost per task.
 * @param costRecords - Array of cost metric records with taskId and costUSD
 * @param tasks - Array of tasks with status and _id
 * @returns Aggregated metrics including totalCostUSD, completedTasks, costPerTask
 */
export function computeCostPerTaskMetric(
  costRecords: readonly CostMetricRecord[],
  tasks: readonly CostMetricTask[],
): CostPerTaskMetric {
  const totalCostUSD = costRecords.reduce((sum, r) => sum + r.costUSD, 0);
  const costedTaskIds = new Set(costRecords.map((r) => r.taskId));
  const completedTasks = tasks.filter(
    (task) => task.status === 'done' && costedTaskIds.has(task._id),
  ).length;

  return {
    totalCostUSD,
    completedTasks,
    costPerTask: completedTasks > 0 ? totalCostUSD / completedTasks : 0,
  };
}

export interface CostMetricRecord {
  taskId: string;
  costUSD: number;
}

export interface CostMetricTask {
  taskKey: string;
  status: string;
}

export interface CostPerTaskMetric {
  totalCostUSD: number;
  completedTasks: number;
  costPerTask: number;
}

export function computeCostPerTaskMetric(
  costRecords: readonly CostMetricRecord[],
  tasks: readonly CostMetricTask[],
): CostPerTaskMetric {
  const totalCostUSD = costRecords.reduce((sum, r) => sum + r.costUSD, 0);
  const costedTaskIds = new Set(costRecords.map((r) => r.taskId));
  const completedTasks = tasks.filter(
    (task) => task.status === 'done' && costedTaskIds.has(task.taskKey),
  ).length;

  return {
    totalCostUSD,
    completedTasks,
    costPerTask: completedTasks > 0 ? totalCostUSD / completedTasks : 0,
  };
}

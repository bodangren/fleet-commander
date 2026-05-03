import { describe, expect, it } from 'bun:test';
import { computeCostPerTaskMetric } from './costMetrics';

describe('computeCostPerTaskMetric', () => {
  it('ignores completed tasks that have no cost record', () => {
    const result = computeCostPerTaskMetric(
      [
        { taskId: 'costed-done', costUSD: 3 },
        { taskId: 'costed-other', costUSD: 1 },
      ],
      [
        { taskKey: 'costed-done', status: 'done' },
        { taskKey: 'free-done', status: 'done' },
        { taskKey: 'costed-other', status: 'in_progress' },
      ],
    );

    expect(result.totalCostUSD).toBe(4);
    expect(result.completedTasks).toBe(1);
    expect(result.costPerTask).toBe(4);
  });

  it('returns zero cost per task when no costed tasks are complete', () => {
    const result = computeCostPerTaskMetric(
      [{ taskId: 'running', costUSD: 2 }],
      [{ taskKey: 'running', status: 'in_progress' }],
    );

    expect(result.completedTasks).toBe(0);
    expect(result.costPerTask).toBe(0);
  });
});

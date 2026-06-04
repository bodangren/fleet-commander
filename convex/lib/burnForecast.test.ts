import { describe, it, expect } from 'bun:test';
import {
  linearRegression,
  computeRSquared,
  computeBurnForecast,
  recommendTaskCuts,
  type CompletedTaskData,
  type TaskCandidate,
} from './burnForecast';

describe('linearRegression', () => {
  it('returns null for fewer than 2 points', () => {
    expect(linearRegression([1], [2])).toBeNull();
    expect(linearRegression([], [])).toBeNull();
  });

  it('computes perfect linear fit', () => {
    const result = linearRegression([0, 1, 2], [0, 2, 4]);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(2, 5);
    expect(result!.intercept).toBeCloseTo(0, 5);
  });

  it('computes slope with offset', () => {
    const result = linearRegression([0, 1, 2], [1, 3, 5]);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(2, 5);
    expect(result!.intercept).toBeCloseTo(1, 5);
  });

  it('returns null for identical x values (zero denominator)', () => {
    expect(linearRegression([5, 5, 5], [1, 2, 3])).toBeNull();
  });
});

describe('computeRSquared', () => {
  it('returns 1 for perfect fit', () => {
    const r2 = computeRSquared([0, 1, 2], [0, 2, 4], 2, 0);
    expect(r2).toBeCloseTo(1, 5);
  });

  it('returns 0 for poor fit', () => {
    const r2 = computeRSquared([0, 1, 2], [10, 1, 10], 0, 7);
    expect(r2).toBeLessThan(0.5);
  });

  it('returns 0 for fewer than 2 points', () => {
    expect(computeRSquared([1], [2], 1, 0)).toBe(0);
  });
});

describe('computeBurnForecast', () => {
  const now = 1000000;
  const hour = 60 * 60 * 1000;

  it('returns zero forecast for fewer than 3 completed tasks', () => {
    const tasks: CompletedTaskData[] = [
      { actualCost: 10, completedAt: now - hour, storyPoints: 3 },
      { actualCost: 15, completedAt: now, storyPoints: 5 },
    ];
    const result = computeBurnForecast(tasks, 1000, now);
    expect(result.dataPoints).toBe(2);
    expect(result.burnRatePerHour).toBe(0);
    expect(result.projectedExhaustionMs).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.atRisk).toBe(false);
  });

  it('computes burn rate from 3+ completed tasks', () => {
    const tasks: CompletedTaskData[] = [
      { actualCost: 10, completedAt: now - 4 * hour, storyPoints: 3 },
      { actualCost: 20, completedAt: now - 2 * hour, storyPoints: 5 },
      { actualCost: 30, completedAt: now, storyPoints: 8 },
    ];
    const result = computeBurnForecast(tasks, 1000, now);
    expect(result.dataPoints).toBe(3);
    expect(result.burnRatePerHour).toBeGreaterThan(0);
    expect(result.remainingBudget).toBe(1000 - 60);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('marks at-risk when budget already exceeded', () => {
    const tasks: CompletedTaskData[] = [
      { actualCost: 400, completedAt: now - 2 * hour, storyPoints: 3 },
      { actualCost: 400, completedAt: now - hour, storyPoints: 5 },
      { actualCost: 400, completedAt: now, storyPoints: 8 },
    ];
    const result = computeBurnForecast(tasks, 1000, now);
    expect(result.remainingBudget).toBeLessThan(0);
    expect(result.atRisk).toBe(true);
  });

  it('returns zero burn rate when all costs are zero', () => {
    const tasks: CompletedTaskData[] = [
      { actualCost: 0, completedAt: now - 2 * hour, storyPoints: 3 },
      { actualCost: 0, completedAt: now - hour, storyPoints: 5 },
      { actualCost: 0, completedAt: now, storyPoints: 8 },
    ];
    const result = computeBurnForecast(tasks, 1000, now);
    expect(result.burnRatePerHour).toBe(0);
    expect(result.atRisk).toBe(false);
  });

  it('sorts tasks by completion time before regression', () => {
    const tasks: CompletedTaskData[] = [
      { actualCost: 30, completedAt: now, storyPoints: 8 },
      { actualCost: 10, completedAt: now - 4 * hour, storyPoints: 3 },
      { actualCost: 20, completedAt: now - 2 * hour, storyPoints: 5 },
    ];
    const result = computeBurnForecast(tasks, 1000, now);
    expect(result.burnRatePerHour).toBeGreaterThan(0);
  });

  it('projects exhaustion relative to now, not regression start', () => {
    const startTime = now - 4 * hour;
    const tasks: CompletedTaskData[] = [
      { actualCost: 10, completedAt: startTime, storyPoints: 3 },
      { actualCost: 20, completedAt: now - 2 * hour, storyPoints: 5 },
      { actualCost: 30, completedAt: now, storyPoints: 8 },
    ];
    const result = computeBurnForecast(tasks, 1000, now);
    expect(result.projectedExhaustionMs).not.toBeNull();
    expect(result.projectedExhaustionMs!).toBeGreaterThan(now);
  });

  it('marks at-risk when projected exhaustion is in the past', () => {
    const tasks: CompletedTaskData[] = [
      { actualCost: 200, completedAt: now - 4 * hour, storyPoints: 3 },
      { actualCost: 200, completedAt: now - 3 * hour, storyPoints: 5 },
      { actualCost: 200, completedAt: now - 2 * hour, storyPoints: 8 },
    ];
    const result = computeBurnForecast(tasks, 500, now);
    expect(result.atRisk).toBe(true);
  });
});

describe('recommendTaskCuts', () => {
  it('keeps all tasks when within budget', () => {
    const tasks: TaskCandidate[] = [
      { taskId: '1', title: 'A', costEstimate: 10, storyPoints: 3, status: 'ready' },
      { taskId: '2', title: 'B', costEstimate: 20, storyPoints: 5, status: 'ready' },
    ];
    const result = recommendTaskCuts(tasks, 50);
    expect(result.every((r) => r.action === 'keep')).toBe(true);
  });

  it('drops low-value tasks when over budget', () => {
    const tasks: TaskCandidate[] = [
      { taskId: '1', title: 'Expensive Low Value', costEstimate: 50, storyPoints: 2, status: 'ready' },
      { taskId: '2', title: 'Cheap High Value', costEstimate: 10, storyPoints: 8, status: 'ready' },
    ];
    const result = recommendTaskCuts(tasks, 50);
    const cheap = result.find((r) => r.taskId === '2');
    const expensive = result.find((r) => r.taskId === '1');
    expect(cheap!.action).toBe('keep');
    expect(expensive!.action).toBe('drop');
    expect(expensive!.savingsEstimate).toBe(50);
  });

  it('returns empty for empty candidates', () => {
    expect(recommendTaskCuts([], 100)).toEqual([]);
  });

  it('drops tasks that exceed remaining budget individually', () => {
    const tasks: TaskCandidate[] = [
      { taskId: '1', title: 'A', costEstimate: 100, storyPoints: 5, status: 'ready' },
      { taskId: '2', title: 'B', costEstimate: 5, storyPoints: 2, status: 'ready' },
    ];
    const result = recommendTaskCuts(tasks, 10);
    expect(result.find((r) => r.taskId === '2')!.action).toBe('keep');
    expect(result.find((r) => r.taskId === '1')!.action).toBe('drop');
  });

  it('maximizes story points within budget', () => {
    const tasks: TaskCandidate[] = [
      { taskId: '1', title: 'A', costEstimate: 30, storyPoints: 10, status: 'ready' },
      { taskId: '2', title: 'B', costEstimate: 20, storyPoints: 5, status: 'ready' },
      { taskId: '3', title: 'C', costEstimate: 10, storyPoints: 8, status: 'ready' },
    ];
    const result = recommendTaskCuts(tasks, 40);
    const kept = result.filter((r) => r.action === 'keep');
    const totalPoints = kept.reduce((sum, r) => sum + r.storyPoints, 0);
    expect(totalPoints).toBe(18);
  });

  it('handles zero cost estimate gracefully', () => {
    const tasks: TaskCandidate[] = [
      { taskId: '1', title: 'Free', costEstimate: 0, storyPoints: 5, status: 'ready' },
      { taskId: '2', title: 'Paid', costEstimate: 10, storyPoints: 3, status: 'ready' },
    ];
    const result = recommendTaskCuts(tasks, 5);
    expect(result.find((r) => r.taskId === '1')!.action).toBe('keep');
    expect(result.find((r) => r.taskId === '2')!.action).toBe('drop');
  });
});

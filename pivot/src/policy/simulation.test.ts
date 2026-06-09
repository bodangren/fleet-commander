import { describe, expect, it } from 'bun:test';
import {
  simulateDispatches,
  aggregateSimulationReport,
  type SimulationDispatch,
} from './simulation';
import type { Task } from '../orchestrator/types';
import type { DispatchPolicyStatsInput, HarnessReliabilityStatsInput } from './statsClient';
import type { ConstraintContext } from '../orchestrator/constraints';

/**
 * Test helper that creates a Task with default values for unit testing
 * @param overrides - Partial Task to override defaults
 * @returns Task with test defaults
 */
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    projectSlug: 'test-project',
    trackId: 'track-1',
    taskKey: 'task-1',
    title: 'Test task',
    status: 'backlog',
    assignee: undefined,
    dependencies: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

const policyStats: DispatchPolicyStatsInput[] = [
  {
    persona: 'executor',
    taskKind: 'feature',
    repoType: 'default',
    reviewFailRate: 0.1,
    meanDurationMs: 1000,
    p50Cost: 0.2,
    p90Cost: 0.8,
    retryRate: 0.05,
    blockerCreationRate: 0,
    coverageRegressionRate: 0.1,
    sampleCount: 10,
    windowDays: 7,
    insufficientData: false,
    lastUpdatedAt: Date.now(),
  },
];

const harnessStats: HarnessReliabilityStatsInput[] = [
  {
    harnessName: 'opencode',
    successRate7d: 0.95,
    medianLatencyMs: 1000,
    averageTokens: 1500,
    reviewPassRateByTaskClassJson: '{}',
    topFailureModesJson: '[]',
    lastUpdatedAt: Date.now(),
  },
];

describe('simulateDispatches', () => {
  it('returns empty results for empty dispatches', async () => {
    const result = await simulateDispatches([], {}, {}, policyStats, harnessStats);
    expect(result).toEqual([]);
  });

  it('matches historical choice with default weights and no extra rules', async () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task' }),
      makeTask({ taskKey: 'task-b', title: 'priority:high task' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatch: SimulationDispatch = {
      historicalChoice: 'task-b',
      candidates: tasks,
      allTasks,
    };

    const result = await simulateDispatches([dispatch], {}, {}, policyStats, harnessStats);

    expect(result).toHaveLength(1);
    expect(result[0].historicalChoice).toBe('task-b');
    expect(result[0].simulatedChoice).toBe('task-b');
    expect(result[0].matched).toBe(true);
    expect(result[0].rejections).toHaveLength(0);
  });

  it('diverges when weights favor a different candidate', async () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task', projectSlug: 'mono-repo' }),
      makeTask({ taskKey: 'task-b', title: 'priority:high task', projectSlug: 'mono-repo' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatch: SimulationDispatch = {
      historicalChoice: 'task-b',
      candidates: tasks,
      allTasks,
    };

    // Zero out priority weight so task-b loses its advantage
    const result = await simulateDispatches(
      [dispatch],
      { priorityWeight: 0 },
      {},
      policyStats,
      harnessStats,
    );

    expect(result[0].historicalChoice).toBe('task-b');
    expect(result[0].matched).toBe(false);
  });

  it('rejects all candidates when rules are too strict', async () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task' }),
      makeTask({ taskKey: 'task-b', title: 'priority:high task' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatch: SimulationDispatch = {
      historicalChoice: 'task-b',
      candidates: tasks,
      allTasks,
    };

    const rules: Partial<ConstraintContext> = {
      budgetRemaining: 0, // strict budget rule rejects everything
    };

    const result = await simulateDispatches([dispatch], {}, rules, policyStats, harnessStats);

    expect(result[0].simulatedChoice).toBeNull();
    expect(result[0].matched).toBe(false);
    expect(result[0].rejections.length).toBeGreaterThan(0);
  });

  it('computes delta impact based on score difference', async () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task', projectSlug: 'mono-repo' }),
      makeTask({ taskKey: 'task-b', title: 'priority:high task', projectSlug: 'mono-repo' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatch: SimulationDispatch = {
      historicalChoice: 'task-a', // historically chose the worse one
      candidates: tasks,
      allTasks,
    };

    const result = await simulateDispatches([dispatch], {}, {}, policyStats, harnessStats);

    expect(result[0].matched).toBe(false);
    expect(result[0].simulatedChoice).toBe('task-b');
    expect(result[0].deltaImpact).toBeGreaterThan(0);
  });

  it('perf: simulates 1k dispatches in under 3s', async () => {
    const tasks: Task[] = [];
    for (let i = 0; i < 10; i++) {
      tasks.push(
        makeTask({
          taskKey: `task-${i}`,
          title: i % 2 === 0 ? 'priority:high task' : 'normal task',
          projectSlug: 'mono-repo',
        }),
      );
    }
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatches: SimulationDispatch[] = [];
    for (let i = 0; i < 1000; i++) {
      dispatches.push({
        historicalChoice: 'task-0',
        candidates: tasks,
        allTasks,
      });
    }

    const start = performance.now();
    await simulateDispatches(dispatches, {}, {}, policyStats, harnessStats);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(3000);
  });
});

describe('aggregateSimulationReport', () => {
  it('returns zero deltas for empty results', () => {
    const report = aggregateSimulationReport([], []);
    expect(report.totalDispatches).toBe(0);
    expect(report.throughputDelta).toBe(0);
    expect(report.costDelta).toBe(0);
    expect(report.passRateDelta).toBe(0);
    expect(report.retryRateDelta).toBe(0);
    expect(report.coverageRegressionDelta).toBe(0);
    expect(report.starvationMaxAgeDelta).toBe(0);
    expect(report.rejectionRate).toBe(0);
    expect(report.misconfigurationWarning).toBe(false);
  });

  it('computes throughput drop when all candidates are rejected', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatches: SimulationDispatch[] = [
      {
        historicalChoice: 'task-a',
        candidates: tasks,
        allTasks,
        outcome: { executorStatus: 'succeeded' as const },
      },
    ];
    const results = [
      {
        historicalChoice: 'task-a',
        simulatedChoice: null,
        matched: false,
        deltaImpact: 1,
        rejections: [{ taskKey: 'task-a', filter: 'withinBudget', reason: 'Budget exceeded' }],
      },
    ];

    const report = aggregateSimulationReport(results, dispatches);

    expect(report.throughputDelta).toBe(-1); // 0 vs 1
    expect(report.rejectionRate).toBe(1);
    expect(report.misconfigurationWarning).toBe(true);
  });

  it('computes zero deltas when all choices match', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatches: SimulationDispatch[] = [
      {
        historicalChoice: 'task-a',
        candidates: tasks,
        allTasks,
        outcome: {
          executorStatus: 'succeeded' as const,
          reviewerStatus: 'passed' as const,
          cost: 1,
          retries: 0,
          coverageRegression: false,
        },
      },
    ];
    const results = [
      {
        historicalChoice: 'task-a',
        simulatedChoice: 'task-a',
        matched: true,
        deltaImpact: 0,
        rejections: [],
      },
    ];

    const report = aggregateSimulationReport(results, dispatches);

    expect(report.throughputDelta).toBe(0);
    expect(report.costDelta).toBe(0);
    expect(report.passRateDelta).toBe(0);
    expect(report.retryRateDelta).toBe(0);
    expect(report.coverageRegressionDelta).toBe(0);
    expect(report.rejectionRate).toBe(0);
    expect(report.misconfigurationWarning).toBe(false);
  });

  it('aggregates pass rate and retry deltas across multiple dispatches', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatches: SimulationDispatch[] = [
      {
        historicalChoice: 'task-a',
        candidates: tasks,
        allTasks,
        outcome: {
          executorStatus: 'succeeded' as const,
          reviewerStatus: 'passed' as const,
          cost: 1,
          retries: 0,
          coverageRegression: false,
        },
      },
      {
        historicalChoice: 'task-a',
        candidates: tasks,
        allTasks,
        outcome: {
          executorStatus: 'failed' as const,
          reviewerStatus: 'failed' as const,
          cost: 2,
          retries: 1,
          coverageRegression: true,
        },
      },
    ];
    const results = [
      {
        historicalChoice: 'task-a',
        simulatedChoice: 'task-a',
        matched: true,
        deltaImpact: 0,
        rejections: [],
      },
      {
        historicalChoice: 'task-a',
        simulatedChoice: 'task-a',
        matched: true,
        deltaImpact: 0,
        rejections: [],
      },
    ];

    const report = aggregateSimulationReport(results, dispatches);

    expect(report.totalDispatches).toBe(2);
    expect(report.divergences).toHaveLength(0);
    expect(report.passRateDelta).toBe(0);
    expect(report.retryRateDelta).toBe(0);
    expect(report.costDelta).toBe(0);
  });

  it('computes coverage regression delta when diverged', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task' }),
    ];
    const allTasks = new Map<string, Task>(tasks.map((t) => [t.taskKey, t]));
    const dispatches: SimulationDispatch[] = [
      {
        historicalChoice: 'task-a',
        candidates: tasks,
        allTasks,
        outcome: {
          executorStatus: 'succeeded' as const,
          coverageRegression: true,
        },
      },
    ];
    const results = [
      {
        historicalChoice: 'task-a',
        simulatedChoice: null,
        matched: false,
        deltaImpact: 1,
        rejections: [{ taskKey: 'task-a', filter: 'test', reason: 'rejected' }],
      },
    ];

    const report = aggregateSimulationReport(results, dispatches);

    expect(report.coverageRegressionDelta).toBeLessThan(0);
    expect(report.throughputDelta).toBe(-1);
  });
});

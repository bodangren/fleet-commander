import { describe, expect, it } from 'bun:test';
import {
  priorityWeight,
  unblockImpact,
  personaFitness,
  harnessReliability,
  expectedCost,
  starvationBonus,
  regressionRisk,
  retryFatigue,
  affinityScore,
  scoreCandidate,
  DEFAULT_WEIGHTS,
  type ScoreCandidateContext,
} from './scoring';
import type { Task } from '../orchestrator/types';
import type { DispatchPolicyStatsInput } from './statsClient';

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
    status: 'todo',
    assignee: undefined,
    dependencies: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('priorityWeight', () => {
  it('returns high weight for priority:high in title', () => {
    const task = makeTask({ title: 'Fix bug priority:high' });
    expect(priorityWeight(task)).toBeGreaterThan(1);
  });

  it('returns base weight for normal priority tasks', () => {
    const task = makeTask({ title: 'Regular task' });
    expect(priorityWeight(task)).toBe(1);
  });

  it('returns lower weight for blocked tasks', () => {
    const task = makeTask({ status: 'blocked' });
    expect(priorityWeight(task)).toBeLessThan(1);
  });
});

describe('unblockImpact', () => {
  it('returns count of tasks that depend on this task', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a' }),
      makeTask({ taskKey: 'task-b', dependencies: ['task-a'] }),
      makeTask({ taskKey: 'task-c', dependencies: ['task-a'] }),
    ];

    expect(unblockImpact(tasks[0], tasks)).toBe(2);
  });

  it('returns 0 when no tasks depend on it', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a' }),
      makeTask({ taskKey: 'task-b' }),
    ];

    expect(unblockImpact(tasks[0], tasks)).toBe(0);
  });

  it('ignores self-dependencies', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', dependencies: ['task-a'] }),
    ];

    expect(unblockImpact(tasks[0], tasks)).toBe(0);
  });
});

describe('personaFitness', () => {
  it('returns 1 - reviewFailRate for matching bucket', () => {
    const stats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        reviewFailRate: 0.2,
        meanDurationMs: 1000,
        p50Cost: 0.5,
        p90Cost: 1.0,
        retryRate: 0.1,
        blockerCreationRate: 0,
        coverageRegressionRate: 0,
        sampleCount: 10,
        windowDays: 7,
        insufficientData: false,
        lastUpdatedAt: Date.now(),
      },
    ];

    expect(personaFitness('executor', 'feature', 'default', stats)).toBe(0.8);
  });

  it('returns neutral 0.5 when bucket is not found', () => {
    const stats: DispatchPolicyStatsInput[] = [];
    expect(personaFitness('executor', 'feature', 'default', stats)).toBe(0.5);
  });

  it('returns neutral 0.5 when insufficientData is true', () => {
    const stats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        reviewFailRate: 0.2,
        meanDurationMs: 1000,
        p50Cost: 0.5,
        p90Cost: 1.0,
        retryRate: 0.1,
        blockerCreationRate: 0,
        coverageRegressionRate: 0,
        sampleCount: 2,
        windowDays: 7,
        insufficientData: true,
        lastUpdatedAt: Date.now(),
      },
    ];

    expect(personaFitness('executor', 'feature', 'default', stats)).toBe(0.5);
  });
});

describe('harnessReliability', () => {
  it('returns successRate7d for matching harness', () => {
    const stats = [
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

    expect(harnessReliability('opencode', stats)).toBe(0.95);
  });

  it('returns neutral 0.5 when harness not found', () => {
    expect(harnessReliability('unknown', [])).toBe(0.5);
  });
});

describe('expectedCost', () => {
  it('returns 1 - p50Cost as efficiency bonus', () => {
    const stats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        reviewFailRate: 0.1,
        meanDurationMs: 1000,
        p50Cost: 0.3,
        p90Cost: 0.8,
        retryRate: 0.1,
        blockerCreationRate: 0,
        coverageRegressionRate: 0,
        sampleCount: 10,
        windowDays: 7,
        insufficientData: false,
        lastUpdatedAt: Date.now(),
      },
    ];

    expect(expectedCost('executor', 'feature', 'default', stats)).toBe(0.7);
  });

  it('returns neutral 0.5 when bucket not found', () => {
    expect(expectedCost('executor', 'feature', 'default', [])).toBe(0.5);
  });

  it('returns neutral 0.5 when insufficientData', () => {
    const stats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        reviewFailRate: 0.1,
        meanDurationMs: 1000,
        p50Cost: 0.3,
        p90Cost: 0.8,
        retryRate: 0.1,
        blockerCreationRate: 0,
        coverageRegressionRate: 0,
        sampleCount: 2,
        windowDays: 7,
        insufficientData: true,
        lastUpdatedAt: Date.now(),
      },
    ];

    expect(expectedCost('executor', 'feature', 'default', stats)).toBe(0.5);
  });
});

describe('starvationBonus', () => {
  it('returns 0 for recently updated tasks', () => {
    const now = Date.now();
    const task = makeTask({ updatedAt: now - 1000 });
    expect(starvationBonus(task, now)).toBe(0);
  });

  it('returns positive bonus for old tasks', () => {
    const now = Date.now();
    const task = makeTask({ updatedAt: now - 48 * 60 * 60 * 1000 });
    const bonus = starvationBonus(task, now);
    expect(bonus).toBeGreaterThan(0);
  });
});

describe('regressionRisk', () => {
  it('returns coverageRegressionRate as penalty base', () => {
    const stats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        reviewFailRate: 0.1,
        meanDurationMs: 1000,
        p50Cost: 0.5,
        p90Cost: 1.0,
        retryRate: 0.1,
        blockerCreationRate: 0,
        coverageRegressionRate: 0.3,
        sampleCount: 10,
        windowDays: 7,
        insufficientData: false,
        lastUpdatedAt: Date.now(),
      },
    ];

    expect(regressionRisk('executor', 'feature', 'default', stats)).toBe(0.3);
  });

  it('returns 0 when bucket not found', () => {
    expect(regressionRisk('executor', 'feature', 'default', [])).toBe(0);
  });

  it('returns 0 when insufficientData', () => {
    const stats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        reviewFailRate: 0.1,
        meanDurationMs: 1000,
        p50Cost: 0.5,
        p90Cost: 1.0,
        retryRate: 0.1,
        blockerCreationRate: 0,
        coverageRegressionRate: 0.3,
        sampleCount: 2,
        windowDays: 7,
        insufficientData: true,
        lastUpdatedAt: Date.now(),
      },
    ];

    expect(regressionRisk('executor', 'feature', 'default', stats)).toBe(0);
  });
});

describe('retryFatigue', () => {
  it('returns 0 for tasks with no retries', () => {
    const task = makeTask({ retryCount: undefined });
    expect(retryFatigue(task)).toBe(0);
  });

  it('returns penalty proportional to retry count', () => {
    const task = makeTask({ retryCount: 3 });
    expect(retryFatigue(task)).toBeCloseTo(0.3, 2);
  });
});

describe('scoreCandidate', () => {
  const now = Date.now();

  it('composes all components with default weights', () => {
    const task = makeTask({
      taskKey: 'task-feature-1',
      projectSlug: 'mono-repo',
      title: 'priority:high fix',
      updatedAt: now - 48 * 60 * 60 * 1000,
      retryCount: 1,
    });

    const policyStats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'monorepo',
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
        lastUpdatedAt: now,
      },
    ];

    const harnessStats = [
      {
        harnessName: 'opencode',
        successRate7d: 0.95,
        medianLatencyMs: 1000,
        averageTokens: 1500,
        reviewPassRateByTaskClassJson: '{}',
        topFailureModesJson: '[]',
        lastUpdatedAt: now,
      },
    ];

    const result = scoreCandidate(
      task,
      { name: 'opencode' },
      policyStats,
      harnessStats,
      { now, allTasks: [task] },
    );

    expect(typeof result.score).toBe('number');
    expect(result.breakdown.priorityWeight).toBe(2);
    expect(result.breakdown.unblockImpact).toBe(0);
    expect(result.breakdown.personaFitness).toBe(0.9);
    expect(result.breakdown.harnessReliability).toBe(0.95);
    expect(result.breakdown.expectedCost).toBe(0.8);
    expect(result.breakdown.starvationBonus).toBeGreaterThan(0);
    expect(result.breakdown.regressionRisk).toBe(0.1);
    expect(result.breakdown.retryFatigue).toBe(0.1);
  });

  it('uses custom weights when provided', () => {
    const task = makeTask({ taskKey: 'task-feature-1', projectSlug: 'mono-repo' });

    const result1 = scoreCandidate(
      task,
      { name: 'opencode' },
      [],
      [],
      { now, weights: { priorityWeight: 10 } },
    );

    const result2 = scoreCandidate(
      task,
      { name: 'opencode' },
      [],
      [],
      { now, weights: { priorityWeight: 1 } },
    );

    expect(result1.score).toBeGreaterThan(result2.score);
  });

  it('falls back to neutral for insufficient data buckets', () => {
    const task = makeTask({
      taskKey: 'task-feature-1',
      projectSlug: 'mono-repo',
    });

    const policyStats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'monorepo',
        reviewFailRate: 0.1,
        meanDurationMs: 1000,
        p50Cost: 0.2,
        p90Cost: 0.8,
        retryRate: 0.05,
        blockerCreationRate: 0,
        coverageRegressionRate: 0.1,
        sampleCount: 2,
        windowDays: 7,
        insufficientData: true,
        lastUpdatedAt: now,
      },
    ];

    const result = scoreCandidate(
      task,
      { name: 'opencode' },
      policyStats,
      [],
      { now },
    );

    expect(result.breakdown.personaFitness).toBe(0.5);
    expect(result.breakdown.expectedCost).toBe(0.5);
    expect(result.breakdown.regressionRisk).toBe(0);
  });

  it('perf: scores 100 candidates in under 50ms', () => {
    const task = makeTask({
      taskKey: 'task-feature-1',
      projectSlug: 'mono-repo',
    });
    const policyStats: DispatchPolicyStatsInput[] = [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'monorepo',
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
        lastUpdatedAt: now,
      },
    ];
    const harnessStats = [
      {
        harnessName: 'opencode',
        successRate7d: 0.95,
        medianLatencyMs: 1000,
        averageTokens: 1500,
        reviewPassRateByTaskClassJson: '{}',
        topFailureModesJson: '[]',
        lastUpdatedAt: now,
      },
    ];

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      scoreCandidate(
        task,
        { name: 'opencode' },
        policyStats,
        harnessStats,
        { now },
      );
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});

describe('affinityScore', () => {
  const makePolicy = (affinityRules: Array<{ ifTask: string; preferHarness: string }>) => ({
    perRepoConcurrency: {},
    globalConcurrency: 5,
    budgetPacing: 0,
    affinity: affinityRules,
    antiAffinity: [],
  });

  it('returns 1 when task matches affinity rule for harness', () => {
    const task = makeTask({ taskKey: 'feature/new-thing' });
    const policy = makePolicy([{ ifTask: 'feature:*', preferHarness: 'opencode' }]);

    const score = affinityScore(task, 'opencode', policy);

    expect(score).toBe(1);
  });

  it('returns 0 when task does not match any affinity rule', () => {
    const task = makeTask({ taskKey: 'feature/new-thing' });
    const policy = makePolicy([{ ifTask: 'bug:*', preferHarness: 'opencode' }]);

    const score = affinityScore(task, 'opencode', policy);

    expect(score).toBe(0);
  });

  it('returns 0 when harness does not match preferred harness', () => {
    const task = makeTask({ taskKey: 'feature/new-thing' });
    const policy = makePolicy([{ ifTask: 'feature:*', preferHarness: 'reviewer' }]);

    const score = affinityScore(task, 'opencode', policy);

    expect(score).toBe(0);
  });

  it('matches wildcard task pattern', () => {
    const task = makeTask({ taskKey: 'anything-here' });
    const policy = makePolicy([{ ifTask: '*', preferHarness: 'opencode' }]);

    const score = affinityScore(task, 'opencode', policy);

    expect(score).toBe(1);
  });

  it('matches specific task kind patterns', () => {
    const bugTask = makeTask({ taskKey: 'bug-123-fix-login' });
    const choreTask = makeTask({ taskKey: 'chore-cleanup-code' });
    const policy = makePolicy([
      { ifTask: 'bug:*', preferHarness: 'opencode' },
      { ifTask: 'chore:*', preferHarness: 'reviewer' },
    ]);

    expect(affinityScore(bugTask, 'opencode', policy)).toBe(1);
    expect(affinityScore(choreTask, 'reviewer', policy)).toBe(1);
    expect(affinityScore(bugTask, 'reviewer', policy)).toBe(0);
    expect(affinityScore(choreTask, 'opencode', policy)).toBe(0);
  });
});

describe('scoreCandidate with affinity', () => {
  it('includes affinity in breakdown when allocationPolicy provided', () => {
    const task = makeTask({ taskKey: 'feature/new' });
    const harness = { name: 'opencode' };
    const policy = {
      perRepoConcurrency: {},
      globalConcurrency: 5,
      budgetPacing: 0,
      affinity: [{ ifTask: 'feature:*', preferHarness: 'opencode' }],
      antiAffinity: [],
    };

    const result = scoreCandidate(task, harness, [], [], { allocationPolicy: policy });

    expect(result.breakdown.affinity).toBe(1);
  });

  it('affinity boosts total score when matched', () => {
    const task = makeTask({ taskKey: 'feature/new' });
    const harness = { name: 'opencode' };
    const policy = {
      perRepoConcurrency: {},
      globalConcurrency: 5,
      budgetPacing: 0,
      affinity: [{ ifTask: 'feature:*', preferHarness: 'opencode' }],
      antiAffinity: [],
    };

    const withAffinity = scoreCandidate(task, harness, [], [], {
      allocationPolicy: policy,
      weights: { affinity: 0.5 },
    });
    const withoutAffinity = scoreCandidate(task, harness, [], [], {
      allocationPolicy: policy,
      weights: { affinity: 0 },
    });

    expect(withAffinity.score).toBeGreaterThan(withoutAffinity.score);
  });
});

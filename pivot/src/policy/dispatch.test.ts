import { describe, expect, it } from 'bun:test';
import { selectBestCandidate } from './dispatch';
import type { Task } from '../orchestrator/types';
import type { DispatchPolicyStatsInput, HarnessReliabilityStatsInput } from './statsClient';

/**
 * Creates new task instance for dispatch tests.
 * @param overrides - Partial task overrides
 * @returns Task with defaults applied
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

describe('selectBestCandidate', () => {
  const now = Date.now();
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
  const harnessStats: HarnessReliabilityStatsInput[] = [
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

  it('returns null for empty eligible tasks', async () => {
    const result = await selectBestCandidate([], { name: 'opencode' }, policyStats, harnessStats);
    expect(result).toBeNull();
  });

  it('selects highest-scoring candidate', async () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task', projectSlug: 'mono-repo' }),
      makeTask({ taskKey: 'task-b', title: 'priority:high task', projectSlug: 'mono-repo' }),
    ];

    const result = await selectBestCandidate(tasks, { name: 'opencode' }, policyStats, harnessStats);

    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('task-b');
    expect(result!.score).toBeGreaterThan(0);
  });

  it('flags llmTieBreak when top scores are close', async () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'task', projectSlug: 'mono-repo' }),
      makeTask({ taskKey: 'task-b', title: 'task', projectSlug: 'mono-repo' }),
    ];

    const result = await selectBestCandidate(tasks, { name: 'opencode' }, policyStats, harnessStats, {
      epsilon: 10, // very large epsilon to force tie
    });

    expect(result!.llmTieBreak).toBe(true);
    expect(result!.justification).toContain('tie');
  });

  it('does not flag tie break when scores differ significantly', async () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 'task-a', title: 'Normal task', projectSlug: 'mono-repo' }),
      makeTask({ taskKey: 'task-b', title: 'priority:high task', projectSlug: 'mono-repo' }),
    ];

    const result = await selectBestCandidate(tasks, { name: 'opencode' }, policyStats, harnessStats, {
      epsilon: 0.01,
    });

    expect(result!.llmTieBreak).toBe(false);
    expect(result!.justification).toContain('Highest score');
  });

  it('perf: selects from 100 candidates in under 250ms', async () => {
    const tasks: Task[] = [];
    for (let i = 0; i < 100; i++) {
      tasks.push(
        makeTask({
          taskKey: `task-${i}`,
          title: i % 2 === 0 ? 'priority:high task' : 'normal task',
          projectSlug: 'mono-repo',
        }),
      );
    }

    const start = performance.now();
    await selectBestCandidate(tasks, { name: 'opencode' }, policyStats, harnessStats);
    const elapsed = performance.now() - start;

    // Guards against algorithmic blowup (e.g. accidental O(n²) or a network
    // call in the hot path), not a precise latency budget — kept generous so
    // it does not flake under concurrent CPU load on CI / shared machines.
    expect(elapsed).toBeLessThan(250);
  });
});

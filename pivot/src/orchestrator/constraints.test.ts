import { describe, expect, it } from 'bun:test';
import type { Task } from './types';
import type { HarnessProfile } from '../shared/harnessProfile';
import {
  dependencyReady,
  tagBlockedBy,
  notManuallyBlocked,
  withinBudget,
  worktreeAvailable,
  harnessAvailableForClass,
  reviewDebtUnderThreshold,
  coverageGateSatisfied,
  filterEligibleTasks,
  type ConstraintContext,
} from './constraints';

/**
 * Test helper that creates a Task with defaults.
 */
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    projectSlug: 'test',
    trackId: 'feature_track_20260415',
    taskKey: 't1',
    title: 'Test task',
    status: 'todo',
    assignee: 'agent-1',
    dependencies: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('dependencyReady', () => {
  it('returns null when task has no dependencies', () => {
    const task = makeTask({ dependencies: [] });
    expect(dependencyReady(task, new Map())).toBeNull();
  });

  it('returns null when all dependencies are done', () => {
    const task = makeTask({ dependencies: ['t2', 't3'] });
    const allTasks = new Map<string, Task>([
      ['t2', makeTask({ taskKey: 't2', status: 'done' })],
      ['t3', makeTask({ taskKey: 't3', status: 'done' })],
    ]);
    expect(dependencyReady(task, allTasks)).toBeNull();
  });

  it('returns rejection when a dependency is missing', () => {
    const task = makeTask({ dependencies: ['t2'] });
    const allTasks = new Map<string, Task>();
    const result = dependencyReady(task, allTasks);
    expect(result).not.toBeNull();
    expect(result!.filter).toBe('dependencyReady');
    expect(result!.taskKey).toBe('t1');
    expect(result!.reason).toContain('t2');
  });

  it('returns rejection when a dependency is not done', () => {
    const task = makeTask({ dependencies: ['t2'] });
    const allTasks = new Map<string, Task>([
      ['t2', makeTask({ taskKey: 't2', status: 'in_progress' })],
    ]);
    const result = dependencyReady(task, allTasks);
    expect(result).not.toBeNull();
    expect(result!.reason).toContain('t2');
  });
});

describe('notManuallyBlocked', () => {
  it('returns null for todo task with no deps', () => {
    const task = makeTask({ status: 'todo', dependencies: [] });
    expect(notManuallyBlocked(task)).toBeNull();
  });

  it('returns null for blocked task with dependencies', () => {
    const task = makeTask({ status: 'blocked', dependencies: ['t2'] });
    expect(notManuallyBlocked(task)).toBeNull();
  });

  it('returns rejection for blocked task with no dependencies', () => {
    const task = makeTask({ status: 'blocked', dependencies: [] });
    const result = notManuallyBlocked(task);
    expect(result).not.toBeNull();
    expect(result!.filter).toBe('notManuallyBlocked');
    expect(result!.reason).toContain('manually blocked');
  });
});

describe('withinBudget', () => {
  it('returns null when budget is undefined', () => {
    const task = makeTask();
    expect(withinBudget(task, undefined)).toBeNull();
  });

  it('returns null when budget is positive', () => {
    const task = makeTask();
    expect(withinBudget(task, 100)).toBeNull();
  });

  it('returns rejection when budget is zero', () => {
    const task = makeTask();
    const result = withinBudget(task, 0);
    expect(result).not.toBeNull();
    expect(result!.filter).toBe('withinBudget');
    expect(result!.reason).toContain('Budget exceeded');
  });

  it('returns rejection when budget is negative', () => {
    const task = makeTask();
    const result = withinBudget(task, -1);
    expect(result).not.toBeNull();
    expect(result!.reason).toContain('Budget exceeded');
  });
});

describe('worktreeAvailable', () => {
  it('returns null when activeWorktreeTasks is undefined', () => {
    const task = makeTask();
    expect(worktreeAvailable(task, undefined)).toBeNull();
  });

  it('returns null when task is not in active set', () => {
    const task = makeTask();
    expect(worktreeAvailable(task, new Set(['t2']))).toBeNull();
  });

  it('returns rejection when task has active worktree', () => {
    const task = makeTask();
    const result = worktreeAvailable(task, new Set(['t1']));
    expect(result).not.toBeNull();
    expect(result!.filter).toBe('worktreeAvailable');
    expect(result!.reason).toContain('Worktree unavailable');
  });
});

describe('harnessAvailableForClass', () => {
  const featureProfile: HarnessProfile = {
    name: 'opencode',
    binary: 'opencode',
    invocation: { template: 'opencode {prompt}', flags: {} },
    capabilities: {
      supportedTaskClasses: ['feature'],
      supportsContinuousMode: false,
      maxConcurrentTasks: 1,
      supportedLlmProviders: [],
    },
  };

  const multiProfile: HarnessProfile = {
    name: 'opencode',
    binary: 'opencode',
    invocation: { template: 'opencode {prompt}', flags: {} },
    capabilities: {
      supportedTaskClasses: ['feature', 'bug', 'chore'],
      supportsContinuousMode: false,
      maxConcurrentTasks: 1,
      supportedLlmProviders: [],
    },
    policy: {
      allowed_task_classes: ['feature', 'bug'],
      concurrency_limit: 1,
      retry_with_human_review_on_failure: false,
    },
  };

  it('returns null when no assignee', () => {
    const task = makeTask({ assignee: undefined });
    expect(harnessAvailableForClass(task, new Map())).toBeNull();
  });

  it('returns null when agentHarnessMap is undefined', () => {
    const task = makeTask();
    expect(harnessAvailableForClass(task, undefined)).toBeNull();
  });

  it('returns rejection when agent has no harness profile', () => {
    const task = makeTask();
    const result = harnessAvailableForClass(task, new Map());
    expect(result).not.toBeNull();
    expect(result!.filter).toBe('harnessAvailableForClass');
    expect(result!.reason).toContain('No harness profile');
  });

  it('returns rejection when harness does not support task class', () => {
    const task = makeTask({ trackId: 'bug_track_20260415' });
    const result = harnessAvailableForClass(
      task,
      new Map([['agent-1', featureProfile]]),
    );
    expect(result).not.toBeNull();
    expect(result!.reason).toContain('does not support task class bug');
  });

  it('returns rejection when policy forbids task class', () => {
    const task = makeTask({ trackId: 'chore_track_20260415' });
    const result = harnessAvailableForClass(
      task,
      new Map([['agent-1', multiProfile]]),
    );
    expect(result).not.toBeNull();
    expect(result!.reason).toContain('Policy forbids task class chore');
  });

  it('returns null when harness supports and policy allows task class', () => {
    const task = makeTask({ trackId: 'feature_track_20260415' });
    expect(
      harnessAvailableForClass(
        task,
        new Map([['agent-1', multiProfile]]),
      ),
    ).toBeNull();
  });

  it('defaults to feature when capabilities are missing', () => {
    const profile: HarnessProfile = {
      name: 'opencode',
      binary: 'opencode',
      invocation: { template: 'opencode {prompt}', flags: {} },
    };
    const task = makeTask({ trackId: 'feature_track_20260415' });
    expect(
      harnessAvailableForClass(
        task,
        new Map([['agent-1', profile]]),
      ),
    ).toBeNull();
  });
});

describe('reviewDebtUnderThreshold', () => {
  it('returns null when threshold is undefined', () => {
    const task = makeTask();
    expect(reviewDebtUnderThreshold(task, undefined, undefined)).toBeNull();
  });

  it('returns null when debt is under threshold', () => {
    const task = makeTask();
    const debt = new Map([['agent-1', 2]]);
    expect(reviewDebtUnderThreshold(task, debt, 5)).toBeNull();
  });

  it('returns null when agent has no recorded debt', () => {
    const task = makeTask();
    const debt = new Map<string, number>();
    expect(reviewDebtUnderThreshold(task, debt, 5)).toBeNull();
  });

  it('returns rejection when debt exceeds threshold', () => {
    const task = makeTask();
    const debt = new Map([['agent-1', 6]]);
    const result = reviewDebtUnderThreshold(task, debt, 5);
    expect(result).not.toBeNull();
    expect(result!.filter).toBe('reviewDebtUnderThreshold');
    expect(result!.reason).toContain('6');
    expect(result!.reason).toContain('5');
  });

  it('returns null when debt equals threshold', () => {
    const task = makeTask();
    const debt = new Map([['agent-1', 5]]);
    expect(reviewDebtUnderThreshold(task, debt, 5)).toBeNull();
  });
});

describe('coverageGateSatisfied', () => {
  it('returns null when threshold is undefined', () => {
    const task = makeTask();
    expect(coverageGateSatisfied(task, 80, undefined)).toBeNull();
  });

  it('returns null when percentage meets threshold', () => {
    const task = makeTask();
    expect(coverageGateSatisfied(task, 80, 80)).toBeNull();
  });

  it('returns null when percentage exceeds threshold', () => {
    const task = makeTask();
    expect(coverageGateSatisfied(task, 85, 80)).toBeNull();
  });

  it('returns rejection when percentage is below threshold', () => {
    const task = makeTask();
    const result = coverageGateSatisfied(task, 75, 80);
    expect(result).not.toBeNull();
    expect(result!.filter).toBe('coverageGateSatisfied');
    expect(result!.reason).toContain('75%');
    expect(result!.reason).toContain('80%');
  });
});

describe('filterEligibleTasks', () => {
  it('returns all eligible tasks and empty rejections when constraints pass', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 't1', status: 'todo', dependencies: [] }),
      makeTask({ taskKey: 't2', status: 'todo', dependencies: [] }),
    ];
    const context: ConstraintContext = {
      allTasks: new Map(tasks.map((t) => [t.taskKey, t])),
    };
    const result = filterEligibleTasks(tasks, context);
    expect(result.eligible).toHaveLength(2);
    expect(result.rejections).toHaveLength(0);
  });

  it('filters out done and in_progress tasks', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 't1', status: 'done' }),
      makeTask({ taskKey: 't2', status: 'in_progress' }),
      makeTask({ taskKey: 't3', status: 'todo' }),
    ];
    const context: ConstraintContext = {
      allTasks: new Map(tasks.map((t) => [t.taskKey, t])),
    };
    const result = filterEligibleTasks(tasks, context);
    expect(result.eligible.map((t) => t.task.taskKey)).toEqual(['t3']);
  });

  it('filters out tasks from complete tracks', () => {
    const tasks: Task[] = [
      makeTask({ taskKey: 't1', trackId: 'track-a', status: 'todo' }),
      makeTask({ taskKey: 't2', trackId: 'track-b', status: 'todo' }),
    ];
    const trackStatuses = new Map([['track-a', 'complete']]);
    const context: ConstraintContext = {
      allTasks: new Map(tasks.map((t) => [t.taskKey, t])),
    };
    const result = filterEligibleTasks(tasks, context, trackStatuses);
    expect(result.eligible.map((t) => t.task.taskKey)).toEqual(['t2']);
  });

  it('aggregates rejections from multiple failed constraints', () => {
    const tasks: Task[] = [
      makeTask({
        taskKey: 't1',
        status: 'blocked',
        dependencies: [],
        assignee: 'agent-1',
      }),
    ];
    const profile: HarnessProfile = {
      name: 'opencode',
      binary: 'opencode',
      invocation: { template: 'opencode {prompt}', flags: {} },
      capabilities: {
        supportedTaskClasses: ['bug'],
        supportsContinuousMode: false,
        maxConcurrentTasks: 1,
        supportedLlmProviders: [],
      },
    };
    const context: ConstraintContext = {
      allTasks: new Map(tasks.map((t) => [t.taskKey, t])),
      agentHarnessMap: new Map([['agent-1', profile]]),
    };
    const result = filterEligibleTasks(tasks, context);
    expect(result.eligible).toHaveLength(0);
    expect(result.rejections.length).toBeGreaterThanOrEqual(2);
    const filters = result.rejections.map((r) => r.filter);
    expect(filters).toContain('notManuallyBlocked');
    expect(filters).toContain('harnessAvailableForClass');
  });

  it('returns tasks with rationale when they pass all constraints', () => {
    const task = makeTask({ taskKey: 't1' });
    const context: ConstraintContext = {
      allTasks: new Map([['t1', task]]),
    };
    const result = filterEligibleTasks([task], context);
    expect(result.eligible[0].rationale).toBe('passed all hard constraints');
  });

  it('rejects tasks blocked by #blocked_by tag', () => {
    const task = makeTask({
      taskKey: 't2',
      tags: { blocked_by: 't1' },
    });
    const blocker = makeTask({ taskKey: 't1', status: 'todo' });
    const allTasks = new Map([
      ['t1', blocker],
      ['t2', task],
    ]);
    const result = filterEligibleTasks([task], { allTasks });
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].filter).toBe('tagBlockedBy');
  });

  it('allows tasks when #blocked_by dependency is done', () => {
    const task = makeTask({
      taskKey: 't2',
      tags: { blocked_by: 't1' },
    });
    const blocker = makeTask({ taskKey: 't1', status: 'done' });
    const allTasks = new Map([
      ['t1', blocker],
      ['t2', task],
    ]);
    const result = filterEligibleTasks([task], { allTasks });
    expect(result.eligible).toHaveLength(1);
  });
});

describe('tagBlockedBy', () => {
  it('returns null when no blocked_by tag', () => {
    const task = makeTask({ taskKey: 't1' });
    expect(tagBlockedBy(task, new Map())).toBeNull();
  });

  it('rejects when blocked task is not done', () => {
    const task = makeTask({
      taskKey: 't2',
      tags: { blocked_by: 't1' },
    });
    const blocker = makeTask({ taskKey: 't1', status: 'in_progress' });
    const allTasks = new Map([['t1', blocker]]);
    const result = tagBlockedBy(task, allTasks);
    expect(result).not.toBeNull();
    expect(result!.reason).toContain('in_progress');
  });

  it('rejects when blocked task does not exist', () => {
    const task = makeTask({
      taskKey: 't2',
      tags: { blocked_by: 'missing' },
    });
    const result = tagBlockedBy(task, new Map());
    expect(result).not.toBeNull();
    expect(result!.reason).toContain('not found');
  });

  it('passes when blocked task is done', () => {
    const task = makeTask({
      taskKey: 't2',
      tags: { blocked_by: 't1' },
    });
    const blocker = makeTask({ taskKey: 't1', status: 'done' });
    const allTasks = new Map([['t1', blocker]]);
    expect(tagBlockedBy(task, allTasks)).toBeNull();
  });
});

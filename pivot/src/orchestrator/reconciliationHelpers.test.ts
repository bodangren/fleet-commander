import { describe, expect, it } from 'bun:test';
import {
  detectStuckTasks,
  detectOrphanSprints,
  reconcileTaskState,
  type TaskRecord,
  type PipelineRunRecord,
  type SprintRecord,
} from './reconciliationHelpers';

describe('detectStuckTasks', () => {
  const now = Date.now();

  it('returns empty when no tasks are in_progress', () => {
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'ready', updatedAt: now - 60 * 60 * 1000 },
      { _id: 't2', status: 'done', updatedAt: now - 60 * 60 * 1000 },
    ];
    expect(detectStuckTasks(tasks, [], 30 * 60 * 1000, now)).toEqual([]);
  });

  it('returns empty when in_progress task is within threshold', () => {
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'in_progress', updatedAt: now - 10 * 60 * 1000 },
    ];
    expect(detectStuckTasks(tasks, [], 30 * 60 * 1000, now)).toEqual([]);
  });

  it('returns task ID when stuck in_progress with no running pipeline run', () => {
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'in_progress', updatedAt: now - 45 * 60 * 1000 },
    ];
    expect(detectStuckTasks(tasks, [], 30 * 60 * 1000, now)).toEqual(['t1']);
  });

  it('returns empty when stuck but has a running pipeline run', () => {
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'in_progress', updatedAt: now - 45 * 60 * 1000 },
    ];
    const runs: PipelineRunRecord[] = [
      { taskId: 't1', status: 'running', startTime: now - 40 * 60 * 1000 },
    ];
    expect(detectStuckTasks(tasks, runs, 30 * 60 * 1000, now)).toEqual([]);
  });

  it('detects multiple stuck tasks', () => {
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'in_progress', updatedAt: now - 45 * 60 * 1000 },
      { _id: 't2', status: 'in_progress', updatedAt: now - 60 * 60 * 1000 },
      { _id: 't3', status: 'in_progress', updatedAt: now - 10 * 60 * 1000 },
    ];
    const result = detectStuckTasks(tasks, [], 30 * 60 * 1000, now);
    expect(result).toEqual(['t1', 't2']);
  });
});

describe('detectOrphanSprints', () => {
  it('returns empty for non-active sprints', () => {
    const sprints: SprintRecord[] = [
      { _id: 's1', status: 'closed', projectId: 'p1' },
      { _id: 's2', status: 'planned', projectId: 'p1' },
    ];
    expect(detectOrphanSprints(sprints, [])).toEqual([]);
  });

  it('returns empty when active sprint has ready tasks', () => {
    const sprints: SprintRecord[] = [{ _id: 's1', status: 'active', projectId: 'p1' }];
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'ready', updatedAt: 0, sprintId: 's1' },
    ];
    expect(detectOrphanSprints(sprints, tasks)).toEqual([]);
  });

  it('returns empty when active sprint has in_progress tasks', () => {
    const sprints: SprintRecord[] = [{ _id: 's1', status: 'active', projectId: 'p1' }];
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'in_progress', updatedAt: 0, sprintId: 's1' },
    ];
    expect(detectOrphanSprints(sprints, tasks)).toEqual([]);
  });

  it('returns sprint ID when active with no remaining work but has completed tasks', () => {
    const sprints: SprintRecord[] = [{ _id: 's1', status: 'active', projectId: 'p1' }];
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'done', updatedAt: 0, sprintId: 's1' },
      { _id: 't2', status: 'done', updatedAt: 0, sprintId: 's1' },
    ];
    expect(detectOrphanSprints(sprints, tasks)).toEqual(['s1']);
  });

  it('returns empty when active sprint has no tasks at all', () => {
    const sprints: SprintRecord[] = [{ _id: 's1', status: 'active', projectId: 'p1' }];
    expect(detectOrphanSprints(sprints, [])).toEqual([]);
  });

  it('returns empty when active sprint has mixed states including remaining work', () => {
    const sprints: SprintRecord[] = [{ _id: 's1', status: 'active', projectId: 'p1' }];
    const tasks: TaskRecord[] = [
      { _id: 't1', status: 'done', updatedAt: 0, sprintId: 's1' },
      { _id: 't2', status: 'ready', updatedAt: 0, sprintId: 's1' },
    ];
    expect(detectOrphanSprints(sprints, tasks)).toEqual([]);
  });
});

describe('reconcileTaskState', () => {
  const now = Date.now();

  it('returns null for ready task with no dependencies', () => {
    const task: TaskRecord = { _id: 't1', status: 'ready', updatedAt: now };
    expect(reconcileTaskState(task, [], [], 30 * 60 * 1000, now)).toBeNull();
  });

  it('returns blocked for ready task with incomplete dependencies', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'ready',
      updatedAt: now,
      dependencies: ['dep1'],
    };
    const allTasks: TaskRecord[] = [
      task,
      { _id: 'dep1', status: 'in_progress', updatedAt: now },
    ];
    expect(reconcileTaskState(task, allTasks, [], 30 * 60 * 1000, now)).toBe('blocked');
  });

  it('returns null for ready task with all dependencies complete', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'ready',
      updatedAt: now,
      dependencies: ['dep1'],
    };
    const allTasks: TaskRecord[] = [
      task,
      { _id: 'dep1', status: 'done', updatedAt: now },
    ];
    expect(reconcileTaskState(task, allTasks, [], 30 * 60 * 1000, now)).toBeNull();
  });

  it('returns ready for blocked task with no dependencies', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'blocked',
      updatedAt: now,
      dependencies: [],
    };
    expect(reconcileTaskState(task, [], [], 30 * 60 * 1000, now)).toBe('ready');
  });

  it('returns ready for blocked task with all dependencies complete', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'blocked',
      updatedAt: now,
      dependencies: ['dep1'],
    };
    const allTasks: TaskRecord[] = [
      task,
      { _id: 'dep1', status: 'done', updatedAt: now },
    ];
    expect(reconcileTaskState(task, allTasks, [], 30 * 60 * 1000, now)).toBe('ready');
  });

  it('returns null for blocked task with incomplete dependencies', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'blocked',
      updatedAt: now,
      dependencies: ['dep1'],
    };
    const allTasks: TaskRecord[] = [
      task,
      { _id: 'dep1', status: 'in_progress', updatedAt: now },
    ];
    expect(reconcileTaskState(task, allTasks, [], 30 * 60 * 1000, now)).toBeNull();
  });

  it('returns ready for stuck in_progress task', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'in_progress',
      updatedAt: now - 45 * 60 * 1000,
    };
    expect(reconcileTaskState(task, [], [], 30 * 60 * 1000, now)).toBe('ready');
  });

  it('returns null for in_progress task with running pipeline run', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'in_progress',
      updatedAt: now - 45 * 60 * 1000,
    };
    const runs: PipelineRunRecord[] = [
      { taskId: 't1', status: 'running', startTime: now - 40 * 60 * 1000 },
    ];
    expect(reconcileTaskState(task, [], runs, 30 * 60 * 1000, now)).toBeNull();
  });

  it('returns null for in_progress task within threshold', () => {
    const task: TaskRecord = {
      _id: 't1',
      status: 'in_progress',
      updatedAt: now - 10 * 60 * 1000,
    };
    expect(reconcileTaskState(task, [], [], 30 * 60 * 1000, now)).toBeNull();
  });

  it('returns null for done task', () => {
    const task: TaskRecord = { _id: 't1', status: 'done', updatedAt: now };
    expect(reconcileTaskState(task, [], [], 30 * 60 * 1000, now)).toBeNull();
  });
});

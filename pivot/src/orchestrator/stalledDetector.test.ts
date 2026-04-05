import { describe, expect, it, beforeEach } from 'bun:test';
import { StalledTaskDetector } from './stalledDetector';
import type { Task } from './types';

describe('StalledTaskDetector', () => {
  let detector: StalledTaskDetector;

  beforeEach(() => {
    detector = new StalledTaskDetector();
  });

  it('uses default timeout of 10 minutes', () => {
    expect(detector.getTimeoutMs()).toBe(600_000);
  });

  it('allows custom timeout configuration', () => {
    const custom = new StalledTaskDetector(300_000);
    expect(custom.getTimeoutMs()).toBe(300_000);
  });

  it('detects stalled tasks beyond timeout', () => {
    const now = Date.now();
    const tasks: Array<Task & { startedAt?: number }> = [
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-1',
        title: 'Stalled Task',
        status: 'in_progress',
        dependencies: [],
        updatedAt: now - 700_000,
        startedAt: now - 700_000,
      },
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-2',
        title: 'Recent Task',
        status: 'in_progress',
        dependencies: [],
        updatedAt: now - 60_000,
        startedAt: now - 60_000,
      },
    ];

    const stalled = detector.detectStalled(tasks, now);
    expect(stalled).toHaveLength(1);
    expect(stalled[0].taskKey).toBe('task-1');
  });

  it('returns empty array when no tasks are stalled', () => {
    const now = Date.now();
    const tasks: Array<Task & { startedAt?: number }> = [
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-1',
        title: 'Recent Task',
        status: 'in_progress',
        dependencies: [],
        updatedAt: now - 60_000,
        startedAt: now - 60_000,
      },
    ];

    const stalled = detector.detectStalled(tasks, now);
    expect(stalled).toHaveLength(0);
  });

  it('ignores tasks not in in_progress state', () => {
    const now = Date.now();
    const tasks: Array<Task & { startedAt?: number }> = [
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-1',
        title: 'Todo Task',
        status: 'todo',
        dependencies: [],
        updatedAt: now - 700_000,
        startedAt: now - 700_000,
      },
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-2',
        title: 'Done Task',
        status: 'done',
        dependencies: [],
        updatedAt: now - 700_000,
        startedAt: now - 700_000,
      },
    ];

    const stalled = detector.detectStalled(tasks, now);
    expect(stalled).toHaveLength(0);
  });

  it('handles tasks without startedAt timestamp', () => {
    const now = Date.now();
    const tasks: Array<Task & { startedAt?: number }> = [
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-1',
        title: 'No Start Time',
        status: 'in_progress',
        dependencies: [],
        updatedAt: now - 700_000,
      },
    ];

    const stalled = detector.detectStalled(tasks, now);
    expect(stalled).toHaveLength(0);
  });

  it('detects multiple stalled tasks', () => {
    const now = Date.now();
    const tasks: Array<Task & { startedAt?: number }> = [
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-1',
        title: 'Stalled 1',
        status: 'in_progress',
        dependencies: [],
        updatedAt: now - 800_000,
        startedAt: now - 800_000,
      },
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-2',
        title: 'Stalled 2',
        status: 'in_progress',
        dependencies: [],
        updatedAt: now - 900_000,
        startedAt: now - 900_000,
      },
      {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-3',
        title: 'Recent',
        status: 'in_progress',
        dependencies: [],
        updatedAt: now - 30_000,
        startedAt: now - 30_000,
      },
    ];

    const stalled = detector.detectStalled(tasks, now);
    expect(stalled).toHaveLength(2);
    expect(stalled.map((t) => t.taskKey)).toContain('task-1');
    expect(stalled.map((t) => t.taskKey)).toContain('task-2');
  });

  it('handles empty task list', () => {
    const stalled = detector.detectStalled([], Date.now());
    expect(stalled).toHaveLength(0);
  });
});

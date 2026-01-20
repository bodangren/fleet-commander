import { describe, it, expect } from 'vitest';
import {
  statusFromMarker,
  markerFromStatus,
  normalizeTask,
  createTaskId,
  TaskActivity,
  TaskMarker,
  TaskStatus,
} from '../shared/board';

describe('board status mapping', () => {
  it('maps task markers to board statuses', () => {
    expect(statusFromMarker('[ ]')).toBe('todo');
    expect(statusFromMarker('[~]')).toBe('in_progress');
    expect(statusFromMarker('[x]')).toBe('done');
  });

  it('maps board statuses to task markers', () => {
    expect(markerFromStatus('todo')).toBe('[ ]');
    expect(markerFromStatus('in_progress')).toBe('[~]');
    expect(markerFromStatus('done')).toBe('[x]');
  });

  it('handles unexpected marker values defensively', () => {
    // Intentional type assertion to exercise the exhaustive branch for coverage.
    const invalidMarker = '??' as unknown as TaskMarker;
    expect(() => statusFromMarker(invalidMarker)).not.toThrow();
  });

  it('handles unexpected status values defensively', () => {
    // Intentional type assertion to exercise the exhaustive branch for coverage.
    const invalidStatus = 'unknown' as unknown as TaskStatus;
    expect(() => markerFromStatus(invalidStatus)).not.toThrow();
  });
});

describe('normalizeTask', () => {
  it('keeps explicit todo when there is no activity', () => {
    const task = normalizeTask({
      title: 'Define data model',
      trackId: 'track-1',
      trackTitle: 'Track One',
      phase: 'Phase 1',
      marker: '[ ]',
    });

    expect(task.id).toBe(createTaskId('track-1', 'Phase 1', 'Define data model'));
    expect(task.status).toBe('todo');
    expect(task.statusSource).toBe('explicit');
    expect(task.needsSync).toBe(false);
    expect(task.activity).toBeNull();
  });

  it('infers in-progress when activity exists for a todo task', () => {
    const activity: TaskActivity = {
      commitHash: 'abc1234',
      timestamp: '2026-01-20T10:00:00Z',
    };

    const task = normalizeTask({
      title: 'Parse tracks',
      trackId: 'track-1',
      trackTitle: 'Track One',
      phase: 'Phase 1',
      marker: '[ ]',
      activity,
    });

    expect(task.status).toBe('in_progress');
    expect(task.statusSource).toBe('inferred');
    expect(task.needsSync).toBe(true);
    expect(task.activity).toEqual(activity);
  });

  it('keeps explicit in-progress when marker is set', () => {
    const activity: TaskActivity = {
      commitHash: 'def5678',
      timestamp: '2026-01-20T12:30:00Z',
    };

    const task = normalizeTask({
      title: 'Parse plans',
      trackId: 'track-2',
      trackTitle: 'Track Two',
      phase: 'Phase 1',
      marker: '[~]',
      activity,
    });

    expect(task.status).toBe('in_progress');
    expect(task.statusSource).toBe('explicit');
    expect(task.needsSync).toBe(false);
    expect(task.activity).toEqual(activity);
  });
});

import { describe, expect, it } from 'bun:test';
import { mapTaskDocToRow, type TaskDocLike } from './taskRows';

function makeDoc(overrides: Partial<TaskDocLike> = {}): TaskDocLike {
  return {
    title: 'Build the thing',
    status: 'backlog',
    updatedAt: 1000,
    ...overrides,
  };
}

describe('mapTaskDocToRow', () => {
  it('maps a fully-populated task doc to the list row shape', () => {
    const row = mapTaskDocToRow(
      makeDoc({
        projectSlug: 'proj',
        trackId: 'track-1',
        taskKey: 'track-1-task-1',
        status: 'in_progress',
        assigneeName: 'alice',
        dependencies: ['track-1-task-0'],
        updatedAt: 42,
      }),
    );
    expect(row).toEqual({
      projectSlug: 'proj',
      trackId: 'track-1',
      taskKey: 'track-1-task-1',
      title: 'Build the thing',
      status: 'in_progress',
      assignee: 'alice',
      dependencies: ['track-1-task-0'],
      updatedAt: 42,
    });
  });

  it('defaults optional fields missing on the doc', () => {
    const row = mapTaskDocToRow(makeDoc());
    expect(row.projectSlug).toBe('');
    expect(row.trackId).toBe('');
    expect(row.taskKey).toBe('');
    expect(row.dependencies).toEqual([]);
    expect(row.assignee).toBeUndefined();
  });

  it('uses the fallback project slug when the doc has none', () => {
    const row = mapTaskDocToRow(makeDoc({ projectSlug: undefined }), 'resolved-proj');
    expect(row.projectSlug).toBe('resolved-proj');
  });

  it('prefers the doc project slug over the fallback', () => {
    const row = mapTaskDocToRow(makeDoc({ projectSlug: 'doc-proj' }), 'resolved-proj');
    expect(row.projectSlug).toBe('doc-proj');
  });
});

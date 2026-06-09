import { describe, expect, it, mock } from 'bun:test';
import { ConvexHttpClient } from 'convex/browser';
import { scoreTask, getBestTask } from './evaluator';
import { resolvePostExecutionStatus } from './stages/resolveTransition';
import { updateTaskStatus } from './stages/updateTaskStatus';
import type { Task } from './types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    projectSlug: 'proj',
    trackId: 'track-1',
    taskKey: 'track-1-task-1',
    title: 'Do the thing',
    status: 'backlog',
    dependencies: [],
    updatedAt: 1,
    ...overrides,
  };
}

describe('task status vocabulary is canonical (Convex validators)', () => {
  it('scoreTask treats a backlog task as eligible (not the legacy todo)', () => {
    expect(scoreTask(makeTask({ status: 'backlog' }))).toBeGreaterThan(0);
  });

  it('getBestTask selects an imported backlog task', () => {
    const best = getBestTask([makeTask({ status: 'backlog' })], new Map());
    expect(best).not.toBeNull();
    expect(best!.task.taskKey).toBe('track-1-task-1');
  });

  it('resolvePostExecutionStatus returns review (not legacy for_review) when review is required', () => {
    const result = resolvePostExecutionStatus({ succeeded: true, reviewRequired: true } as never);
    expect(result.nextStatus).toBe('review');
  });

  it('updateTaskStatus writes a Convex-valid status verbatim (no lying cast)', async () => {
    const mutation = mock(async () => null);
    const client = { mutation } as unknown as ConvexHttpClient;
    await updateTaskStatus(client, makeTask(), 'review');
    const args = (mutation.mock.calls[0] as unknown[])[1] as { status: string };
    expect(args.status).toBe('review');
  });
});

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { markReview } from './markReview';
import type { Task, IssueHooks, ReviewResult } from '../types';

function makeTask(): Task {
  return {
    projectSlug: 'p1',
    trackId: 'track-a',
    taskKey: 't1',
    title: 'Test task',
    status: 'done',
    dependencies: [],
    updatedAt: 0,
  };
}

describe('markReview stage', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
  };
  const appendLog = mock(async () => {});

  beforeEach(() => {
    mockClient.mutation.mockReset();
    appendLog.mockReset();
  });

  it('returns null when no review hook is provided', async () => {
    const result = await markReview(
      mockClient as any,
      { projectSlug: 'p1', runId: 'r1', task: makeTask(), output: 'done' },
      appendLog,
    );
    expect(result).toBeNull();
    expect(appendLog).not.toHaveBeenCalled();
  });

  it('invokes review hook and logs the result', async () => {
    const reviewHook = mock(async () => ({
      status: 'passed' as const,
      summary: 'ok',
      depth: 'full',
    }));
    const hooks: IssueHooks = { createBlocker: mock(async () => {}), createDelegations: mock(async () => 0), runReview: reviewHook };
    const result = await markReview(
      mockClient as any,
      { projectSlug: 'p1', runId: 'r1', task: makeTask(), output: 'done', hooks },
      appendLog,
    );
    expect(reviewHook).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(appendLog).toHaveBeenCalledTimes(1);
  });

  it('returns null and swallows errors from review hook', async () => {
    const reviewHook = mock(async () => {
      throw new Error('review service down');
    });
    const hooks: IssueHooks = { createBlocker: mock(async () => {}), createDelegations: mock(async () => 0), runReview: reviewHook };
    const result = await markReview(
      mockClient as any,
      { projectSlug: 'p1', runId: 'r1', task: makeTask(), output: 'done', hooks },
      appendLog,
    );
    expect(result).toBeNull();
    expect(appendLog).not.toHaveBeenCalled();
  });
});

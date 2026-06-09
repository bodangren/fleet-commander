import { describe, expect, it, mock } from 'bun:test';
import { ConvexHttpClient } from 'convex/browser';
import { loadTasks } from './candidates';

describe('loadTasks', () => {
  it('surfaces the rows returned by listTasksByProject (no longer a blind stub)', async () => {
    const rows = [
      {
        projectSlug: 'proj',
        trackId: 'track-1',
        taskKey: 'track-1-task-1',
        title: 'Do the work',
        status: 'backlog',
        dependencies: [],
        updatedAt: 1,
      },
    ];
    const client = {
      query: mock(async () => rows),
    } as unknown as ConvexHttpClient;

    const tasks = await loadTasks(client, 'proj');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskKey).toBe('track-1-task-1');
  });
});

import { describe, expect, it, mock } from 'bun:test';
import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../../convex/_generated/dataModel';
import { loadActiveProjects, loadProject, loadTasks } from './candidates';

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

describe('project identity loading', () => {
  it('keeps projects whose Convex rows have no phantom status field', async () => {
    const rows = [
      {
        _id: 'jproject1234567890123456789012' as Id<'projects'>,
        name: 'Reading Advantage',
        slug: 'reading-advantage-llm-benchmark',
        description: 'Imported benchmark',
        path: '/tmp/reading-advantage',
        createdAt: 1,
        updatedAt: 2,
      },
    ];
    const client = {
      query: mock(async () => rows),
    } as unknown as ConvexHttpClient;

    const projects = await loadActiveProjects(client);

    expect(projects).toEqual(rows);
    expect(projects[0].path).toBe('/tmp/reading-advantage');
  });

  it('resolves a user slug through the slug query without passing it as an ID', async () => {
    const project = {
      _id: 'jproject1234567890123456789012' as Id<'projects'>,
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      path: '/tmp/reading-advantage',
      createdAt: 1,
      updatedAt: 2,
    };
    const query = mock(async (_ref: unknown, args: Record<string, unknown>) => {
      if (args.slug === project.slug) return project;
      throw new Error('slug must be resolved by the typed slug query');
    });
    const client = { query } as unknown as ConvexHttpClient;

    const resolved = await loadProject(client, project.slug);

    expect(resolved).toEqual(project);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[1]).toEqual({ slug: project.slug });
  });
});

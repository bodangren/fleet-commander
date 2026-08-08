import { describe, expect, it, mock } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../../../convex/_generated/dataModel';
import { loadAndFilterTasks } from './loadAndFilterTasks';

describe('loadAndFilterTasks project identity', () => {
  it('uses the resolved canonical slug for catalog reads and the stored path for execution', async () => {
    const project = {
      _id: 'jproject1234567890123456789012' as Id<'projects'>,
      name: 'Reading Advantage',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported benchmark',
      path: '/tmp/reading-advantage',
      createdAt: 1,
      updatedAt: 2,
    };
    const projectSlugArgs: string[] = [];
    const client = {
      query: mock(async (_ref: unknown, args: Record<string, unknown>) => {
        if (args.slug === project.slug) return project;
        if (typeof args.projectSlug === 'string') {
          projectSlugArgs.push(args.projectSlug);
          return [];
        }
        return null;
      }),
      mutation: mock(async () => null),
    } as unknown as ConvexHttpClient;

    const result = await loadAndFilterTasks(client, project.slug);

    expect(result.projectSlug).toBe(project.slug);
    expect(result.rootPath).toBe(project.path);
    expect(projectSlugArgs).toEqual([project.slug, project.slug]);
  });
});

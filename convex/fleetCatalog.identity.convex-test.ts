/**
 * Runtime contracts for Fleet Catalog agent evidence and project identity.
 *
 * Counter maintenance is covered separately in
 * `fleetCatalog.counters.convex-test.ts`; this suite focuses on the catalog
 * rows that are normalized from legacy project names to canonical slugs.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

/**
 * Creates a schema-valid project whose display name differs from its slug.
 *
 * @param t - Isolated Convex runtime backend.
 * @returns The persisted project ID.
 */
async function seedLegacyNamedProject(t: ConvexTest): Promise<Id<'projects'>> {
  return t.run((ctx) =>
    ctx.db.insert('projects', {
      name: 'Reading Advantage Benchmark',
      slug: 'reading-advantage-llm-benchmark',
      description: 'Imported catalog project',
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
  );
}

describe('fleet catalog identity runtime access contract', () => {
  it('rejects agent and canonical project catalog reads without identity', async () => {
    const t = createUnauthenticatedConvexTest();
    await seedLegacyNamedProject(t);

    await expect(t.query(api.fleetCatalog.listAgents, {})).rejects.toThrow(
      'Authentication required',
    );
    await expect(
      t.query(api.fleetCatalog.listTasksByProject, {
        projectSlug: 'reading-advantage-llm-benchmark',
      }),
    ).rejects.toThrow('Authentication required');
  });
});

describe('fleet catalog agent evidence runtime contract', () => {
  it('persists and exposes status and workload bounds through registered catalog APIs', async () => {
    const t = createConvexTest();
    await expect(
      t.mutation(api.fleetCatalog.upsertAgent, {
        name: 'luna',
        displayName: 'Luna coder',
        mode: 'agent',
        model: 'openai/gpt-5.6-luna',
        temperature: 0.1,
        prompt: '',
        toolsJson: '{}',
        source: 'manual',
      }),
    ).resolves.toBeNull();

    await expect(t.query(api.fleetCatalog.listAgents, {})).resolves.toEqual([
      expect.objectContaining({
        name: 'luna',
        model: 'openai/gpt-5.6-luna',
        status: 'active',
        workload: 0,
        maxWorkload: 5,
      }),
    ]);
    await expect(
      t.query(api.fleetCatalog.getAgentByName, { name: 'luna' }),
    ).resolves.toMatchObject({
      status: 'active',
      workload: 0,
      maxWorkload: 5,
    });
  });
});

describe('fleet catalog project identity runtime contracts', () => {
  it('normalizes legacy task rows and reads both legacy and canonical track rows', async () => {
    const t = createConvexTest();
    const projectId = await seedLegacyNamedProject(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('tasks', {
        projectId,
        projectSlug: 'Reading Advantage Benchmark',
        trackId: 'factory-track',
        taskKey: 'factory-task-1',
        title: 'Legacy factory task',
        description: 'Imported from legacy catalog',
        storyPoints: 1,
        status: 'ready',
        priority: 'medium',
        costEstimate: 0,
        dependencies: [],
        createdAt: 1_000,
        updatedAt: 1_000,
      });
      const track = {
        title: 'Factory path',
        status: 'active' as const,
        specMarkdown: '# Factory',
        planMarkdown: '# Plan',
        version: 1,
        updatedAt: 1_000,
      };
      await ctx.db.insert('tracks', {
        ...track,
        projectSlug: 'Reading Advantage Benchmark',
        trackId: 'legacy-track',
      });
      await ctx.db.insert('tracks', {
        ...track,
        projectSlug: 'reading-advantage-llm-benchmark',
        trackId: 'canonical-track',
      });
    });

    await expect(
      t.query(api.fleetCatalog.listTasksByProject, {
        projectSlug: 'reading-advantage-llm-benchmark',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        taskKey: 'factory-task-1',
        projectSlug: 'reading-advantage-llm-benchmark',
      }),
    ]);
    await expect(
      t.query(api.fleetCatalog.listTracksByProject, {
        projectSlug: 'reading-advantage-llm-benchmark',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        trackId: 'legacy-track',
        projectSlug: 'reading-advantage-llm-benchmark',
      }),
      expect.objectContaining({
        trackId: 'canonical-track',
        projectSlug: 'reading-advantage-llm-benchmark',
      }),
    ]);
  });

  it('upserts canonical imported tasks without duplicating or reassigning their project', async () => {
    const t = createConvexTest();
    const projectId = await seedLegacyNamedProject(t);
    const taskId = await t.run((ctx) =>
      ctx.db.insert('tasks', {
        projectId,
        projectSlug: 'reading-advantage-llm-benchmark',
        trackId: 'factory-track',
        taskKey: 'factory-task-1',
        title: 'Factory task',
        description: 'Original imported task',
        storyPoints: 1,
        status: 'ready',
        priority: 'medium',
        costEstimate: 0,
        dependencies: [],
        createdAt: 1_000,
        updatedAt: 1_000,
      }),
    );

    await expect(
      t.mutation(api.fleetCatalog.upsertTask, {
        projectSlug: 'reading-advantage-llm-benchmark',
        trackId: 'factory-track',
        taskKey: 'factory-task-1',
        title: 'Factory task',
        status: 'in_progress',
        dependencies: [],
      }),
    ).resolves.toBeNull();

    const persisted = await t.run(async (ctx) => ({
      projects: await ctx.db.query('projects').collect(),
      task: await ctx.db.get(taskId),
      matchedByKey: await ctx.db
        .query('tasks')
        .withIndex('by_task_key', (q) => q.eq('taskKey', 'factory-task-1'))
        .collect(),
    }));
    expect(persisted.projects).toHaveLength(1);
    expect(persisted.task).toMatchObject({
      projectId,
      status: 'in_progress',
      projectSlug: 'reading-advantage-llm-benchmark',
    });
    expect(persisted.matchedByKey).toHaveLength(1);
  });
});

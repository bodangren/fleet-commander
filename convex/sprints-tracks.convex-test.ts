/**
 * Registered-runtime contracts for sprint and track APIs.
 *
 * These scenarios use the production schema, indexes, generated IDs, and
 * registered Convex APIs. Database writes are limited to schema-valid setup;
 * behavior is exercised through the public function references.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';
import { seedProject, seedSprint, seedTask } from '../test/convexDomainSeeds';

describe('sprint registered runtime contracts', () => {
  it('requires an identity across every registered sprint surface', async () => {
    const t = createUnauthenticatedConvexTest();
    const projectId = await seedProject(t, 'unauth-sprint-project');
    const sprintId = await seedSprint(t, projectId, 'planned', 'Unauth sprint');

    const requests: Array<() => Promise<unknown>> = [
      () => t.query(api.sprints.listSprintsHandler, { projectId }),
      () => t.query(api.sprints.getSprintHandler, { id: sprintId }),
      () => t.mutation(api.sprints.createSprintHandler, {
        projectId,
        name: 'Unauth create sprint',
        budget: 100,
      }),
      () => t.mutation(api.sprints.updateSprintStatusHandler, {
        id: sprintId,
        status: 'active',
      }),
      () => t.mutation(api.sprints.closeSprintHandler, { id: sprintId }),
      () => t.query(api.sprints.getSprintBudgetHandler, { id: sprintId }),
    ];

    for (const request of requests) {
      await expect(request()).rejects.toThrow('Authentication required');
    }
  });

  it('covers planned-to-active-to-closed lifecycle and budget aggregation', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'sprint-runtime');
    const sprintId = await t.mutation(api.sprints.createSprintHandler, {
      projectId,
      name: 'Lifecycle sprint',
      budget: 100,
    });
    expect(
      await t.query(api.sprints.listSprintsHandler, { projectId }),
    ).toEqual([expect.objectContaining({ _id: sprintId, status: 'planned' })]);

    await t.mutation(api.sprints.updateSprintStatusHandler, {
      id: sprintId,
      status: 'active',
    });
    await seedTask(t, {
      projectId,
      title: 'Completed sprint task',
      sprintId,
      status: 'done',
      storyPoints: 3,
      actualCost: 20,
      costEstimate: 25,
    });
    await seedTask(t, {
      projectId,
      title: 'In-progress sprint task',
      sprintId,
      status: 'in_progress',
      storyPoints: 5,
      actualCost: 10,
      costEstimate: 35,
    });

    await expect(
      t.query(api.sprints.getSprintBudgetHandler, { id: sprintId }),
    ).resolves.toEqual({ totalEstimate: 60, budget: 100, remaining: 40 });
    await t.mutation(api.sprints.closeSprintHandler, { id: sprintId });
    await expect(
      t.query(api.sprints.getSprintHandler, { id: sprintId }),
    ).resolves.toMatchObject({
      _id: sprintId,
      status: 'closed',
      actualCost: 30,
      pointsDelivered: 3,
      taskCount: 2,
      completedCount: 1,
    });
  });
});

describe('track registered runtime contracts', () => {
  it('creates, reads, versions, and clears track snapshots with canonical statuses', async () => {
    const t = createConvexTest();
    const created = await t.mutation(api.tracks.createTrack, {
      projectSlug: 'track-runtime',
      trackId: 'runtime-track-20260809',
      title: 'Runtime Track',
      goal: 'Prove registered track lifecycle behavior.',
    });
    expect(created).toMatchObject({
      projectSlug: 'track-runtime',
      trackId: 'runtime-track-20260809',
      title: 'Runtime Track',
      status: 'new',
      version: 1,
    });
    expect(created.specMarkdown).toContain('Prove registered track lifecycle behavior.');

    await expect(
      t.query(api.tracks.getTrackSnapshot, {
        projectSlug: 'track-runtime',
        trackId: 'runtime-track-20260809',
      }),
    ).resolves.toMatchObject({ status: 'new', version: 1 });
    await expect(
      t.query(api.tracks.getTrackContext, {
        projectSlug: 'track-runtime',
        trackId: 'runtime-track-20260809',
      }),
    ).resolves.toMatchObject({
      title: 'Runtime Track',
      specMarkdown: expect.stringContaining('# Runtime Track'),
      planMarkdown: expect.stringContaining('# Implementation Plan'),
    });
    await expect(
      t.mutation(api.tracks.createTrack, {
        projectSlug: 'track-runtime',
        trackId: 'runtime-track-20260809',
        title: 'Duplicate Track',
        goal: 'Must not replace the original snapshot.',
      }),
    ).rejects.toThrow();

    await expect(
      t.mutation(api.tracks.upsertTrackSnapshot, {
        projectSlug: 'track-runtime',
        trackId: 'runtime-track-20260809',
        title: 'Active Runtime Track',
        status: 'active',
        expectedVersion: 1,
        specMarkdown: '# Active Runtime Track',
        planMarkdown: '# Implementation Plan\n\n- [ ] Runtime coverage',
      }),
    ).resolves.toMatchObject({ status: 'active', version: 2 });
    await expect(
      t.mutation(api.tracks.upsertTrackSnapshot, {
        projectSlug: 'track-runtime',
        trackId: 'runtime-track-20260809',
        title: 'Stale Runtime Track',
        status: 'blocked',
        expectedVersion: 1,
        specMarkdown: '# Stale',
        planMarkdown: '# Stale',
      }),
    ).rejects.toThrow();

    await expect(
      t.mutation(api.tracks.clearTracksForProject, { projectSlug: 'track-runtime' }),
    ).resolves.toBe(1);
    await expect(
      t.query(api.tracks.getTrackContext, {
        projectSlug: 'track-runtime',
        trackId: 'runtime-track-20260809',
      }),
    ).resolves.toBeNull();
  });

  it('rejects unauthenticated registered track access before database writes', async () => {
    const t = createUnauthenticatedConvexTest();
    const requests: Array<() => Promise<unknown>> = [
      () => t.query(api.tracks.getTrackSnapshot, {
        projectSlug: 'track-runtime',
        trackId: 'missing-track',
      }),
      () => t.query(api.tracks.getTrackContext, {
        projectSlug: 'track-runtime',
        trackId: 'missing-track',
      }),
      () => t.mutation(api.tracks.upsertTrackSnapshot, {
        projectSlug: 'track-runtime',
        trackId: 'unauthenticated-track',
        title: 'Unauthenticated Track',
        status: 'new',
        specMarkdown: '# Unauthenticated',
        planMarkdown: '# Unauthenticated',
      }),
      () => t.mutation(api.tracks.createTrack, {
        projectSlug: 'track-runtime',
        trackId: 'unauthenticated-track',
        title: 'Unauthenticated Track',
        goal: 'Must be rejected.',
      }),
      () => t.mutation(api.tracks.clearTracksForProject, {
        projectSlug: 'track-runtime',
      }),
    ];

    for (const request of requests) {
      await expect(request()).rejects.toThrow('Authentication required');
    }
    await expect(
      t.run((ctx) => ctx.db.query('tracks').collect()),
    ).resolves.toEqual([]);
  });
});

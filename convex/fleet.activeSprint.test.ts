import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fleet from './fleet';
import { createMockCtx } from './__fixtures__/foundation';

const previousNodeEnv = process.env.NODE_ENV;
const previousAllowAnon = process.env.FLEET_ALLOW_ANON_BOOTSTRAP;

const project = {
  name: 'Reading Advantage',
  slug: 'reading-advantage-llm-benchmark',
  description: 'Imported benchmark project',
  createdAt: 100,
  updatedAt: 100,
};

const sprint = {
  name: 'Acceptance sprint',
  status: 'active' as const,
  budget: 100,
  actualCost: 0,
  pointsDelivered: 0,
  taskCount: 2,
  completedCount: 0,
  createdAt: 200,
  startedAt: 250,
};

describe('fleet sprint read queries', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.FLEET_ALLOW_ANON_BOOTSTRAP = '1';
  });

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousAllowAnon === undefined) delete process.env.FLEET_ALLOW_ANON_BOOTSTRAP;
    else process.env.FLEET_ALLOW_ANON_BOOTSTRAP = previousAllowAnon;
  });

  it('returns the active sprint with exact task keys and derived timestamps', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', project);
    const sprintId = await ctx.db.insert('sprints', { ...sprint, projectId });
    await ctx.db.insert('sprints', {
      ...sprint,
      projectId,
      name: 'Planned later',
      status: 'planned',
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      projectSlug: project.slug,
      trackId: 'track-b',
      taskKey: 'TASK-B',
      title: 'B',
      description: 'B',
      storyPoints: 1,
      status: 'ready',
      priority: 'medium',
      costEstimate: 1,
      createdAt: 300,
      updatedAt: 400,
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      projectSlug: project.slug,
      trackId: 'track-a',
      taskKey: 'TASK-A',
      title: 'A',
      description: 'A',
      storyPoints: 1,
      status: 'ready',
      priority: 'medium',
      costEstimate: 1,
      createdAt: 300,
      updatedAt: 350,
    });
    await ctx.db.insert('tasks', {
      projectId,
      sprintId,
      title: 'No catalog key',
      description: 'Ignored',
      storyPoints: 1,
      status: 'ready',
      priority: 'medium',
      costEstimate: 1,
      createdAt: 300,
      updatedAt: 999,
    });

    const result = await fleet.getActiveSprintForProject(ctx, { projectSlug: project.slug });

    expect(result).toMatchObject({
      _id: sprintId,
      projectSlug: project.slug,
      name: sprint.name,
      status: 'active',
      startDate: 250,
      endDate: 250,
      taskKeys: ['TASK-A', 'TASK-B'],
      updatedAt: 999,
    });
  });

  it('returns null for a missing project or without an active sprint', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', project);
    await ctx.db.insert('sprints', { ...sprint, projectId, status: 'planned' });

    await expect(
      fleet.getActiveSprintForProject(ctx, { projectSlug: 'missing-project' }),
    ).resolves.toBeNull();
    await expect(
      fleet.getActiveSprintForProject(ctx, { projectSlug: project.slug }),
    ).resolves.toBeNull();
  });

  it('returns only requested project tasks in the requested key order', async () => {
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', project);
    const otherProjectId = await ctx.db.insert('projects', {
      ...project,
      name: 'Other project',
      slug: 'other-project',
    });
    await ctx.db.insert('tasks', {
      projectId,
      projectSlug: project.slug,
      trackId: 'track-a',
      taskKey: 'TASK-A',
      title: 'A',
      description: 'A',
      storyPoints: 1,
      status: 'done',
      priority: 'medium',
      costEstimate: 1,
      assigneeName: 'luna',
      createdAt: 100,
      updatedAt: 500,
    });
    await ctx.db.insert('tasks', {
      projectId,
      projectSlug: project.slug,
      trackId: undefined,
      taskKey: 'TASK-B',
      title: 'B',
      description: 'B',
      storyPoints: 1,
      status: 'ready',
      priority: 'medium',
      costEstimate: 1,
      createdAt: 100,
      updatedAt: 600,
    });
    await ctx.db.insert('tasks', {
      projectId: otherProjectId,
      projectSlug: 'other-project',
      trackId: 'other-track',
      taskKey: 'TASK-A',
      title: 'Wrong project',
      description: 'Wrong project',
      storyPoints: 1,
      status: 'ready',
      priority: 'medium',
      costEstimate: 1,
      createdAt: 100,
      updatedAt: 700,
    });

    const result = await fleet.getTasksForSprint(ctx, {
      projectSlug: project.slug,
      taskKeys: ['TASK-B', 'TASK-A', 'UNKNOWN'],
    });

    expect(result).toEqual([
      {
        projectSlug: project.slug,
        trackId: '',
        taskKey: 'TASK-B',
        title: 'B',
        status: 'ready',
        assignee: undefined,
        updatedAt: 600,
      },
      {
        projectSlug: project.slug,
        trackId: 'track-a',
        taskKey: 'TASK-A',
        title: 'A',
        status: 'done',
        assignee: 'luna',
        updatedAt: 500,
      },
    ]);
  });
});


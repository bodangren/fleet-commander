import { describe, expect, it } from 'bun:test';
import {
  listSprintHistoryHandler,
  getSprintHistoryHandler,
} from './sprints';
import {
  createMockCtx,
  sampleProject,
  sampleSprint,
  sampleTask,
} from '../__fixtures__/foundation';
import { sampleSprintHistory, createHistoryCtx } from '../__fixtures__/history';

describe('listSprintHistoryHandler', () => {
  it('returns sprint history for a project', async () => {
    expect(listSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      name: 'Sprint Alpha',
      pointsDelivered: 25,
      taskCount: 10,
      completedCount: 8,
    });
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId: 'sprint-1',
      storyPoints: 5,
      status: 'done',
      costEstimate: 10,
    });
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId: 'sprint-1',
      storyPoints: 3,
      status: 'done',
      costEstimate: 6,
    });

    const result = await listSprintHistoryHandler(ctx, { projectId });

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Sprint Alpha');
    expect(result[0].velocity).toBe(2.5); // 25 / 10
    expect(result[0].pointsEstimated).toBe(16); // 10 + 6
  });

  it('returns empty array when no sprints exist for project', async () => {
    expect(listSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const result = await listSprintHistoryHandler(ctx, { projectId });
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    expect(listSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', { ...sampleSprintHistory, projectId });
    const result = await listSprintHistoryHandler(ctx, { projectId });
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });

  it('handles sprint with zero tasks (velocity = 0)', async () => {
    expect(listSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      taskCount: 0,
      pointsDelivered: 0,
    });
    const result = await listSprintHistoryHandler(ctx, { projectId });
    expect(result[0].velocity).toBe(0);
  });

  it('paginates results', async () => {
    expect(listSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    for (let i = 0; i < 5; i++) {
      await ctx.db.insert('sprints', {
        ...sampleSprintHistory,
        projectId,
        name: `Sprint ${i}`,
      });
    }
    const result = await listSprintHistoryHandler(ctx, { projectId, limit: 2 });
    expect(result.length).toBe(2);
  });

  it('rejects invalid projectId', async () => {
    expect(listSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    await expect(
      listSprintHistoryHandler(ctx, { projectId: 'invalid-id' })
    ).rejects.toThrow();
  });
});

describe('getSprintHistoryHandler', () => {
  it('returns sprint history by id', async () => {
    expect(getSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const id = await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
    });
    const result = await getSprintHistoryHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe(sampleSprintHistory.name);
  });

  it('returns null when sprint not found', async () => {
    expect(getSprintHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await getSprintHistoryHandler(ctx, { id: 'sprint-999' });
    expect(result).toBeNull();
  });
});

describe('createHistoryCtx performance seed', () => {
  it('seeds 10+ sprints and 50+ tasks', async () => {
    const ctx = await createHistoryCtx();
    const sprints = await ctx.db.query('sprints').order('desc').collect();
    const tasks = await ctx.db.query('tasks').order('desc').collect();
    expect(sprints.length).toBeGreaterThanOrEqual(10);
    expect(tasks.length).toBeGreaterThanOrEqual(50);
  });
});

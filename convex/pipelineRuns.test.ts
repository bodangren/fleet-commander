import { describe, expect, it } from 'bun:test';
import {
  listPipelineRunsHandler,
  getPipelineRunHandler,
  createPipelineRunHandler,
  updatePipelineRunStatusHandler,
  getPipelineRunsByTaskHandler,
  getPipelineRunCostByTaskHandler,
} from './pipelineRuns';
import {
  createMockCtx,
  sampleProject,
  sampleTask,
} from './__fixtures__/foundation';

describe('listPipelineRunsHandler', () => {
  it('returns all pipeline runs ordered by createdAt desc', async () => {
    expect(listPipelineRunsHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'dispatch',
      status: 'running',
      startTime: 1000,
      createdAt: 1000,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'architect',
      status: 'completed',
      startTime: 2000,
      createdAt: 2000,
    });

    const result = await listPipelineRunsHandler(ctx);

    expect(result.length).toBe(2);
    expect(result[0].stage).toBe('architect');
    expect(result[1].stage).toBe('dispatch');
  });

  it('returns empty array when no pipeline runs exist', async () => {
    expect(listPipelineRunsHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await listPipelineRunsHandler(ctx);
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    expect(listPipelineRunsHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'dispatch',
      status: 'running',
      startTime: 1000,
      createdAt: 1000,
    });

    const result = await listPipelineRunsHandler(ctx);
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });
});

describe('getPipelineRunHandler', () => {
  it('returns pipeline run by id', async () => {
    expect(getPipelineRunHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });
    const id = await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'dispatch',
      status: 'running',
      startTime: 1000,
      createdAt: 1000,
    });

    const result = await getPipelineRunHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.stage).toBe('dispatch');
    expect(result!.status).toBe('running');
  });

  it('returns null when pipeline run not found', async () => {
    expect(getPipelineRunHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await getPipelineRunHandler(ctx, { id: 'pipelineRun-999' });
    expect(result).toBeNull();
  });

  it('strips _creationTime from result', async () => {
    expect(getPipelineRunHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });
    const id = await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'dispatch',
      status: 'running',
      startTime: 1000,
      createdAt: 1000,
    });

    const result = await getPipelineRunHandler(ctx, { id });
    expect(result!._creationTime).toBeUndefined();
  });
});

describe('createPipelineRunHandler', () => {
  it('creates a pipeline run with running status and timestamps', async () => {
    expect(createPipelineRunHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    const id = await createPipelineRunHandler(ctx, {
      taskId,
      stage: 'dispatch',
    });

    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.taskId).toBe(taskId);
    expect(created.stage).toBe('dispatch');
    expect(created.status).toBe('running');
    expect(created.startTime).toBeGreaterThan(0);
    expect(created.createdAt).toBeGreaterThan(0);
  });

  it('optionally assigns an agentId', async () => {
    expect(createPipelineRunHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });
    const agentId = await ctx.db.insert('agents', {
      name: 'test-agent',
      role: 'executor',
      skills: [],
      model: 'test',
      costPerPoint: 1,
      reliability: 1,
      status: 'active',
      workload: 0,
      maxWorkload: 5,
      createdAt: 1000,
    });

    const id = await createPipelineRunHandler(ctx, {
      taskId,
      stage: 'executor',
      agentId,
    });

    const created = await ctx.db.get(id);
    expect(created.agentId).toBe(agentId);
  });

  it('rejects duplicate running status per task', async () => {
    expect(createPipelineRunHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    await createPipelineRunHandler(ctx, { taskId, stage: 'dispatch' });

    await expect(
      createPipelineRunHandler(ctx, { taskId, stage: 'architect' })
    ).rejects.toThrow('Task already has a running pipeline run');
  });
});

describe('updatePipelineRunStatusHandler', () => {
  it('transitions running to completed and sets endTime and cost', async () => {
    expect(updatePipelineRunStatusHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });
    const id = await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'executor',
      status: 'running',
      startTime: 1000,
      createdAt: 1000,
    });

    await updatePipelineRunStatusHandler(ctx, {
      id,
      status: 'completed',
      cost: 42.5,
    });

    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('completed');
    expect(updated.endTime).toBeGreaterThan(0);
    expect(updated.cost).toBe(42.5);
  });

  it('transitions running to failed and sets endTime', async () => {
    expect(updatePipelineRunStatusHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });
    const id = await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'reviewer',
      status: 'running',
      startTime: 1000,
      createdAt: 1000,
    });

    await updatePipelineRunStatusHandler(ctx, { id, status: 'failed' });

    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('failed');
    expect(updated.endTime).toBeGreaterThan(0);
  });
});

describe('getPipelineRunsByTaskHandler', () => {
  it('returns runs ordered by startTime asc', async () => {
    expect(getPipelineRunsByTaskHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'merger',
      status: 'completed',
      startTime: 3000,
      createdAt: 3000,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'dispatch',
      status: 'completed',
      startTime: 1000,
      createdAt: 1000,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'architect',
      status: 'completed',
      startTime: 2000,
      createdAt: 2000,
    });

    const result = await getPipelineRunsByTaskHandler(ctx, { taskId });

    expect(result.length).toBe(3);
    expect(result[0].stage).toBe('dispatch');
    expect(result[1].stage).toBe('architect');
    expect(result[2].stage).toBe('merger');
  });

  it('returns empty array when no runs for task', async () => {
    expect(getPipelineRunsByTaskHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    const result = await getPipelineRunsByTaskHandler(ctx, { taskId });
    expect(result).toEqual([]);
  });
});

describe('getPipelineRunCostByTaskHandler', () => {
  it('accumulates cost per stage and returns total', async () => {
    expect(getPipelineRunCostByTaskHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'dispatch',
      status: 'completed',
      startTime: 1000,
      createdAt: 1000,
      cost: 10,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'architect',
      status: 'completed',
      startTime: 2000,
      createdAt: 2000,
      cost: 25,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'executor',
      status: 'completed',
      startTime: 3000,
      createdAt: 3000,
      cost: 50,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId,
      stage: 'executor',
      status: 'completed',
      startTime: 4000,
      createdAt: 4000,
      cost: 30,
    });

    const result = await getPipelineRunCostByTaskHandler(ctx, { taskId });

    expect(result.totalCost).toBe(115);
    expect(result.stageCosts.dispatch).toBe(10);
    expect(result.stageCosts.architect).toBe(25);
    expect(result.stageCosts.executor).toBe(80);
  });

  it('returns zero costs when no runs exist', async () => {
    expect(getPipelineRunCostByTaskHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });

    const result = await getPipelineRunCostByTaskHandler(ctx, { taskId });
    expect(result.totalCost).toBe(0);
    expect(result.stageCosts).toEqual({});
  });
});

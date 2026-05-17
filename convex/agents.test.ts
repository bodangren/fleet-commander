import { describe, expect, it } from 'bun:test';
import {
  listAgentsHandler,
  getAgentHandler,
  createAgentHandler,
  updateAgentHandler,
  updateAgentStatusHandler,
  seedAgentsHandler,
  calculateCostPerPointHandler,
} from './agents';
import { createMockCtx, sampleAgents } from './__fixtures__/foundation';

describe('listAgentsHandler', () => {
  it('returns all agents ordered by createdAt desc', async () => {
    const ctx = createMockCtx();
    for (const agent of sampleAgents) {
      await ctx.db.insert('agents', agent);
    }

    const result = await listAgentsHandler(ctx);

    expect(result.length).toBe(4);
    expect(result[0].name).toBe('frank');
    expect(result[1].name).toBe('carol');
    expect(result[2].name).toBe('bob');
    expect(result[3].name).toBe('alice');
  });

  it('returns empty array when no agents exist', async () => {
    const ctx = createMockCtx();
    const result = await listAgentsHandler(ctx);
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('agents', sampleAgents[0]);
    const result = await listAgentsHandler(ctx);
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });
});

describe('getAgentHandler', () => {
  it('returns agent by id', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('agents', sampleAgents[0]);
    const result = await getAgentHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe('alice');
    expect(result!.role).toBe('architect');
  });

  it('returns null when agent not found', async () => {
    const ctx = createMockCtx();
    const result = await getAgentHandler(ctx, { id: 'agent-999' });
    expect(result).toBeNull();
  });

  it('strips _creationTime from result', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('agents', sampleAgents[0]);
    const result = await getAgentHandler(ctx, { id });
    expect(result!._creationTime).toBeUndefined();
  });
});

describe('createAgentHandler', () => {
  it('inserts a new agent with provided fields and defaults', async () => {
    const ctx = createMockCtx();
    const id = await createAgentHandler(ctx, {
      name: 'grace',
      role: 'merger',
      skills: ['git', 'ci-cd'],
      model: 'claude-sonnet',
      costPerPoint: 3.0,
      reliability: 0.9,
      maxWorkload: 4,
    });

    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.name).toBe('grace');
    expect(created.role).toBe('merger');
    expect(created.skills).toEqual(['git', 'ci-cd']);
    expect(created.model).toBe('claude-sonnet');
    expect(created.costPerPoint).toBe(3.0);
    expect(created.reliability).toBe(0.9);
    expect(created.status).toBe('active');
    expect(created.workload).toBe(0);
    expect(created.maxWorkload).toBe(4);
    expect(created.createdAt).toBeGreaterThan(0);
  });
});

describe('updateAgentHandler', () => {
  it('updates agent fields without touching others', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('agents', sampleAgents[0]);
    await updateAgentHandler(ctx, {
      id,
      costPerPoint: 5.0,
      maxWorkload: 6,
    });

    const updated = await ctx.db.get(id);
    expect(updated.costPerPoint).toBe(5.0);
    expect(updated.maxWorkload).toBe(6);
    expect(updated.name).toBe('alice');
    expect(updated.role).toBe('architect');
  });
});

describe('updateAgentStatusHandler', () => {
  it('transitions active to idle', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('agents', {
      ...sampleAgents[0],
      status: 'active',
    });
    await updateAgentStatusHandler(ctx, { id, status: 'idle' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('idle');
  });

  it('transitions idle to blocked', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('agents', {
      ...sampleAgents[0],
      status: 'idle',
    });
    await updateAgentStatusHandler(ctx, { id, status: 'blocked' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('blocked');
  });

  it('transitions blocked to active', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('agents', {
      ...sampleAgents[0],
      status: 'blocked',
    });
    await updateAgentStatusHandler(ctx, { id, status: 'active' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('active');
  });
});

describe('seedAgentsHandler', () => {
  it('inserts exactly 4 default agents', async () => {
    const ctx = createMockCtx();
    const result = await seedAgentsHandler(ctx);
    expect(result.length).toBe(4);

    const names = result.map((a: any) => a.name).sort();
    expect(names).toEqual(['alice', 'bob', 'carol', 'frank']);
  });

  it('does not duplicate existing agents', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('agents', { ...sampleAgents[0], name: 'alice' });
    const result = await seedAgentsHandler(ctx);
    expect(result.length).toBe(4);

    const all = await ctx.db.query('agents').order('asc').collect();
    expect(all.length).toBe(4);
  });
});

describe('calculateCostPerPointHandler', () => {
  it('calculates cost per point from completed task costs', async () => {
    const ctx = createMockCtx();
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);

    await ctx.db.insert('tasks', {
      projectId: 'project-1',
      title: 'Task A',
      description: '',
      storyPoints: 5,
      status: 'done',
      priority: 'high',
      costEstimate: 10,
      actualCost: 20,
      assigneeId: agentId,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await ctx.db.insert('tasks', {
      projectId: 'project-1',
      title: 'Task B',
      description: '',
      storyPoints: 5,
      status: 'done',
      priority: 'medium',
      costEstimate: 10,
      actualCost: 10,
      assigneeId: agentId,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await calculateCostPerPointHandler(ctx, { agentId });
    expect(result).toBe(3.0);
  });

  it('returns 0 when agent has no completed tasks', async () => {
    const ctx = createMockCtx();
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const result = await calculateCostPerPointHandler(ctx, { agentId });
    expect(result).toBe(0);
  });

  it('returns 0 when total story points is zero to avoid division by zero', async () => {
    const ctx = createMockCtx();
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);

    await ctx.db.insert('tasks', {
      projectId: 'project-1',
      title: 'Task C',
      description: '',
      storyPoints: 0,
      status: 'done',
      priority: 'low',
      costEstimate: 5,
      actualCost: 5,
      assigneeId: agentId,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await calculateCostPerPointHandler(ctx, { agentId });
    expect(result).toBe(0);
  });

  it('ignores tasks that are not completed', async () => {
    const ctx = createMockCtx();
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);

    await ctx.db.insert('tasks', {
      projectId: 'project-1',
      title: 'Task D',
      description: '',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'high',
      costEstimate: 10,
      actualCost: 20,
      assigneeId: agentId,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await calculateCostPerPointHandler(ctx, { agentId });
    expect(result).toBe(0);
  });
});

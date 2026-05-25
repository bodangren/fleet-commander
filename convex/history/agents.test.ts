import { describe, expect, it } from 'bun:test';
import {
  listAgentHistoryHandler,
  getAgentHistoryHandler,
} from './agents';
import {
  createMockCtx,
  sampleProject,
  sampleAgents,
} from '../__fixtures__/foundation';
import { sampleAgentHistory } from '../__fixtures__/history';

describe('listAgentHistoryHandler', () => {
  it('returns agent history with aggregated stats', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const projectId = await ctx.db.insert('projects', sampleProject);
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const taskId1 = await ctx.db.insert('tasks', {
      projectId,
      title: 'Task 1',
      description: '',
      storyPoints: 1,
      status: 'done',
      priority: 'medium',
      costEstimate: 10,
    });
    const taskId2 = await ctx.db.insert('tasks', {
      projectId,
      title: 'Task 2',
      description: '',
      storyPoints: 1,
      status: 'done',
      priority: 'medium',
      costEstimate: 10,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId: taskId1,
      stage: 'execute',
      agentId,
      startTime: 1000,
      endTime: 5000,
      cost: 12.5,
      status: 'completed',
      createdAt: 1000,
    });
    await ctx.db.insert('pipelineRuns', {
      taskId: taskId2,
      stage: 'execute',
      agentId,
      startTime: 6000,
      endTime: 9000,
      cost: 8.0,
      status: 'completed',
      createdAt: 6000,
    });

    const result = await listAgentHistoryHandler(ctx, { projectId });

    expect(result.length).toBeGreaterThan(0);
    const agent = result.find((a: any) => a._id === agentId);
    expect(agent).toBeDefined();
    expect(agent.tasksCompleted).toBe(2);
    expect(agent.totalCost).toBe(20.5);
    expect(agent.avgLatencyMs).toBe(3500); // ((5000-1000) + (9000-6000)) / 2
  });

  it('returns empty array when no agents have history', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await listAgentHistoryHandler(ctx, {});
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    await ctx.db.insert('agents', sampleAgents[0]);
    const result = await listAgentHistoryHandler(ctx, {});
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });

  it('paginates results', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    for (let i = 0; i < 5; i++) {
      await ctx.db.insert('agents', {
        ...sampleAgents[0],
        name: `agent-${i}`,
      });
    }
    const result = await listAgentHistoryHandler(ctx, { limit: 2 });
    expect(result.length).toBe(2);
  });

  it('falls back to zero stats when agent has no pipeline runs', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const agentId = await ctx.db.insert('agents', sampleAgents[0]);
    const result = await listAgentHistoryHandler(ctx, {});
    const agent = result.find((a: any) => a._id === agentId);
    expect(agent).toBeDefined();
    expect(agent.tasksCompleted).toBe(0);
    expect(agent.totalCost).toBe(0);
    expect(agent.avgLatencyMs).toBe(0);
  });
});

describe('getAgentHistoryHandler', () => {
  it('returns agent history by id', async () => {
    expect(getAgentHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const id = await ctx.db.insert('agents', sampleAgents[0]);
    const result = await getAgentHistoryHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe(sampleAgents[0].name);
  });

  it('returns null when agent not found', async () => {
    expect(getAgentHistoryHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await getAgentHistoryHandler(ctx, { id: 'agent-999' });
    expect(result).toBeNull();
  });
});

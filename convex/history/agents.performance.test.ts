import { describe, expect, it } from 'bun:test';
import { listAgentHistoryHandler, getAgentHistoryHandler } from './agents';
import { createHistoryCtx } from '../__fixtures__/history';

describe('listAgentHistoryHandler performance', () => {
  it('returns agent history for 20 agents with 100 pipeline runs', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();

    // Seed additional agents to reach 20 total
    for (let i = 0; i < 16; i++) {
      await ctx.db.insert('agents', {
        name: `perf-agent-${i}`,
        displayName: `Perf Agent ${i}`,
        role: 'developer',
        skills: ['typescript'],
        model: 'claude-sonnet',
        costPerPoint: 10,
        reliability: 0.9,
        status: 'active',
        workload: 5,
        maxWorkload: 10,
        createdAt: Date.now(),
      });
    }

    // Seed 100 pipeline runs across agents
    const agents = await ctx.db.query('agents').order('desc').collect();
    for (let i = 0; i < 100; i++) {
      const agent = agents[i % agents.length];
      await ctx.db.insert('pipelineRuns', {
        taskId: `task-${i}`,
        stage: 'execute',
        agentId: agent._id,
        startTime: 1000 + i * 100,
        endTime: 2000 + i * 100,
        cost: 5 + (i % 20),
        status: i % 5 === 0 ? 'failed' : 'completed',
        createdAt: 1000 + i * 100,
      });
    }

    const result = await listAgentHistoryHandler(ctx, {});

    expect(result.length).toBeGreaterThanOrEqual(20);
    const firstAgent = result[0];
    expect(firstAgent.tasksCompleted).toBeGreaterThanOrEqual(0);
    expect(firstAgent.totalCost).toBeGreaterThanOrEqual(0);
  });

  it('paginates large agent history to limit 10', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();

    for (let i = 0; i < 25; i++) {
      await ctx.db.insert('agents', {
        name: `page-agent-${i}`,
        displayName: `Page Agent ${i}`,
        role: 'developer',
        skills: ['typescript'],
        model: 'gpt-4o',
        costPerPoint: 10,
        reliability: 0.9,
        status: 'active',
        workload: 5,
        maxWorkload: 10,
        createdAt: Date.now(),
      });
    }

    const result = await listAgentHistoryHandler(ctx, { limit: 10 });
    expect(result.length).toBe(10);
  });

  it('aggregates stats correctly across many pipeline runs', async () => {
    expect(listAgentHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const agentId = await ctx.db.insert('agents', {
      name: 'aggregator',
      displayName: 'Aggregator',
      role: 'developer',
      skills: ['typescript'],
      model: 'claude-opus',
      costPerPoint: 10,
      reliability: 0.95,
      status: 'active',
      workload: 5,
      maxWorkload: 10,
      createdAt: Date.now(),
    });

    for (let i = 0; i < 50; i++) {
      await ctx.db.insert('pipelineRuns', {
        taskId: `task-${i}`,
        stage: 'execute',
        agentId,
        startTime: i * 1000,
        endTime: i * 1000 + 500,
        cost: 10,
        status: 'completed',
        createdAt: i * 1000,
      });
    }

    const result = await listAgentHistoryHandler(ctx, {});
    const agent = result.find((a: any) => a._id === agentId);
    expect(agent).toBeDefined();
    expect(agent.tasksCompleted).toBe(50);
    expect(agent.totalCost).toBe(500);
    expect(agent.avgLatencyMs).toBe(500);
  });
});

describe('getAgentHistoryHandler performance', () => {
  it('returns agent with 50 pipeline runs aggregated', async () => {
    expect(getAgentHistoryHandler).toBeDefined();
    const ctx = await createHistoryCtx();
    const agentId = await ctx.db.insert('agents', {
      name: 'heavy-agent',
      displayName: 'Heavy Agent',
      role: 'developer',
      skills: ['typescript'],
      model: 'gpt-4o',
      costPerPoint: 10,
      reliability: 0.9,
      status: 'active',
      workload: 5,
      maxWorkload: 10,
      createdAt: Date.now(),
    });

    for (let i = 0; i < 50; i++) {
      await ctx.db.insert('pipelineRuns', {
        taskId: `task-${i}`,
        stage: 'execute',
        agentId,
        startTime: i * 2000,
        endTime: i * 2000 + 1000,
        cost: 5,
        status: 'completed',
        createdAt: i * 2000,
      });
    }

    const result = await getAgentHistoryHandler(ctx, { id: agentId });
    expect(result).toBeDefined();
    expect(result!.tasksCompleted).toBe(50);
    expect(result!.totalCost).toBe(250);
    expect(result!.avgLatencyMs).toBe(1000);
  });
});

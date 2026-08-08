/**
 * Registered-runtime contracts for the public agent handlers.
 *
 * These tests verify that every agent read, write, seed, and cost endpoint
 * resolves identity before touching the real schema-backed database.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

async function seedAgent(t: ConvexTest): Promise<Id<'agents'>> {
  return t.run((ctx) =>
    ctx.db.insert('agents', {
      name: 'seeded-agent',
      role: 'executor',
      skills: ['typescript'],
      model: 'claude-sonnet',
      costPerPoint: 2,
      reliability: 0.9,
      status: 'active',
      workload: 0,
      maxWorkload: 5,
      createdAt: 1_000,
    }),
  );
}

describe('agents registered runtime access contract', () => {
  it('rejects every public agent handler without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();
    const agentId = await seedAgent(t);

    const requests = [
      t.query(api.agents.listAgentsHandler, {}),
      t.query(api.agents.getAgentHandler, { id: agentId }),
      t.mutation(api.agents.createAgentHandler, {
        name: 'unauthenticated-agent',
        role: 'executor',
        skills: [],
        model: 'claude-sonnet',
        costPerPoint: 1,
        reliability: 0.8,
        maxWorkload: 3,
      }),
      t.mutation(api.agents.updateAgentHandler, {
        id: agentId,
        costPerPoint: 3,
      }),
      t.mutation(api.agents.updateAgentStatusHandler, {
        id: agentId,
        status: 'idle',
      }),
      t.mutation(api.agents.seedAgentsHandler, {}),
      t.query(api.agents.calculateCostPerPointHandler, { agentId }),
    ];

    for (const request of requests) {
      await expect(request).rejects.toThrow('Authentication required');
    }

    expect(await t.run((ctx) => ctx.db.query('agents').collect())).toHaveLength(1);
  });

  it('runs the authenticated agent lifecycle and cost calculation through registered APIs', async () => {
    const t = createConvexTest();
    const agentId = await t.mutation(api.agents.createAgentHandler, {
      name: 'runtime-agent',
      role: 'executor',
      skills: ['typescript', 'testing'],
      model: 'claude-sonnet',
      costPerPoint: 2,
      reliability: 0.9,
      maxWorkload: 5,
    });

    expect(await t.query(api.agents.getAgentHandler, { id: agentId })).toMatchObject({
      _id: agentId,
      name: 'runtime-agent',
      status: 'active',
      workload: 0,
    });

    await t.mutation(api.agents.updateAgentHandler, {
      id: agentId,
      costPerPoint: 3,
      maxWorkload: 8,
    });
    await t.mutation(api.agents.updateAgentStatusHandler, {
      id: agentId,
      status: 'idle',
    });

    await t.run(async (ctx) => {
      const projectId = await ctx.db.insert('projects', {
        name: 'Agent cost project',
        slug: 'agent-cost-project',
        description: 'Runtime agent cost fixture',
        createdAt: 1_000,
        updatedAt: 1_000,
      });
      await ctx.db.insert('tasks', {
        projectId,
        title: 'Completed cost task',
        description: 'Runtime fixture',
        storyPoints: 5,
        status: 'done',
        priority: 'high',
        costEstimate: 20,
        actualCost: 30,
        assigneeId: agentId,
        createdAt: 1_000,
        updatedAt: 1_000,
      });
    });

    expect(
      await t.query(api.agents.calculateCostPerPointHandler, { agentId }),
    ).toBe(6);
    expect(await t.query(api.agents.getAgentHandler, { id: agentId })).toMatchObject({
      costPerPoint: 3,
      maxWorkload: 8,
      status: 'idle',
    });

    const seeded = await t.mutation(api.agents.seedAgentsHandler, {});
    expect(seeded.map((agent) => agent.name)).toEqual(
      expect.arrayContaining(['alice', 'bob', 'carol', 'frank', 'runtime-agent']),
    );
  });
});

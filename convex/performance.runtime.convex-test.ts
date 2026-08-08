/**
 * Registered-runtime contract for canonical pipeline stage bucketing in the
 * performance overview query.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

async function seedPerformanceScenario(t: ConvexTest): Promise<void> {
  await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      name: 'Performance runtime project',
      slug: 'performance-runtime-project',
      description: 'Canonical stage fixture',
      createdAt: 1_000,
      updatedAt: 1_000,
    });
    const agentId = await ctx.db.insert('agents', {
      name: 'performance-agent',
      role: 'executor',
      skills: ['typescript'],
      model: 'claude-sonnet',
      costPerPoint: 2,
      reliability: 0.9,
      status: 'active',
      workload: 0,
      maxWorkload: 5,
      createdAt: 1_000,
    });
    const taskId = await ctx.db.insert('tasks', {
      projectId,
      projectSlug: 'performance-runtime-project',
      title: 'Performance task',
      description: 'Canonical stage task',
      storyPoints: 3,
      status: 'done',
      priority: 'medium',
      costEstimate: 10,
      createdAt: 1_000,
      updatedAt: 1_000,
    });
    const stages: Array<{
      stage: 'architect' | 'executor' | 'dispatch';
      cost: number;
      status: 'completed' | 'failed';
    }> = [
      { stage: 'architect', cost: 50, status: 'completed' },
      { stage: 'executor', cost: 100, status: 'failed' },
      { stage: 'dispatch', cost: 5, status: 'completed' },
    ];

    for (const [index, run] of stages.entries()) {
      await ctx.db.insert('pipelineRuns', {
        taskId,
        stage: run.stage,
        agentId,
        startTime: Date.now() - (index + 1) * 1_000,
        cost: run.cost,
        status: run.status,
        createdAt: Date.now() - (index + 1) * 1_000,
      });
    }
  });
}

describe('performance overview registered runtime contract', () => {
  it('rejects unauthenticated performance reads', async () => {
    const t = createUnauthenticatedConvexTest();
    await expect(
      t.query(api.performance.getPerformanceOverview, {}),
    ).rejects.toThrow('Authentication required');
  });

  it('maps canonical lowercase pipeline stages to the existing output labels', async () => {
    const t = createConvexTest();
    await seedPerformanceScenario(t);

    const overview = await t.query(api.performance.getPerformanceOverview, {
      projectSlug: 'performance-runtime-project',
    });
    expect(overview).not.toBeNull();
    expect(overview?.pipelineCosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: 'Architect', cost: 50 }),
        expect.objectContaining({ stage: 'Executor', cost: 100 }),
        expect.objectContaining({ stage: 'Retries', cost: 5 }),
      ]),
    );
    expect(overview?.rejectionReasons).toEqual([
      expect.objectContaining({ reason: 'Unknown', count: 1 }),
    ]);
  });
});

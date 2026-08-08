/**
 * Registered-runtime contracts for pipeline-run APIs.
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
import { seedAgent, seedProject, seedTask } from '../test/convexDomainSeeds';

describe('pipeline-run registered runtime contracts', () => {
  it('requires an identity across every registered pipeline-run surface', async () => {
    const t = createUnauthenticatedConvexTest();
    const projectId = await seedProject(t, 'unauth-pipeline-project');
    const taskId = await seedTask(t, {
      projectId,
      title: 'Unauth pipeline task',
    });
    const pipelineRunId = await t.run((ctx) =>
      ctx.db.insert('pipelineRuns', {
        taskId,
        stage: 'dispatch',
        status: 'running',
        startTime: 1_000,
        createdAt: 1_000,
        executionId: 'unauth-execution',
      }),
    );

    const requests: Array<() => Promise<unknown>> = [
      () => t.query(api.pipelineRuns.listPipelineRunsHandler, {}),
      () => t.query(api.pipelineRuns.getPipelineRunHandler, { id: pipelineRunId }),
      () => t.mutation(api.pipelineRuns.createPipelineRunHandler, { taskId, stage: 'executor' }),
      () => t.mutation(api.pipelineRuns.updatePipelineRunStatusHandler, {
        id: pipelineRunId,
        status: 'completed',
      }),
      () => t.query(api.pipelineRuns.getPipelineRunsByTaskHandler, { taskId }),
      () => t.query(api.pipelineRuns.getPipelineRunsByExecutionHandler, {
        executionId: 'unauth-execution',
      }),
      () => t.query(api.pipelineRuns.getPipelineRunCostByTaskHandler, { taskId }),
    ];

    for (const request of requests) {
      await expect(request()).rejects.toThrow('Authentication required');
    }
  });

  it('covers run creation, canonical status transitions, indexes, and cost totals', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'pipeline-runtime');
    const taskId = await seedTask(t, {
      projectId,
      title: 'Pipeline runtime task',
      status: 'in_progress',
      projectSlug: 'pipeline-runtime',
      taskKey: 'PIPE-1',
    });
    const agentId = await seedAgent(t, 'pipeline-agent');

    const completedId = await t.mutation(api.pipelineRuns.createPipelineRunHandler, {
      taskId,
      executionId: 'execution-runtime',
      pipelineName: 'runtime-pipeline',
      stage: 'dispatch',
      agentId,
    });
    await t.mutation(api.pipelineRuns.updatePipelineRunStatusHandler, {
      id: completedId,
      status: 'completed',
      cost: 12.5,
    });

    const failedId = await t.mutation(api.pipelineRuns.createPipelineRunHandler, {
      taskId,
      executionId: 'execution-runtime',
      pipelineName: 'runtime-pipeline',
      stage: 'executor',
    });
    await t.mutation(api.pipelineRuns.updatePipelineRunStatusHandler, {
      id: failedId,
      status: 'failed',
    });

    await expect(
      t.query(api.pipelineRuns.getPipelineRunHandler, { id: completedId }),
    ).resolves.toMatchObject({
      _id: completedId,
      status: 'completed',
      cost: 12.5,
      pipelineName: 'runtime-pipeline',
    });
    const byTask = await t.query(api.pipelineRuns.getPipelineRunsByTaskHandler, {
      taskId,
    });
    expect(byTask.map((run) => run._id)).toEqual([completedId, failedId]);
    expect(byTask.map((run) => run.status)).toEqual(['completed', 'failed']);
    await expect(
      t.query(api.pipelineRuns.getPipelineRunsByExecutionHandler, {
        executionId: 'execution-runtime',
      }),
    ).resolves.toHaveLength(2);
    await expect(
      t.query(api.pipelineRuns.getPipelineRunCostByTaskHandler, { taskId }),
    ).resolves.toEqual({
      totalCost: 12.5,
      stageCosts: { dispatch: 12.5 },
    });
    await expect(
      t.query(api.pipelineRuns.listPipelineRunsHandler, { limit: 1 }),
    ).resolves.toHaveLength(1);
    await expect(
      t.run((ctx) => ctx.db.get(failedId)),
    ).resolves.toMatchObject({ status: 'failed' });
  });

  it('rejects a second running pipeline run for the same task', async () => {
    const t = createConvexTest();
    const projectId = await seedProject(t, 'pipeline-guard-runtime');
    const taskId = await seedTask(t, {
      projectId,
      title: 'Guarded pipeline task',
      status: 'ready',
    });
    await t.mutation(api.pipelineRuns.createPipelineRunHandler, {
      taskId,
      stage: 'dispatch',
    });

    await expect(
      t.mutation(api.pipelineRuns.createPipelineRunHandler, {
        taskId,
        stage: 'architect',
      }),
    ).rejects.toThrow('Task already has a running pipeline run');
  });
});

import { Router, json, badRequest, notFound } from './router.js';
import { loadPipelines, PipelineLoadError } from '../pipeline/loader.js';
import { runPipeline } from '../pipeline/runner.js';
import { type Pipeline } from '../pipeline/types.js';
import { createConvexClient } from '../convexClient.js';

const convexClient = createConvexClient();

async function storeExecution(execution: Record<string, unknown>): Promise<void> {
  try {
    await convexClient.mutation('pipelines:startPipeline', {
      executionId: execution.id as string,
      pipelineName: execution.pipelineName as string,
      projectId: execution.projectId as string | undefined,
      triggeredBy: (execution.triggeredBy as 'manual' | 'task-complete') ?? 'manual',
      triggeredByTaskId: execution.triggeredByTaskId as string | undefined,
      stagesJson: JSON.stringify(execution.stages),
      envOverrideJson: execution.envOverride ? JSON.stringify(execution.envOverride) : undefined,
    });
  } catch {
    // Convex unavailable — execution still runs, just not persisted
  }
}

async function updateExecutionStatus(
  executionId: string,
  status: string,
  stages: unknown[],
): Promise<void> {
  await convexClient.mutation('pipelines:updatePipelineStatus', {
    executionId,
    status: status as 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled',
    stagesJson: JSON.stringify(stages),
  });
}

async function findPipeline(name: string): Promise<Pipeline | null> {
  try {
    const result = await loadPipelines();
    return result.pipelines.find((p) => p.name === name) ?? null;
  } catch {
    return null;
  }
}

export function registerPipelineRoutes(router: Router): void {
  router.post('/api/pipelines/:name/trigger', async (request, params) => {
    const pipelineName = params.name;
    const pipeline = await findPipeline(pipelineName);

    if (!pipeline) {
      return notFound(`Pipeline not found: ${pipelineName}`);
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // no body is fine
    }

    const envOverride = (body.env as Record<string, string>) ?? {};
    const projectId = (body.projectId as string) ?? undefined;
    const triggeredBy = (body.triggeredBy as 'manual' | 'task-complete') ?? 'manual';
    const triggeredByTaskId = (body.triggeredByTaskId as string) ?? undefined;

    try {
      const execution = await runPipeline({
        pipeline,
        envOverride,
        projectId,
        triggeredBy,
        triggeredByTaskId,
      });

      await storeExecution(execution as Record<string, unknown>);

      return json({
        executionId: execution.id,
        status: execution.status,
        pipelineName: execution.pipelineName,
      });
    } catch (err) {
      return badRequest(
        err instanceof Error ? err.message : 'Failed to trigger pipeline',
      );
    }
  });

  router.get('/api/pipelines/:name/status', async (_request, params) => {
    const pipelineName = params.name;
    const pipeline = await findPipeline(pipelineName);

    if (!pipeline) {
      return notFound(`Pipeline not found: ${pipelineName}`);
    }

    return json({
      name: pipeline.name,
      trigger: pipeline.trigger,
      stages: pipeline.stages.map((s) => ({
        name: s.name,
        stepCount: s.steps.length,
      })),
    });
  });

  router.get('/api/pipelines/:executionId/logs', async (_request, params) => {
    const executionId = params.executionId;

    try {
      const logs = await convexClient.query('pipelines:getPipelineLogs', {
        executionId,
      });

      if (!logs) {
        return notFound(`Execution logs not found: ${executionId}`);
      }

      return json(logs);
    } catch (err) {
      return notFound(`Execution logs not found: ${executionId}`);
    }
  });
}

import { Router, json, badRequest, notFound } from './router.js';
import { loadPipelines, PipelineLoadError } from '../pipeline/loader.js';
import { runPipeline } from '../pipeline/runner.js';
import { type Pipeline } from '../pipeline/types.js';
import { createConvexClient, typedQuery, typedMutation } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const convexClient = createConvexClient();

/**
 * Saves pipeline execution data to Convex.
 * @param execution - Execution record containing id, pipelineName, projectId, etc.
 */
async function storeExecution(
  client: any,
  execution: Record<string, unknown>,
): Promise<void> {
  try {
    await client.mutation(api.pipelineRuns.createPipelineRunHandler, {
      taskId: ((execution.triggeredByTaskId as string) ?? execution.id ?? 'unknown') as string,
      stage: 'executor' as const,
      agentId: undefined,
    });
  } catch {
    // Convex unavailable — execution still runs, just not persisted
  }
}

/**
 * Update execution status in Convex with current stage information.
 * @param executionId - Unique execution identifier
 * @param status - New status (pending, running, succeeded, failed, cancelled)
 * @param stages - Array of stage information
 */
async function updateExecutionStatus(
  client: any,
  executionId: string,
  status: string,
  _stages: unknown[],
): Promise<void> {
  const mappedStatus =
    status === 'cancelled' ? 'failed' : (status as 'completed' | 'failed' | 'running')
  await client.mutation(api.pipelineRuns.updatePipelineRunStatusHandler, {
    id: executionId as string,
    status: mappedStatus,
  });
}

/**
 * Selects matching pipeline by name from loaded pipelines.
 * @param name - Pipeline name to find
 * @returns Pipeline definition or null if not found
 */
async function findPipeline(name: string): Promise<Pipeline | null> {
  try {
    const result = await loadPipelines();
    return result.pipelines.find((p) => p.name === name) ?? null;
  } catch {
    return null;
  }
}

/**
 * Registers pipeline routes for triggering and managing pipeline executions.
 * @param router - Bun Router instance
 * @param client - Optional client with query method (ConvexHttpClient or mock)
 */
export function registerPipelineRoutes(
  router: Router,
  client?: { query: (...args: any[]) => Promise<any>; mutation: (...args: any[]) => Promise<any> },
): void {
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

      const mutationClient = client ?? convexClient;
      await storeExecution(mutationClient, execution as Record<string, unknown>);
      try {
        await updateExecutionStatus(
          mutationClient,
          execution.id,
          execution.status,
          execution.stages,
        );
      } catch {
        // Convex unavailable — execution still runs, just not persisted
      }

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
    const queryClient = client ?? convexClient;

    try {
      const logs = await queryClient.query(api.pipelineRuns.getPipelineRunsByTaskHandler, {
        taskId: executionId as string,
      });

      if (!logs || (Array.isArray(logs) && logs.length === 0)) {
        return notFound(`Execution logs not found: ${executionId}`);
      }

      return json(logs);
    } catch (err) {
      return notFound(`Execution logs not found: ${executionId}`);
    }
  });

  router.get('/api/pipelines', async (_request) => {
    const queryClient = client ?? convexClient;
    try {
      const executions = await queryClient.query(
        api.pipelineRuns.listPipelineRunsHandler,
        {},
      );
      return json(executions);
    } catch {
      return json({ error: 'internal_server' }, 500);
    }
  });
}

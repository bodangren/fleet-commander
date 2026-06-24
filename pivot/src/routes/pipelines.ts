import { Router, json, badRequest, notFound } from './router.js';
import { loadPipelines, PipelineLoadError } from '../pipeline/loader.js';
import { runPipeline } from '../pipeline/runner.js';
import { type Pipeline, type PipelineExecutionStatusType } from '../pipeline/types.js';
import { createConvexClient, typedQuery, typedMutation } from '../convexClient';
import { api } from '../../../convex/_generated/api';

/**
 * API response contract for `GET /api/pipelines`.
 * Spec: review_remediation_production_boundary_20260621/spec.md §AC 5.
 */
interface PipelineExecutionListItem {
  executionId: string;
  /**
   * Real pipeline name (FR-3). May be undefined for legacy rows that
   * pre-date the pipelineName field; the spec documents real-name
   * semantics — the prior hardcoded 'unknown' is no longer used.
   */
  pipelineName?: string;
  status: PipelineExecutionStatusType;
  startedAt: number;
  completedAt?: number;
}

const convexClient = createConvexClient();

/**
 * Saves pipeline execution data to Convex and returns the assigned
 * pipelineRun id so subsequent status updates can target the row.
 * @param execution - Execution record containing id, pipelineName, projectId, etc.
 * @returns The Convex-assigned pipelineRun id.
 * @throws When Convex persistence fails (so the route can surface HTTP 5xx).
 */
async function storeExecution(
  client: any,
  execution: Record<string, unknown>,
): Promise<string> {
  const taskId = execution.triggeredByTaskId as string | undefined;
  // FR-3: thread the real pipelineName from the execution record so
  // AC5 is satisfied. Prior to this fix, the column was missing and
  // GET /api/pipelines hardcoded 'unknown' as a fallback.
  const pipelineName = execution.pipelineName as string | undefined;
  const pipelineRunId = await client.mutation(
    api.pipelineRuns.createPipelineRunHandler,
    {
      taskId: taskId ?? undefined,
      executionId: execution.id as string,
      pipelineName,
      stage: 'executor' as const,
      agentId: undefined,
    },
  );
  return pipelineRunId as string;
}

/**
 * Update execution status in Convex with current stage information.
 * @param pipelineRunId - Convex pipelineRuns row id returned by createPipelineRunHandler
 * @param status - New status (pending, running, succeeded, failed, cancelled)
 * @param _stages - Array of stage information
 */
async function updateExecutionStatus(
  client: any,
  pipelineRunId: string,
  status: string,
  _stages: unknown[],
): Promise<void> {
  const mappedStatus =
    status === 'cancelled' ? 'failed' : (status as 'completed' | 'failed' | 'running')
  await client.mutation(api.pipelineRuns.updatePipelineRunStatusHandler, {
    id: pipelineRunId as string,
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

function mapStatus(raw: string): PipelineExecutionListItem['status'] {
  if (raw === 'completed') return 'succeeded';
  if (raw === 'failed') return 'failed';
  return 'running';
}

/**
 * FR-4 helper: classifies an error thrown by `runPipeline` as a client/
 * validation error (4xx) or a server/persistence error (5xx).
 *
 * Returns `true` when the error looks like a client error:
 *  - `name === 'ValidationError'` (duck-typed; no shared class)
 *  - `message` starts with `'Invalid '`, `'Circular dependency'`,
 *    `'Pipeline not found'`, `'Missing required'`, `'Bad request'`
 *  - any error thrown by `loadPipelines`/`PipelineLoadError`
 *
 * Everything else is treated as a server error (5xx).
 */
function isClientValidationError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as { name?: string })?.name;
  if (name === 'ValidationError' || name === 'PipelineLoadError') return true;
  const message = err instanceof Error ? err.message : String(err);
  if (typeof message !== 'string') return false;
  return /^(Invalid |Circular dependency|Pipeline not found|Missing required|Bad request)/.test(
    message,
  );
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
      try {
        const pipelineRunId = await storeExecution(
          mutationClient,
          execution as Record<string, unknown>,
        );
        await updateExecutionStatus(
          mutationClient,
          pipelineRunId,
          execution.status,
          execution.stages,
        );
      } catch (err) {
        // Convex persistence failures (insert/update rejected) → 5xx,
        // preserved from the prior track per FR-4.
        const message = err instanceof Error ? err.message : 'Convex persistence error';
        return json({ error: message }, 500);
      }

      return json({
        executionId: execution.id,
        status: execution.status,
        pipelineName: execution.pipelineName,
      });
    } catch (err) {
      // FR-4: distinguish client/validation errors (4xx) from server
      // errors (5xx). Duck-typed via error name and message prefix.
      const message = err instanceof Error ? err.message : 'Failed to trigger pipeline';
      if (isClientValidationError(err)) {
        return badRequest(message);
      }
      return json({ error: message }, 500);
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
      const logs = await queryClient.query(
        api.pipelineRuns.getPipelineRunsByExecutionHandler,
        {
          executionId: executionId as string,
        },
      );

      if (!logs || (Array.isArray(logs) && logs.length === 0)) {
        return notFound(`Execution logs not found: ${executionId}`);
      }

      return json(logs);
    } catch (err) {
      return notFound(`Execution logs not found: ${executionId}`);
    }
  });

  router.get('/api/pipelines', async (request) => {
    const queryClient = client ?? convexClient;
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;
    try {
      const rows = await queryClient.query(
        api.pipelineRuns.listPipelineRunsHandler,
        limit !== undefined && !Number.isNaN(limit) ? { limit } : {},
      );
      const mapped: PipelineExecutionListItem[] = (rows as Array<Record<string, unknown>>).map((row) => ({
        executionId: (row.executionId as string) ?? (row._id as string),
        // FR-3: map the real pipelineName from the row instead of
        // hardcoding 'unknown'. Falls back to undefined for legacy
        // rows that pre-date the pipelineName field.
        pipelineName: (row.pipelineName as string | undefined) ?? undefined,
        status: mapStatus(row.status as string),
        startedAt: row.startTime as number,
        completedAt: row.endTime as number | undefined,
      }));
      return json(mapped);
    } catch {
      return json({ error: 'internal_server' }, 500);
    }
  });
}

import { Router, json, badRequest } from './router';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export function registerOrchestratorRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/orchestrator/status', async () => {
    const status = await client.query(api.continuousMode.getContinuousModeStatus, {});
    const workRuns = await client.query(api.fleetCatalog.listWorkRunsByProject, {
      projectSlug: '*',
    });
    const activeExecutions = (workRuns as Array<{ status: string }>).filter(
      (wr) => wr.status === 'running',
    ).length;

    return json({
      mode: 'continuous',
      state: status.state,
      enabled: status.enabled,
      intervalMs: status.intervalMs,
      activeExecutions,
      queuedTasks: 0,
      consecutiveFailures: status.consecutiveFailures,
      maxConcurrent: status.maxConcurrent,
    });
  });

  router.post('/api/orchestrator/pause', async () => {
    await client.mutation(api.continuousMode.setContinuousMode, {
      enabled: false,
      state: 'paused',
    });
    return json({ ok: true, state: 'paused' });
  });

  router.post('/api/orchestrator/resume', async () => {
    await client.mutation(api.continuousMode.setContinuousMode, {
      enabled: true,
      state: 'running',
    });
    return json({ ok: true, state: 'running' });
  });

  router.post('/api/orchestrator/enable', async (request) => {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const intervalMs = typeof body.intervalMs === 'number' ? body.intervalMs : undefined;
    const maxConcurrent = typeof body.maxConcurrent === 'number' ? body.maxConcurrent : undefined;

    await client.mutation(api.continuousMode.setContinuousMode, {
      enabled: true,
      state: 'running',
      intervalMs,
      maxConcurrent,
    });
    return json({ ok: true, state: 'running' });
  });

  router.post('/api/orchestrator/disable', async () => {
    await client.mutation(api.continuousMode.setContinuousMode, {
      enabled: false,
      state: 'idle',
    });
    return json({ ok: true, state: 'idle' });
  });

  router.put('/api/orchestrator/interval', async (request) => {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const intervalMs = body.intervalMs as number | undefined;

    if (intervalMs === undefined || typeof intervalMs !== 'number') {
      return badRequest('intervalMs is required and must be a number');
    }

    await client.mutation(api.continuousMode.setOrchestratorInterval, { intervalMs });
    return json({ ok: true, intervalMs });
  });

  router.get('/api/orchestrator/health', async () => {
    try {
      const [circuitBreakers, recoveryStats, schemaVersion] = await Promise.all([
        client.query(api.circuitBreakers.getAllCircuitBreakers, {}),
        client.query(api.recoveryLog.getRecoveryStats, {}),
        client.query((api as Record<string, any>).systemMetadata.getSchemaVersion, {}),
      ]);
      const workRuns = await client.query(api.fleetCatalog.listWorkRunsByProject, {
        projectSlug: '*',
      });
      const activeExecutions = (workRuns as Array<{ status: string }>).filter(
        (wr) => wr.status === 'running',
      ).length;

      const openCircuits = (circuitBreakers as Array<{ state: string }>).filter((cb) => cb.state === 'open');

      return json({
        status: 'ok',
        schemaVersion: (schemaVersion as { version: number }).version,
        circuitBreakers: (circuitBreakers as Array<{ agentId: string; state: string; failureCount: number; openedAt?: number }>).map((cb) => ({
          agentId: cb.agentId,
          state: cb.state,
          failureCount: cb.failureCount,
          openedAt: cb.openedAt,
        })),
        stalledTasks: recoveryStats.stalledCount,
        retryCounts: {
          totalRetries: recoveryStats.retryCount,
        },
        lastRecovery: recoveryStats.totalEvents > 0 ? Date.now() : null,
        activeExecutions,
        openCircuits: openCircuits.length,
        totalRecoveryEvents: recoveryStats.totalEvents,
      });
    } catch (err) {
      return json(
        {
          status: 'error',
          message: err instanceof Error ? err.message : 'Convex unreachable',
          schemaVersion: null,
        },
        503,
      );
    }
  });

  router.post('/api/orchestrator/circuit-breaker/:agent/reset', async (_request, params) => {
    const agentId = params?.agent as string | undefined;
    if (!agentId) {
      return badRequest('agent parameter is required');
    }

    await client.mutation(api.circuitBreakers.resetCircuitBreaker, { agentId });
    await client.mutation(api.recoveryLog.logRecoveryEvent, {
      taskId: 'system',
      agentId,
      eventType: 'circuit-reset',
      details: `Circuit breaker reset for agent ${agentId}`,
    });
    return json({ ok: true, agentId, state: 'reset' });
  });

  router.post('/api/orchestrator/stalled/:taskId/retry', async (_request, params) => {
    const taskId = params?.taskId as string | undefined;
    if (!taskId) {
      return badRequest('taskId parameter is required');
    }

    await client.mutation(api.recoveryLog.logRecoveryEvent, {
      taskId,
      agentId: 'system',
      eventType: 'retry',
      details: `Force retry for stalled task ${taskId}`,
    });

    return json({ ok: true, taskId, state: 'retried' });
  });
}

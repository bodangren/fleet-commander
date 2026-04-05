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
}

import type { ConvexHttpClient } from 'convex/browser';
import type { Router } from './router';
import { json } from './router';
import { PipelineScheduler } from '../pipeline/scheduler';

/**
 * Register pipeline engine routes.
 * - POST /api/pipeline-engine/trigger — manually trigger a pipeline cycle
 * - GET /api/pipeline-engine/status — scheduler status
 */
export function registerPipelineEngineRoutes(
  router: Router,
  client: ConvexHttpClient,
): void {
  const scheduler = new PipelineScheduler(client, { intervalMs: 5 * 60 * 1000 });

  // Auto-start the scheduler
  scheduler.start();

  router.post('/api/pipeline-engine/trigger', async () => {
    try {
      await scheduler.runCycle();
      return json({ ok: true, message: 'Pipeline cycle triggered' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ ok: false, error: message }, 500);
    }
  });

  router.get('/api/pipeline-engine/status', () => {
    return json({
      ok: true,
      scheduler: 'running',
      intervalMs: 5 * 60 * 1000,
    });
  });
}

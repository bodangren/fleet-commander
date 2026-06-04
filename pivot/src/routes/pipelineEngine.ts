import type { Router } from './router';
import { json } from './router';
import { runAllProjects } from '../orchestrator/orchestrator';

/**
 * Register pipeline engine routes.
 * - POST /api/pipeline-engine/trigger — manually trigger a pipeline cycle via canonical orchestrator
 * - GET /api/pipeline-engine/status — scheduler status
 */
export function registerPipelineEngineRoutes(router: Router): void {
  router.post('/api/pipeline-engine/trigger', async () => {
    try {
      const results = await runAllProjects();
      return json({ ok: true, message: 'Pipeline cycle triggered', results });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ ok: false, error: message }, 500);
    }
  });

  router.get('/api/pipeline-engine/status', () => {
    return json({
      ok: true,
      source: 'orchestrator',
    });
  });
}

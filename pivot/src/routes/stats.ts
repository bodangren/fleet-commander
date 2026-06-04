import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { recomputePolicyStats } from '../policy/recompute';

/**
 * Registers stats routes for overview, agents, issues, velocity, and policy recomputation.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerStatsRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/stats/overview', async () => {
    return json({ projects: 0, tasks: 0, agents: 0 });
  });

  router.get('/api/stats/agents', async () => {
    return json([]);
  });

  router.get('/api/stats/issues', async () => {
    return json([]);
  });

  router.get('/api/stats/velocity', async () => {
    return json([]);
  });

  router.post('/api/policy/stats/recompute', async () => {
    const result = await recomputePolicyStats(client);
    return json(result);
  });
}

import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerStatsRoutes(router: Router, _client: ConvexHttpClient): void {
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
}

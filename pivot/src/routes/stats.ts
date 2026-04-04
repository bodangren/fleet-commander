import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { api } from '../../../convex/_generated/api';

export function registerStatsRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/stats/overview', async () => {
    const stats = await client.query(api.stats.getOverview, {});
    return json(stats);
  });

  router.get('/api/stats/agents', async () => {
    const stats = await client.query(api.stats.getAgentStats, {});
    return json(stats);
  });

  router.get('/api/stats/issues', async () => {
    const stats = await client.query(api.stats.getIssueStats, {});
    return json(stats);
  });

  router.get('/api/stats/velocity', async () => {
    const stats = await client.query(api.stats.getVelocityStats, { days: 14 });
    return json(stats);
  });
}

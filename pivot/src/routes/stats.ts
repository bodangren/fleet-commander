import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerStatsRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/stats/overview', async () => {
    const stats = await client.query('stats:getOverview' as never, {});
    return json(stats);
  });

  router.get('/api/stats/agents', async () => {
    const stats = await client.query('stats:getAgentStats' as never, {});
    return json(stats);
  });

  router.get('/api/stats/issues', async () => {
    const stats = await client.query('stats:getIssueStats' as never, {});
    return json(stats);
  });

  router.get('/api/stats/velocity', async () => {
    const stats = await client.query('stats:getVelocityStats' as never, { days: 14 } as never);
    return json(stats);
  });
}

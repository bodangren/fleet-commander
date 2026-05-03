import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerAnalyticsRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/analytics/completion-trends', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('analytics:getCompletionTrends' as any, {
      days,
      projectSlug,
    });
    return json(data);
  });

  router.get('/api/analytics/agent-utilization', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('analytics:getAgentUtilization' as any, {
      days,
      projectSlug,
    });
    return json(data);
  });

  router.get('/api/analytics/bottlenecks', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('analytics:getBottlenecks' as any, {
      days,
      projectSlug,
    });
    return json(data);
  });

  router.get('/api/analytics/queue-depth', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('analytics:getQueueDepth' as any, {
      days,
      projectSlug,
    });
    return json(data);
  });
}

import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerPerformanceRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/performance/phase-breakdown', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;

    const data = await client.query('performance:getPhaseBreakdown' as any, {
      days,
      projectSlug,
      agent,
    });
    return json(data);
  });

  router.get('/api/performance/phase-trends', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;

    const data = await client.query('performance:getPhaseTrends' as any, {
      days,
      projectSlug,
      agent,
    });
    return json(data);
  });

  router.get('/api/performance/agent-latency', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '7', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('performance:getAgentLatencyStats' as any, {
      days,
      projectSlug,
    });
    return json(data);
  });

  router.get('/api/performance/slow-agents', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '7', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const thresholdMultiplier = parseFloat(url.searchParams.get('thresholdMultiplier') ?? '1.5');
    const minConsecutiveBreaches = parseInt(url.searchParams.get('minConsecutiveBreaches') ?? '3', 10);

    const data = await client.query('performance:getSlowAgents' as any, {
      days,
      projectSlug,
      thresholdMultiplier,
      minConsecutiveBreaches,
    });
    return json(data);
  });
}

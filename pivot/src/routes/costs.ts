import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerCostRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/costs/by-project', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('costs:getCostByProject' as any, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/by-agent', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('costs:getCostByAgent' as any, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/trend', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('costs:getCostTrend' as any, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/session-savings', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('costs:getSessionSavings' as any, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/per-task', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await client.query('costs:getCostPerTask' as any, { days, projectSlug });
    return json(data);
  });
}

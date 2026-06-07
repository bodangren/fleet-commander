import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { api } from '../../../convex/_generated/api';
import { typedQuery } from '../convexClient';

/**
 * Register cost routes with the router.
 * @param router - The router instance
 * @param client - Convex HTTP client
 */
export function registerCostRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/costs/by-project', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await typedQuery(client, api.costs.getCostByProject, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/by-agent', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await typedQuery(client, api.costs.getCostByAgent, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/trend', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await typedQuery(client, api.costs.getCostTrend, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/session-savings', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await typedQuery(client, api.costs.getSessionSavings, { days, projectSlug });
    return json(data);
  });

  router.get('/api/costs/per-task', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await typedQuery(client, api.costs.getCostPerTask, { days, projectSlug });
    return json(data);
  });
}

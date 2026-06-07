import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { api } from '../../../convex/_generated/api';
import { typedQuery } from '../convexClient';

/**
 * Register analytics routes with the router.
 * @param router - The router instance
 * @param client - Convex HTTP client
 */
export function registerAnalyticsRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/analytics/completion-trends', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;
    const priority = url.searchParams.get('priority') ?? undefined;

    const data = await typedQuery(client, api.analytics.getCompletionTrends, {
      days,
      projectSlug,
      agent,
      priority,
    });
    return json(data);
  });

  router.get('/api/analytics/agent-utilization', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;

    const data = await typedQuery(client, api.analytics.getAgentUtilization, {
      days,
      projectSlug,
      agent,
    });
    return json(data);
  });

  router.get('/api/analytics/bottlenecks', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;
    const priority = url.searchParams.get('priority') ?? undefined;

    const data = await typedQuery(client, api.analytics.getBottlenecks, {
      days,
      projectSlug,
      agent,
      priority,
    });
    return json(data);
  });

  router.get('/api/analytics/queue-depth', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;
    const priority = url.searchParams.get('priority') ?? undefined;

    const data = await typedQuery(client, api.analytics.getQueueDepth, {
      days,
      projectSlug,
      agent,
      priority,
    });
    return json(data);
  });

  router.get('/api/analytics/hook-metrics', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await typedQuery(client, api.analytics.getHookMetrics, {
      days,
      projectSlug,
    });
    return json(data);
  });

  router.get('/api/analytics/session-metrics', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = parseInt(url.searchParams.get('days') ?? '30', 10);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;
    const priority = url.searchParams.get('priority') ?? undefined;

    const data = await typedQuery(client, api.analytics.getSessionMetrics, {
      days,
      projectSlug,
      agent,
      priority,
    });
    return json(data);
  });
}

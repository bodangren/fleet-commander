import { ConvexHttpClient } from 'convex/browser';
import { Router, badRequest, json } from './router';
import { api } from '../../../convex/_generated/api';
import { typedQuery } from '../convexClient';

/**
 * Registers performance routes for phase breakdown and phase trends data.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerPerformanceRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/performance/phase-breakdown', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = Math.max(1, parseInt(url.searchParams.get('days') ?? '30', 10) || 30);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;

    const data = await typedQuery(client, api.performance.getPhaseBreakdown, {
      days,
      projectSlug,
      agent,
    });
    return json(data);
  });

  router.get('/api/performance/phase-trends', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = Math.max(1, parseInt(url.searchParams.get('days') ?? '30', 10) || 30);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;

    const data = await typedQuery(client, api.performance.getPhaseTrends, {
      days,
      projectSlug,
      agent,
    });
    return json(data);
  });

  router.get('/api/performance/agent-latency', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;

    const data = await typedQuery(client, api.performance.getAgentLatencyStats, {
      days,
      projectSlug,
    });
    return json(data);
  });

  router.get('/api/performance/slow-agents', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const thresholdMultiplier = parseFloat(url.searchParams.get('thresholdMultiplier') ?? '1.5') || 1.5;
    const minConsecutiveBreaches = Math.max(1, parseInt(url.searchParams.get('minConsecutiveBreaches') ?? '3', 10) || 3);

    const data = await typedQuery(client, api.performance.getSlowAgents, {
      days,
      projectSlug,
      thresholdMultiplier,
      minConsecutiveBreaches,
    });
    return json(data);
  });

router.get('/api/performance/regression-alerts', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const days = Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7);
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const degradationThreshold = parseFloat(url.searchParams.get('degradationThreshold') ?? '0.2') || 0.2;

    const data = await typedQuery(client, api.performance.getRegressionAlerts, {
      days,
      projectSlug,
      degradationThreshold,
    });
    return json(data);
  });

  router.get('/api/performance/employee/:employeeId', async (req, params) => {
    const url = new URL(req.url, 'http://localhost');
    const projectId = url.searchParams.get('projectId');
    const windowDays = Math.max(1, parseInt(url.searchParams.get('windowDays') ?? '30', 10) || 30);

    if (!projectId) {
      return badRequest('projectId query param is required');
    }

    const data = await typedQuery(client, api.performance.getPerformanceOverview, {
      projectSlug: projectId,
    });

    if (!data) {
      return json({ data: null, message: 'No performance data available for the specified employee and project' }, 200);
    }

    const matchingAgent = data.agents.find((agent) => agent._id === params.employeeId);

    return json({
      data: {
        baselines: matchingAgent ? [matchingAgent] : [],
        runs: [],
        overview: data,
        windowDays,
      },
    });
  });
}

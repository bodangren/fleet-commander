import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

/**
 * Registers coverage routes including POST /api/coverage/record and GET /api/coverage/history/:projectSlug.
 * @param router - Express Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerCoverageRoutes(router: Router, client: ConvexHttpClient): void {
  router.post('/api/coverage/record', async (req) => {
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.projectSlug !== 'string' ||
      typeof body.projectId !== 'string' ||
      typeof body.percentage !== 'number' ||
      typeof body.tool !== 'string'
    ) {
      return badRequest('projectSlug, projectId, percentage, and tool are required');
    }
    const record = await client.mutation(api.coverageRecords.storeCoverageRecord, {
      projectSlug: body.projectSlug,
      projectId: body.projectId,
      percentage: body.percentage,
      tool: body.tool,
      executionId: body.executionId,
    });
    return json(record);
  });

  router.get('/api/coverage/history/:projectSlug', async (_req, params) => {
    const limit = 50;
    const records = await client.query(api.coverageRecords.getCoverageHistory, {
      projectSlug: params.projectSlug,
      limit,
    });
    return json(records);
  });

  router.get('/api/coverage/latest/:projectSlug', async (_req, params) => {
    const record = await client.query(api.coverageRecords.getLatestCoverage, {
      projectSlug: params.projectSlug,
    });
    return json(record);
  });
}
import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { api } from '../../../convex/_generated/api';

export function registerCoverageRoutes(router: Router, client: ConvexHttpClient): void {
  router.post('/api/coverage/record', async (req) => {
    const body = await req.json();
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
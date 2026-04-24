import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

export function registerAnalysisRoutes(router: Router, client: ConvexHttpClient): void {
  router.post('/api/analysis/record', async (req) => {
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.projectSlug !== 'string' ||
      typeof body.executionId !== 'string' ||
      !Array.isArray(body.results)
    ) {
      return badRequest('projectSlug, executionId, and results array are required');
    }

    const validResults = body.results.filter(
      (r: unknown): r is {
        tool: string;
        file: string;
        line?: number;
        column?: number;
        severity: 'error' | 'warning' | 'info';
        message: string;
        rule?: string;
      } =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as Record<string, unknown>).tool === 'string' &&
        typeof (r as Record<string, unknown>).file === 'string' &&
        typeof (r as Record<string, unknown>).message === 'string' &&
        ['error', 'warning', 'info'].includes((r as Record<string, unknown>).severity as string),
    );

    if (validResults.length === 0) {
      return badRequest('No valid analysis results provided');
    }

    const count = await client.mutation(api.analysisResults.storeAnalysisResults, {
      projectSlug: body.projectSlug,
      executionId: body.executionId,
      results: validResults,
    });

    return json({ stored: count });
  });

  router.get('/api/analysis/execution/:executionId', async (_req, params) => {
    const results = await client.query(api.analysisResults.getAnalysisByExecution, {
      executionId: params.executionId,
    });
    return json(results);
  });

  router.get('/api/analysis/project/:projectSlug', async (_req, params) => {
    const limit = parseInt(_req.url.split('limit=')[1] ?? '100', 10);
    const results = await client.query(api.analysisResults.getAnalysisByProject, {
      projectSlug: params.projectSlug,
      limit,
    });
    return json(results);
  });

  router.get('/api/analysis/history/:projectSlug', async (_req, params) => {
    const limit = parseInt(_req.url.split('limit=')[1] ?? '50', 10);
    const history = await client.query(api.analysisResults.getAnalysisHistory, {
      projectSlug: params.projectSlug,
      limit,
    });
    return json(history);
  });

  router.delete('/api/analysis/execution/:executionId', async (_req, params) => {
    const count = await client.mutation(api.analysisResults.deleteAnalysisByExecution, {
      executionId: params.executionId,
    });
    return json({ deleted: count });
  });
}

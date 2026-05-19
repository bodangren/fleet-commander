import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Router } from './router';
import { json, notFound } from './router';

export function registerDashboardRoutes(
  router: Router,
  client: ConvexHttpClient,
): void {
  // GET /api/dashboard?projectId=<id>
  router.get('/api/dashboard', async (req) => {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') ?? undefined;

    try {
      const data = await client.query(
        api.dashboard.getDashboardDataHandler,
        { projectId: projectId as any },
      );
      return json({ data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });
}

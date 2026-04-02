import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerLogRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/logs', async (_req, params) => {
    const logs = await client.query('executionLogs:listLogsByProject' as never, {
      projectSlug: params.projectSlug,
    } as never);
    return json(logs);
  });

  router.get('/api/projects/:projectSlug/logs/stats', async (_req, params) => {
    const logs = (await client.query('executionLogs:listLogsByProject' as never, {
      projectSlug: params.projectSlug,
    } as never)) as Array<{ status: string }>;

    const total = logs.length;
    const completed = logs.filter((l) => l.status === 'completed').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const running = logs.filter((l) => l.status === 'running').length;

    return json({ total, completed, failed, running });
  });

  router.get('/api/projects/:projectSlug/tasks/:taskId/review', async (_req, params) => {
    // Review history — returns empty until review pipeline is ported
    const logs = (await client.query('executionLogs:listLogsByProject' as never, {
      projectSlug: params.projectSlug,
    } as never)) as Array<{ trackId?: string; status: string; summary: string; createdAt: number }>;

    const reviews = logs.filter((l) => l.trackId === params.taskId);
    return json(reviews);
  });
}

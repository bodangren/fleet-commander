import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Router } from './router';
import { json, notFound } from './router';

export function registerTaskTimelineRoutes(
  router: Router,
  client: ConvexHttpClient,
): void {
  // GET /api/tasks/:taskId/timeline
  router.get('/api/tasks/:taskId/timeline', async (_req, params) => {
    const taskId = params.taskId;
    if (!taskId) {
      return notFound();
    }

    try {
      const timeline = await client.query(
        api.taskTimeline.getTaskTimelineHandler,
        { taskId: taskId as any },
      );
      return json({ data: timeline });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });
}

import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { Router, json, routeBody } from './router';

const createSprintSchema = z.object({
  name: z.string().min(1, 'name is required'),
});

/**
 * Registers sprint routes for listing and managing sprints
 * @param router - Router instance
 * @param _client - ConvexHttpClient instance (unused)
 */
export function registerSprintRoutes(router: Router, _client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/sprints', async () => {
    return json([]);
  });

  router.post('/api/projects/:projectSlug/sprints', async (request) => {
    const parsed = await routeBody(createSprintSchema, request);
    if (!parsed.ok) return parsed.response;
    return json({ id: `sprint-${Date.now()}` }, 201);
  });

  router.put('/api/projects/:projectSlug/sprints/:sprintId', async (request) => {
    const parsed = await routeBody(z.object({}).passthrough(), request);
    if (!parsed.ok) return parsed.response;
    return json({ ok: true });
  });
}

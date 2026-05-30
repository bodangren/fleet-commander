import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest } from './router';

/**
 * Registers sprint routes for listing and managing sprints.
 * @param router - Express Router instance
 * @param _client - ConvexHttpClient instance (unused)
 */
export function registerSprintRoutes(router: Router, _client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/sprints', async () => {
    return json([]);
  });

  router.post('/api/projects/:projectSlug/sprints', async (request) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name) return badRequest('name is required');
    return json({ id: `sprint-${Date.now()}` }, 201);
  });

  router.put('/api/projects/:projectSlug/sprints/:sprintId', async (request) => {
    const _body = (await request.json()) as Record<string, unknown>;
    return json({ ok: true });
  });
}

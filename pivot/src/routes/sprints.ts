import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest } from './router';

export function registerSprintRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/sprints', async (_req, params) => {
    const sprints = await client.query('sprints:listSprints' as never, {
      projectSlug: params.projectSlug,
    } as never);
    return json(sprints);
  });

  router.post('/api/projects/:projectSlug/sprints', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name) return badRequest('name is required');
    const id = await client.mutation('sprints:createSprint' as never, {
      projectSlug: params.projectSlug,
      name: body.name,
      startDate: body.startDate ?? Date.now(),
      endDate: body.endDate ?? Date.now() + 14 * 86400000,
      goal: body.goal,
      taskKeys: body.taskKeys,
    } as never);
    return json({ id }, 201);
  });

  router.put('/api/projects/:projectSlug/sprints/:sprintId', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation('sprints:updateSprint' as never, {
      sprintId: params.sprintId,
      name: body.name,
      status: body.status,
      goal: body.goal,
      taskKeys: body.taskKeys,
    } as never);
    return json({ ok: true });
  });
}

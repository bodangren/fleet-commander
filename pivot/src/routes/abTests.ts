import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

export function registerAbTestRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/ab-tests', async () => {
    const tests = await client.query(api.abTests.listAbTestsHandler, {});
    return json(tests);
  });

  router.get('/api/ab-tests/:id', async (_req, params) => {
    const test = await client.query(api.abTests.getAbTestHandler, { id: params.id as any });
    if (!test) return notFound();
    return json(test);
  });

  router.post('/api/ab-tests', async (request) => {
    const body = (await request.json()) as Record<string, unknown>;
    const name = body.name as string;
    if (!name) return badRequest('name is required');

    const id = await client.mutation(api.abTests.createAbTestHandler, {
      name,
      agentRole: ((body.agentRole as string) || 'architect') as any,
      controlModel: (body.controlModel as string) || '',
      treatmentModel: (body.treatmentModel as string) || '',
      splitRatio: Number(body.splitRatio ?? 50),
      sprintId: body.sprintId as any,
    });

    return json({ _id: id }, 201);
  });

  router.patch('/api/ab-tests/:id', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    const status = body.status as string;
    if (!status) return badRequest('status is required');

    await client.mutation(api.abTests.updateAbTestStatusHandler, {
      id: params.id as any,
      status: status as 'draft' | 'running' | 'completed',
    });

    return json({ ok: true });
  });

  router.delete('/api/ab-tests/:id', async (_req, params) => {
    await client.mutation(api.abTests.deleteAbTestHandler, { id: params.id as any });
    return json({ ok: true });
  });
}

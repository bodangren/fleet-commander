import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest, noContent } from './router';

export function registerAgentRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/agents', async () => {
    const agents = await client.query('fleetCatalog:listAgents' as never, {});
    return json(agents);
  });

  router.get('/api/agents/:name', async (_req, params) => {
    const agent = await client.query('fleetCatalog:getAgentByName' as never, {
      name: params.name,
    } as never);
    if (!agent) return notFound();
    return json(agent);
  });

  router.put('/api/agents/:name', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation('fleetCatalog:upsertAgent' as never, {
      name: params.name,
      displayName: body.displayName ?? params.name,
      mode: body.mode ?? 'cli',
      model: body.model ?? 'default',
      temperature: body.temperature ?? 0.7,
      prompt: body.prompt ?? '',
      toolsJson: body.toolsJson ?? '[]',
      source: body.source ?? 'manual',
    } as never);
    return json({ ok: true });
  });

  router.delete('/api/agents/:name', async (_request, params) => {
    await client.mutation('fleetCatalog:deleteAgent' as never, { name: params.name } as never);
    return noContent();
  });

  router.post('/api/agents/:name/clone', async (request, params) => {
    const agent = (await client.query('fleetCatalog:getAgentByName' as never, {
      name: params.name,
    } as never)) as Record<string, unknown> | null;
    if (!agent) return notFound();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const newName = (body.newName as string) ?? `${params.name}-clone`;
    await client.mutation('fleetCatalog:upsertAgent' as never, {
      name: newName,
      displayName: `${agent.displayName as string} (clone)`,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature,
      prompt: agent.prompt,
      toolsJson: agent.toolsJson,
      source: 'manual',
    } as never);
    return json({ name: newName }, 201);
  });

  router.post('/api/agents/:name/reset', async (_request, params) => {
    await client.mutation('fleetCatalog:deleteAgent' as never, { name: params.name } as never);
    return json({ ok: true, message: 'Agent reset to defaults' });
  });

  router.post('/api/agents/:name/test', async (_request, params) => {
    const agent = await client.query('fleetCatalog:getAgentByName' as never, {
      name: params.name,
    } as never);
    if (!agent) return notFound();
    return json({ ok: true, message: `Test execution stubbed for ${params.name}` });
  });
}

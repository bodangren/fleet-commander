import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, noContent } from './router';
import { api } from '../../../convex/_generated/api';

/**
 * Transform agent data from Convex into the API format.
 * @param agent - Raw agent data from Convex
 * @returns {Record<string, unknown> | null} Transformed agent or null
 */
function wrapAgent(agent: Record<string, unknown> | null) {
  if (!agent) return null;
  const tools = (() => {
    try {
      return JSON.parse((agent.toolsJson as string) || '{}');
    } catch {
      return {};
    }
  })();
  return {
    layer: (agent.source as string) || 'import',
    definition: {
      name: agent.name,
      description: agent.displayName,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature,
      tools,
      body: agent.prompt,
    },
  };
}

/**
 * Register agent routes with the router.
 * @param router - The router instance
 * @param client - Convex HTTP client
 */
export function registerAgentRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/agents', async () => {
    const agents = await client.query(api.fleetCatalog.listAgents, {});
    return json(agents.map(wrapAgent));
  });

  router.get('/api/agents/:name', async (_req, params) => {
    const agent = await client.query(api.fleetCatalog.getAgentByName, {
      name: params.name,
    });
    if (!agent) return notFound();
    return json(wrapAgent(agent));
  });

  router.put('/api/agents/:name', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    const definition = (body.definition || body) as Record<string, unknown>;
    const tools = definition.tools as Record<string, boolean> | undefined;
    await client.mutation(api.fleetCatalog.upsertAgent, {
      name: params.name,
      displayName: (definition.description as string) || (definition.displayName as string) || params.name,
      mode: (definition.mode as string) || 'agent',
      model: (definition.model as string) || 'default',
      temperature: Number(definition.temperature ?? 0.7),
      prompt: (definition.body as string) || (definition.prompt as string) || '',
      toolsJson: tools ? JSON.stringify(tools) : '{}',
      source: (body.source as 'manual' | 'scanner' | 'import') || 'manual',
    });
    return json({ ok: true });
  });

  router.delete('/api/agents/:name', async (_request, params) => {
    await client.mutation(api.fleetCatalog.deleteAgent, { name: params.name });
    return noContent();
  });

  router.post('/api/agents/:name/clone', async (request, params) => {
    const agent = await client.query(api.fleetCatalog.getAgentByName, {
      name: params.name,
    });
    if (!agent) return notFound();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const newName = (body.newName as string) ?? `${params.name}-clone`;
    await client.mutation(api.fleetCatalog.upsertAgent, {
      name: newName,
      displayName: `${agent.displayName} (clone)`,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature,
      prompt: agent.prompt,
      toolsJson: agent.toolsJson,
      source: 'manual',
    });
    return json({ name: newName }, 201);
  });

  router.post('/api/agents/:name/reset', async (_request, params) => {
    await client.mutation(api.fleetCatalog.deleteAgent, { name: params.name });
    return json({ ok: true, message: 'Agent reset to defaults' });
  });

  router.post('/api/agents/:name/test', async (_request, params) => {
    const agent = await client.query(api.fleetCatalog.getAgentByName, {
      name: params.name,
    });
    if (!agent) return notFound();
    return json({ ok: true, message: `Test execution stubbed for ${params.name}` });
  });
}

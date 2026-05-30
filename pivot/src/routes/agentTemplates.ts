import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, noContent, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

/**
 * Registers or initializes
 * @param router - The router instance to register routes on
 * @param client - The Convex HTTP client
 */
export function registerAgentTemplateRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/agent-templates', async () => {
    const templates = await client.query(api.agentTemplates.listTemplatesHandler, {});
    return json(templates);
  });

  router.get('/api/agent-templates/:id', async (_req, params) => {
    const template = await client.query(api.agentTemplates.getTemplateHandler, {
      id: params.id as any,
    });
    if (!template) return notFound();
    return json(template);
  });

  router.post('/api/agent-templates', async (request) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name || !body.role || !body.model) {
      return badRequest('name, role, and model are required');
    }
    try {
      const id = await client.mutation(api.agentTemplates.createTemplateHandler, {
        name: body.name as string,
        role: body.role as any,
        model: body.model as any,
        temperature: Number(body.temperature ?? 0.3),
        systemPrompt: (body.systemPrompt as string) ?? '',
        skills: (body.skills as string[]) ?? [],
        estimatedCostPer1kTokens: Number(body.estimatedCostPer1kTokens ?? 0),
      });
      return json({ id }, 201);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        return badRequest(err.message);
      }
      throw err;
    }
  });

  router.patch('/api/agent-templates/:id', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    try {
      await client.mutation(api.agentTemplates.updateTemplateHandler, {
        id: params.id as any,
        ...(body.name !== undefined && { name: body.name as string }),
        ...(body.role !== undefined && { role: body.role as any }),
        ...(body.model !== undefined && { model: body.model as any }),
        ...(body.temperature !== undefined && { temperature: Number(body.temperature) }),
        ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt as string }),
        ...(body.skills !== undefined && { skills: body.skills as string[] }),
        ...(body.estimatedCostPer1kTokens !== undefined && {
          estimatedCostPer1kTokens: Number(body.estimatedCostPer1kTokens),
        }),
      });
      return json({ ok: true });
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        return badRequest(err.message);
      }
      throw err;
    }
  });

  router.delete('/api/agent-templates/:id', async (_request, params) => {
    try {
      await client.mutation(api.agentTemplates.deleteTemplateHandler, {
        id: params.id as any,
      });
      return noContent();
    } catch (err: any) {
      if (err.message?.includes('Cannot delete')) {
        return badRequest(err.message);
      }
      throw err;
    }
  });

  router.post('/api/agent-templates/:id/clone', async (request, params) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const newName = (body.newName as string) ?? `clone-${Date.now()}`;
    try {
      const id = await client.mutation(api.agentTemplates.cloneTemplateHandler, {
        id: params.id as any,
        newName,
      });
      return json({ id }, 201);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('not found')) {
        return badRequest(err.message);
      }
      throw err;
    }
  });

  router.post('/api/agent-templates/seed-defaults', async () => {
    const ids = await client.mutation(api.agentTemplates.seedDefaultTemplatesHandler, {});
    return json({ seeded: ids.length });
  });
}

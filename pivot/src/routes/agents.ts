import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { Router, json, notFound, noContent, routeBody } from './router'
import { api } from '../../../convex/_generated/api'
import { checkPiAgentReadiness, type PiAgentReadiness } from '../orchestrator/piReadiness'

export interface AgentRouteDeps {
  readiness?: (agent: { name: string; model: string }) => Promise<PiAgentReadiness>
}

/**
 * Transform agent data from Convex into the API format.
 * @param agent - Raw agent data from Convex
 * @returns {Record<string, unknown> | null} Transformed agent or null
 */
function wrapAgent(agent: Record<string, unknown> | null) {
  if (!agent) return null
  const tools = (() => {
    try {
      return JSON.parse((agent.toolsJson as string) || '{}')
    } catch {
      return {}
    }
  })()
  return {
    layer: (agent.source as string) || 'import',
    status: agent.status,
    workload: agent.workload,
    maxWorkload: agent.maxWorkload,
    definition: {
      name: agent.name,
      description: agent.displayName,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature,
      tools,
      body: agent.prompt,
    },
  }
}

/**
 * Register agent routes with the router.
 * @param router - The router instance
 * @param client - Convex HTTP client
 */
export function registerAgentRoutes(
  router: Router,
  client: ConvexHttpClient,
  deps: AgentRouteDeps = {},
): void {
  router.get('/api/agents', async () => {
    const agents = await client.query(api.fleetCatalog.listAgents, {})
    return json(agents.map(wrapAgent))
  })

  router.get('/api/agents/:name', async (_req, params) => {
    const agent = await client.query(api.fleetCatalog.getAgentByName, {
      name: params.name,
    })
    if (!agent) return notFound()
    return json(wrapAgent(agent))
  })

  router.put('/api/agents/:name', async (request, params) => {
    const parsed = await routeBody(
      z
        .object({
          source: z.enum(['manual', 'scanner', 'import']).optional(),
          definition: z
            .object({
              description: z.string().optional(),
              displayName: z.string().optional(),
              mode: z.string().optional(),
              model: z.string().optional(),
              temperature: z.number().optional(),
              body: z.string().optional(),
              prompt: z.string().optional(),
              tools: z.record(z.string(), z.boolean()).optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough(),
      request,
    )
    if (!parsed.ok) return parsed.response
    const body = parsed.data
    const definition = (body.definition ?? body) as Record<string, unknown>
    const tools = definition.tools as Record<string, boolean> | undefined
    await client.mutation(api.fleetCatalog.upsertAgent, {
      name: params.name,
      displayName:
        (definition.description as string) || (definition.displayName as string) || params.name,
      mode: (definition.mode as string) || 'agent',
      model: (definition.model as string) || 'default',
      temperature: Number(definition.temperature ?? 0.7),
      prompt: (definition.body as string) || (definition.prompt as string) || '',
      toolsJson: tools ? JSON.stringify(tools) : '{}',
      source: body.source || 'manual',
    })
    return json({ ok: true })
  })

  router.delete('/api/agents/:name', async (_request, params) => {
    await client.mutation(api.fleetCatalog.deleteAgent, { name: params.name })
    return noContent()
  })

  router.post('/api/agents/:name/clone', async (request, params) => {
    const agent = await client.query(api.fleetCatalog.getAgentByName, {
      name: params.name,
    })
    if (!agent) return notFound()
    const parsed = await routeBody(z.object({ newName: z.string().optional() }), request)
    if (!parsed.ok) return parsed.response
    const newName = parsed.data.newName ?? `${params.name}-clone`
    await client.mutation(api.fleetCatalog.upsertAgent, {
      name: newName,
      displayName: `${agent.displayName} (clone)`,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature,
      prompt: agent.prompt,
      toolsJson: agent.toolsJson,
      source: 'manual',
    })
    return json({ name: newName }, 201)
  })

  router.post('/api/agents/:name/reset', async (_request, params) => {
    await client.mutation(api.fleetCatalog.deleteAgent, { name: params.name })
    return json({ ok: true, message: 'Agent reset to defaults' })
  })

  router.post('/api/agents/:name/test', async (_request, params) => {
    const agent = await client.query(api.fleetCatalog.getAgentByName, {
      name: params.name,
    })
    if (!agent) return notFound()
    const startedAt = Date.now()
    const readiness = deps.readiness
      ? await deps.readiness({ name: agent.name, model: agent.model })
      : checkPiAgentReadiness(agent.model, process.env)
    const latencyMs = Date.now() - startedAt
    return json({
      name: params.name,
      ok: readiness.ok,
      status: readiness.ok ? 'ready' : 'blocked',
      latencyMs,
      output: readiness.ok ? `Pi readiness confirmed for ${agent.model}` : '',
      error: readiness.ok ? undefined : (readiness.reason ?? 'Pi readiness check failed'),
      readiness,
    })
  })
}

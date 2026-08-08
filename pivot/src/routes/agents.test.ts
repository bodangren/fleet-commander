import { describe, expect, it, mock } from 'bun:test'
import { Router } from './router'
import { registerAgentRoutes } from './agents'
import { ConvexHttpClient } from 'convex/browser'

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Agent route registration', () => {
  function createRouter(): Router {
    const router = new Router()
    const mockClient = {
      query: mock(async () => []),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient
    registerAgentRoutes(router, mockClient)
    return router
  }

  it('registers GET /api/agents', () => {
    expect(createRouter().match('GET', '/api/agents')).not.toBeNull()
  })

  it('registers GET /api/agents/:name', () => {
    const result = createRouter().match('GET', '/api/agents/coder')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ name: 'coder' })
  })

  it('registers PUT /api/agents/:name', () => {
    expect(createRouter().match('PUT', '/api/agents/coder')).not.toBeNull()
  })

  it('registers DELETE /api/agents/:name', () => {
    expect(createRouter().match('DELETE', '/api/agents/coder')).not.toBeNull()
  })

  it('registers POST /api/agents/:name/clone', () => {
    const result = createRouter().match('POST', '/api/agents/coder/clone')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ name: 'coder' })
  })

  it('registers POST /api/agents/:name/test', () => {
    const result = createRouter().match('POST', '/api/agents/coder/test')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ name: 'coder' })
  })
})

describe('Agent route handlers', () => {
  it('GET /api/agents exposes durable status and workload evidence', async () => {
    const router = new Router()
    registerAgentRoutes(router, {
      query: mock(async () => [{
        name: 'luna',
        displayName: 'Luna coder',
        mode: 'agent',
        model: 'openai/gpt-5.6-luna',
        status: 'active',
        workload: 0,
        maxWorkload: 5,
        temperature: 0.1,
        prompt: '',
        toolsJson: '{}',
        source: 'manual',
        updatedAt: 1,
      }]),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient)

    const match = router.match('GET', '/api/agents')!
    const response = await match.handler(makeRequest('GET', '/api/agents'), {})
    const body = await response.json()

    expect(body).toEqual([expect.objectContaining({
      status: 'active',
      workload: 0,
      maxWorkload: 5,
    })])
  })

  it('GET /api/agents/:name returns 404 for unknown agent', async () => {
    const router = new Router()
    registerAgentRoutes(router, {
      query: mock(async () => null),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient)
    const match = router.match('GET', '/api/agents/unknown')!
    const res = await match.handler(makeRequest('GET', '/api/agents/unknown'), { name: 'unknown' })
    expect(res.status).toBe(404)
  })

  it('PUT /api/agents/:name upserts agent with valid body', async () => {
    const mutation = mock(async () => ({}))
    const router = new Router()
    registerAgentRoutes(router, {
      query: mock(async () => []),
      mutation,
    } as unknown as ConvexHttpClient)
    const match = router.match('PUT', '/api/agents/coder')!
    const res = await match.handler(
      makeRequest('PUT', '/api/agents/coder', {
        definition: { description: 'Code writer', model: 'gpt-4' },
      }),
      { name: 'coder' },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('existing-agent model updates round-trip through the production route', async () => {
    let storedModel = 'minimax-cn-coding-plan/MiniMax-M3'
    const query = mock(async () => ({
      name: 'coder',
      displayName: 'Code Writer',
      mode: 'agent',
      model: storedModel,
      temperature: 0.7,
      prompt: '',
      toolsJson: '{}',
      source: 'manual',
      updatedAt: 1,
    }))
    const mutation = mock(async (_fn: unknown, args: { model?: string }) => {
      if (args.model) storedModel = args.model
      return null
    })
    const router = new Router()
    registerAgentRoutes(router, { query, mutation } as unknown as ConvexHttpClient)

    const put = router.match('PUT', '/api/agents/coder')!
    await put.handler(
      makeRequest('PUT', '/api/agents/coder', {
        definition: {
          description: 'ignored presentation field',
          model: 'vocengine-coding/glm-5.2',
          temperature: 0.9,
        },
      }),
      { name: 'coder' },
    )

    const get = router.match('GET', '/api/agents/coder')!
    const response = await get.handler(makeRequest('GET', '/api/agents/coder'), { name: 'coder' })
    const body = await response.json()
    expect(body.definition.model).toBe('vocengine-coding/glm-5.2')
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(mutation.mock.calls[0]?.[1]).toMatchObject({
      name: 'coder',
      model: 'vocengine-coding/glm-5.2',
      displayName: 'ignored presentation field',
      temperature: 0.9,
    })
  })

  it('POST /api/agents/:name/clone returns 404 for unknown agent', async () => {
    const router = new Router()
    registerAgentRoutes(router, {
      query: mock(async () => null),
      mutation: mock(async () => ({})),
    } as unknown as ConvexHttpClient)
    const match = router.match('POST', '/api/agents/unknown/clone')!
    const res = await match.handler(makeRequest('POST', '/api/agents/unknown/clone', {}), {
      name: 'unknown',
    })
    expect(res.status).toBe(404)
  })

  it('POST /api/agents/:name/clone clones with default name', async () => {
    const mutation = mock(async () => ({}))
    const router = new Router()
    registerAgentRoutes(router, {
      query: mock(async () => ({
        name: 'coder',
        displayName: 'Code Writer',
        mode: 'agent',
        model: 'gpt-4',
        temperature: 0.7,
        prompt: 'You code',
        toolsJson: '{}',
      })),
      mutation,
    } as unknown as ConvexHttpClient)
    const match = router.match('POST', '/api/agents/coder/clone')!
    const res = await match.handler(makeRequest('POST', '/api/agents/coder/clone', {}), {
      name: 'coder',
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('coder-clone')
  })

  it('POST /api/agents/:name/test performs readiness and never returns fabricated success', async () => {
    const router = new Router()
    registerAgentRoutes(
      router,
      {
        query: mock(async () => ({
          name: 'coder',
          displayName: 'Code Writer',
          mode: 'agent',
          model: 'minimax-cn-coding-plan/MiniMax-M3',
          temperature: 0.7,
          prompt: 'You code',
          toolsJson: '{}',
          source: 'manual',
          updatedAt: 1,
        })),
        mutation: mock(async () => ({})),
      } as unknown as ConvexHttpClient,
      {
        readiness: async () => ({
          ok: false,
          agentName: 'coder',
          modelRef: 'minimax-cn-coding-plan/MiniMax-M3',
          binaryFound: true,
          harnessRoot: '/tmp/pi-measure-harness',
          reason: 'provider credentials unavailable',
        }),
      },
    )
    const match = router.match('POST', '/api/agents/coder/test')!
    const res = await match.handler(makeRequest('POST', '/api/agents/coder/test'), {
      name: 'coder',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('blocked')
    expect(body.status).not.toBe('success')
    expect(body.error).toContain('provider credentials unavailable')
  })

  it('uses the production readiness probe by default and fails closed', async () => {
    const previousRoot = process.env.PI_MEASURE_HARNESS_ROOT
    process.env.PI_MEASURE_HARNESS_ROOT = '/definitely-missing-pi-harness'
    try {
      const router = new Router()
      registerAgentRoutes(router, {
        query: mock(async () => ({
          name: 'coder',
          displayName: 'Code Writer',
          mode: 'agent',
          model: 'minimax-cn-coding-plan/MiniMax-M3',
          temperature: 0.7,
          prompt: 'You code',
          toolsJson: '{}',
          source: 'manual',
          updatedAt: 1,
        })),
        mutation: mock(async () => ({})),
      } as unknown as ConvexHttpClient)

      const match = router.match('POST', '/api/agents/coder/test')!
      const res = await match.handler(makeRequest('POST', '/api/agents/coder/test'), {
        name: 'coder',
      })
      const body = await res.json()

      expect(body.ok).toBe(false)
      expect(body.status).toBe('blocked')
      expect(body.error).toContain('not found')
    } finally {
      if (previousRoot === undefined) delete process.env.PI_MEASURE_HARNESS_ROOT
      else process.env.PI_MEASURE_HARNESS_ROOT = previousRoot
    }
  })
})

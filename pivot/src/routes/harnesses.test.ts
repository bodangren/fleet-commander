import { describe, expect, it, mock } from 'bun:test'
import { Router } from './router'
import { registerHarnessRoutes } from './harnesses'

const piCatalog = [
  {
    layer: 'bundled' as const,
    binaryFound: true,
    readiness: {
      ok: true,
      piRole: 'coder-minimax-m3',
      piModel: 'minimax-cn/MiniMax-M3',
    },
    models: ['MiniMax-M3'],
    definition: {
      name: 'minimax-cn-coding-plan',
      binary: 'pi',
      discovery: {
        command: 'pi --list-models',
        parseStrategy: 'pi-roster',
        pattern: 'minimax-cn-coding-plan/*',
      },
      invocation: {
        template: 'pi --model {model} --mode json -p {prompt}',
        flags: { readiness: 'pi --list-models {model}' },
      },
    },
  },
]

describe('Pi harness routes', () => {
  it('serves provider/model choices from the Pi catalog', async () => {
    const router = new Router()
    registerHarnessRoutes(
      router,
      { query: mock(async () => []), mutation: mock(async () => null) } as any,
      { catalog: () => piCatalog },
    )

    const match = router.match('GET', '/api/harnesses')!
    const response = await match.handler(new Request('http://localhost/api/harnesses'), {})
    expect(await response.json()).toEqual(piCatalog)
  })

  it('serves model discovery and readiness from the same Pi entry', async () => {
    const router = new Router()
    registerHarnessRoutes(
      router,
      { query: mock(async () => []), mutation: mock(async () => null) } as any,
      { catalog: () => piCatalog },
    )

    const match = router.match('GET', '/api/harnesses/minimax-cn-coding-plan/models')!
    const response = await match.handler(
      new Request('http://localhost/api/harnesses/minimax-cn-coding-plan/models'),
      { name: 'minimax-cn-coding-plan' },
    )
    expect(await response.json()).toEqual({
      models: ['MiniMax-M3'],
      readiness: piCatalog[0].readiness,
    })
  })

  for (const [method, path] of [
    ['PUT', '/api/harnesses/minimax-cn-coding-plan'],
    ['DELETE', '/api/harnesses/minimax-cn-coding-plan'],
    ['POST', '/api/harnesses/minimax-cn-coding-plan/reset'],
  ] as const) {
    it(`rejects ${method} ${path} because the Pi catalog is read-only`, async () => {
      const router = new Router()
      registerHarnessRoutes(
        router,
        { query: mock(async () => []), mutation: mock(async () => null) } as any,
        { catalog: () => piCatalog },
      )
      const match = router.match(method, path)!
      const response = await match.handler(new Request(`http://localhost${path}`, { method }), {
        name: 'minimax-cn-coding-plan',
      })
      expect(response.status).toBe(405)
      expect((await response.json()).error).toContain('read-only')
    })
  }
})

import { describe, expect, it } from 'bun:test'
import { createMockCtx } from './__fixtures__/foundation'
import { getAgentByName, listAgents, upsertAgent } from './fleetCatalog'

describe('fleet catalog agent evidence', () => {
  it('persists and exposes status and workload bounds through catalog reads', async () => {
    const ctx = createMockCtx()
    ctx.auth.getUserIdentity = async () => ({ tokenIdentifier: 'agent-evidence-test' })

    await upsertAgent(ctx, {
      name: 'luna',
      displayName: 'Luna coder',
      mode: 'agent',
      model: 'openai/gpt-5.6-luna',
      temperature: 0.1,
      prompt: '',
      toolsJson: '{}',
      source: 'manual',
    })

    const listed = await listAgents(ctx, {})
    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatchObject({
      name: 'luna',
      model: 'openai/gpt-5.6-luna',
      status: 'active',
      workload: 0,
      maxWorkload: 5,
    })

    const loaded = await getAgentByName(ctx, { name: 'luna' })
    expect(loaded).toMatchObject({
      status: 'active',
      workload: 0,
      maxWorkload: 5,
    })
  })
})

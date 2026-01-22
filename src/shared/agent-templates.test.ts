import { describe, it, expectTypeOf } from 'vitest'
import type {
  AgentTemplate,
  AgentTemplatesResponse,
  AgentTemplatesUpdateRequest,
} from './agent-templates'

describe('agent template types', () => {
  it('supports template request and response shapes', () => {
    const template: AgentTemplate = { name: 'Codex', command: 'codex --task \"{{task}}\"' }
    const response: AgentTemplatesResponse = { ok: true, templates: [template] }
    const request: AgentTemplatesUpdateRequest = { templates: [template] }

    expectTypeOf(template).toMatchTypeOf<AgentTemplate>()
    expectTypeOf(response).toMatchTypeOf<AgentTemplatesResponse>()
    expectTypeOf(request).toMatchTypeOf<AgentTemplatesUpdateRequest>()
  })
})

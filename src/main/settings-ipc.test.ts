import { describe, it, expect, vi } from 'vitest'
import type {
  AgentTemplatesResponse,
  AgentTemplatesUpdateResponse,
} from '../shared/agent-templates'
import { createSettingsHandlers } from './settings-ipc'

describe('settings ipc handlers', () => {
  it('returns agent templates from the loader', () => {
    const loadTemplates = vi.fn<[], AgentTemplatesResponse>(() => ({
      ok: true,
      templates: [{ name: 'Codex', command: 'codex --task \"{{task}}\"' }],
    }))
    const saveTemplates = vi.fn<[], AgentTemplatesUpdateResponse>(() => ({ ok: true }))
    const handlers = createSettingsHandlers({ loadTemplates, saveTemplates })

    const response = handlers.getAgentTemplates()

    expect(response.ok).toBe(true)
    expect(loadTemplates).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid template payloads', () => {
    const loadTemplates = vi.fn<[], AgentTemplatesResponse>(() => ({
      ok: true,
      templates: [],
    }))
    const saveTemplates = vi.fn<[], AgentTemplatesUpdateResponse>(() => ({ ok: true }))
    const handlers = createSettingsHandlers({ loadTemplates, saveTemplates })

    const response = handlers.setAgentTemplates({} as unknown, {
      templates: [{ name: '', command: 'codex --task \"{{task}}\"' }],
    })

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('invalid_template')
    }
    expect(saveTemplates).not.toHaveBeenCalled()
  })

  it('persists valid template payloads', () => {
    const loadTemplates = vi.fn<[], AgentTemplatesResponse>(() => ({
      ok: true,
      templates: [],
    }))
    const saveTemplates = vi.fn<[], AgentTemplatesUpdateResponse>(() => ({ ok: true }))
    const handlers = createSettingsHandlers({ loadTemplates, saveTemplates })

    const response = handlers.setAgentTemplates({} as unknown, {
      templates: [{ name: 'Codex', command: 'codex --task \"{{task}}\"' }],
    })

    expect(response.ok).toBe(true)
    expect(saveTemplates).toHaveBeenCalledTimes(1)
  })
})

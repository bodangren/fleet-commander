import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentTemplatesPanel } from './AgentTemplatesPanel'

describe('AgentTemplatesPanel', () => {
  beforeEach(() => {
    window.settingsApi = {
      getAgentTemplates: vi.fn(),
      setAgentTemplates: vi.fn(),
    }
  })

  it('renders templates from settings API', async () => {
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [
        { name: 'Codex', command: 'codex --task \"{{task}}\"' },
        { name: 'Claude', command: 'claude --task \"{{task}}\"' },
      ],
    })

    render(<AgentTemplatesPanel />)

    expect(await screen.findByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('codex --task \"{{task}}\"')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
    expect(screen.getByText('claude --task \"{{task}}\"')).toBeInTheDocument()
    expect(screen.getByTestId('settings-templates-list')).toBeInTheDocument()
  })

  it('renders an empty state when no templates are available', async () => {
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [],
    })

    render(<AgentTemplatesPanel />)

    expect(await screen.findByTestId('settings-templates-empty')).toBeInTheDocument()
    expect(screen.getByText('No agent templates yet. Add one to get started.')).toBeInTheDocument()
  })
})

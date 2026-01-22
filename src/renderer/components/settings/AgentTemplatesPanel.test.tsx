import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentTemplatesPanel } from './AgentTemplatesPanel'

describe('AgentTemplatesPanel', () => {
  beforeEach(() => {
    window.settingsApi = {
      getAgentTemplates: vi.fn(),
      setAgentTemplates: vi.fn(),
    }
    window.confirm = vi.fn().mockReturnValue(true)
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

  it('blocks saving when required fields are missing', async () => {
    const user = userEvent.setup()
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [],
    })
    const setAgentTemplates = vi.fn().mockResolvedValue({ ok: true })
    window.settingsApi.setAgentTemplates = setAgentTemplates

    render(<AgentTemplatesPanel />)

    await screen.findByTestId('settings-templates-empty')
    await user.click(screen.getByRole('button', { name: 'Add template' }))
    await user.click(screen.getByRole('button', { name: 'Save template' }))

    expect(setAgentTemplates).not.toHaveBeenCalled()
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Command is required.')).toBeInTheDocument()
  })

  it('blocks saving when command is missing the task placeholder', async () => {
    const user = userEvent.setup()
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [],
    })
    const setAgentTemplates = vi.fn().mockResolvedValue({ ok: true })
    window.settingsApi.setAgentTemplates = setAgentTemplates

    render(<AgentTemplatesPanel />)

    await screen.findByTestId('settings-templates-empty')
    await user.click(screen.getByRole('button', { name: 'Add template' }))

    await user.type(screen.getByLabelText('Template name'), 'Codex')
    fireEvent.change(screen.getByLabelText('Command'), {
      target: { value: 'codex --task \"task\"' },
    })
    await user.click(screen.getByRole('button', { name: 'Save template' }))

    expect(setAgentTemplates).not.toHaveBeenCalled()
    expect(screen.getByText('Command must include {{task}}.')).toBeInTheDocument()
  })

  it('adds a new template and saves', async () => {
    const user = userEvent.setup()
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [],
    })
    const setAgentTemplates = vi.fn().mockResolvedValue({ ok: true })
    window.settingsApi.setAgentTemplates = setAgentTemplates

    render(<AgentTemplatesPanel />)

    await screen.findByTestId('settings-templates-empty')
    await user.click(screen.getByRole('button', { name: 'Add template' }))

    await user.type(screen.getByLabelText('Template name'), 'Codex')
    fireEvent.change(screen.getByLabelText('Command'), {
      target: { value: 'codex --task \"{{task}}\"' },
    })

    await user.click(screen.getByRole('button', { name: 'Save template' }))

    expect(setAgentTemplates).toHaveBeenCalledWith({
      templates: [{ name: 'Codex', command: 'codex --task \"{{task}}\"' }],
    })
    expect(await screen.findByText('Codex')).toBeInTheDocument()
  })

  it('edits an existing template and saves', async () => {
    const user = userEvent.setup()
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [{ name: 'Codex', command: 'codex --task \"{{task}}\"' }],
    })
    const setAgentTemplates = vi.fn().mockResolvedValue({ ok: true })
    window.settingsApi.setAgentTemplates = setAgentTemplates

    render(<AgentTemplatesPanel />)

    await screen.findByText('Codex')
    await user.click(screen.getByRole('button', { name: 'Edit template Codex' }))

    const nameInput = screen.getByLabelText('Template name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Codex Updated')

    await user.click(screen.getByRole('button', { name: 'Save template' }))

    expect(setAgentTemplates).toHaveBeenCalledWith({
      templates: [{ name: 'Codex Updated', command: 'codex --task \"{{task}}\"' }],
    })
    expect(await screen.findByText('Codex Updated')).toBeInTheDocument()
  })

  it('deletes a template and saves when confirmed', async () => {
    const user = userEvent.setup()
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [
        { name: 'Codex', command: 'codex --task \"{{task}}\"' },
        { name: 'Claude', command: 'claude --task \"{{task}}\"' },
      ],
    })
    const setAgentTemplates = vi.fn().mockResolvedValue({ ok: true })
    window.settingsApi.setAgentTemplates = setAgentTemplates

    render(<AgentTemplatesPanel />)

    await screen.findByText('Codex')
    await user.click(screen.getByRole('button', { name: 'Delete template Codex' }))

    expect(window.confirm).toHaveBeenCalledWith('Delete template "Codex"?')
    expect(setAgentTemplates).toHaveBeenCalledWith({
      templates: [{ name: 'Claude', command: 'claude --task \"{{task}}\"' }],
    })
    expect(screen.queryByText('Codex')).not.toBeInTheDocument()
  })

  it('does not delete a template when confirmation is canceled', async () => {
    const user = userEvent.setup()
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [{ name: 'Codex', command: 'codex --task \"{{task}}\"' }],
    })
    const setAgentTemplates = vi.fn().mockResolvedValue({ ok: true })
    window.settingsApi.setAgentTemplates = setAgentTemplates
    window.confirm = vi.fn().mockReturnValue(false)

    render(<AgentTemplatesPanel />)

    await screen.findByText('Codex')
    await user.click(screen.getByRole('button', { name: 'Delete template Codex' }))

    expect(setAgentTemplates).not.toHaveBeenCalled()
    expect(screen.getByText('Codex')).toBeInTheDocument()
  })

  it('reorders templates and saves', async () => {
    const user = userEvent.setup()
    window.settingsApi.getAgentTemplates = vi.fn().mockResolvedValue({
      ok: true,
      templates: [
        { name: 'Codex', command: 'codex --task \"{{task}}\"' },
        { name: 'Claude', command: 'claude --task \"{{task}}\"' },
      ],
    })
    const setAgentTemplates = vi.fn().mockResolvedValue({ ok: true })
    window.settingsApi.setAgentTemplates = setAgentTemplates

    render(<AgentTemplatesPanel />)

    await screen.findByText('Codex')
    await user.click(screen.getByRole('button', { name: 'Move template Claude up' }))

    expect(setAgentTemplates).toHaveBeenCalledWith({
      templates: [
        { name: 'Claude', command: 'claude --task \"{{task}}\"' },
        { name: 'Codex', command: 'codex --task \"{{task}}\"' },
      ],
    })
  })
})

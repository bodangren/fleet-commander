/**
 * Integration tests for the "Create from Template" flow modal (Phase 3).
 *
 * The Create-from-Template flow lives in a modal surfaced from the
 * "New Project" action. It allows the user to:
 *   - Pick a template from a dropdown (or empty for blank project)
 *   - Enter a project name
 *   - Submit, which calls the `instantiateProject` mutation with
 *     `{ templateId, projectName }`
 *
 * The test strategy says:
 *   "'Create from Template' flow: mock mutation, verify correct args passed
 *    (template ID + project name)."
 *
 * These tests are written first (Red phase) so the modal implementation has a
 * clear, testable contract.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { CreateProjectFromTemplateModal } from '@/components/CreateProjectFromTemplateModal'
import type { TemplateOption } from '@/components/CreateProjectFromTemplateModal'

const templates: TemplateOption[] = [
  {
    _id: 'projectTemplates-1',
    name: 'Web App (Next.js)',
    category: 'Web App',
    taskCount: 3,
    estimatedBudget: 47.25,
  },
  {
    _id: 'projectTemplates-2',
    name: 'API Service (Bun/Hono)',
    category: 'API Service',
    taskCount: 3,
    estimatedBudget: 18.9,
  },
  {
    _id: 'projectTemplates-3',
    name: 'Python CLI',
    category: 'CLI',
    taskCount: 3,
    estimatedBudget: 10.5,
  },
]

function renderModal(
  overrides: {
    onClose?: () => void
    onCreate?: (args: { templateId: string | null; projectName: string }) => void | Promise<void>
    templates?: TemplateOption[]
    loading?: boolean
    error?: string | null
  } = {},
) {
  const onClose = overrides.onClose ?? vi.fn()
  const onCreate = overrides.onCreate ?? vi.fn()
  return {
    onClose,
    onCreate,
    ...render(
      <CreateProjectFromTemplateModal
        templates={overrides.templates ?? templates}
        loading={overrides.loading ?? false}
        error={overrides.error ?? null}
        onClose={onClose}
        onCreate={onCreate}
      />,
    ),
  }
}

describe('CreateProjectFromTemplateModal', () => {
  it('renders the modal title', () => {
    renderModal()
    expect(screen.getByRole('heading', { name: /create.*project/i })).toBeInTheDocument()
  })

  it('renders a project name input', () => {
    renderModal()
    expect(screen.getByRole('textbox', { name: /project name/i })).toBeInTheDocument()
  })

  it('renders a template selector with an "Empty project" option and one option per template', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /template/i }) as HTMLSelectElement
    const labels = Array.from(select.options).map(o => o.textContent)
    expect(labels[0]).toMatch(/empty|blank|none/i)
    expect(labels).toContain('Web App (Next.js)')
    expect(labels).toContain('API Service (Bun/Hono)')
    expect(labels).toContain('Python CLI')
  })

  it('defaults the template selector to the empty-project option', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /template/i }) as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('renders a Cancel button that invokes onClose', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables the submit button when the project name is empty', () => {
    renderModal()
    const submit = screen.getByRole('button', { name: /create/i })
    expect(submit).toBeDisabled()
  })

  it('enables the submit button when the project name is non-empty', () => {
    renderModal()
    fireEvent.change(screen.getByRole('textbox', { name: /project name/i }), {
      target: { value: 'My App' },
    })
    expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled()
  })

  it('invokes onCreate with templateId=null and projectName when "Empty project" is selected', () => {
    const { onCreate } = renderModal()
    fireEvent.change(screen.getByRole('textbox', { name: /project name/i }), {
      target: { value: 'My Blank Project' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      templateId: null,
      projectName: 'My Blank Project',
    })
  })

  it('invokes onCreate with the selected templateId and projectName when a template is chosen', () => {
    const { onCreate } = renderModal()
    fireEvent.change(screen.getByRole('textbox', { name: /project name/i }), {
      target: { value: 'My Next.js App' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /template/i }), {
      target: { value: 'projectTemplates-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      templateId: 'projectTemplates-1',
      projectName: 'My Next.js App',
    })
  })

  it('trims the project name before passing to onCreate', () => {
    const { onCreate } = renderModal()
    fireEvent.change(screen.getByRole('textbox', { name: /project name/i }), {
      target: { value: '   Padded Name   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(onCreate).toHaveBeenCalledWith({
      templateId: null,
      projectName: 'Padded Name',
    })
  })

  it('displays the chosen template summary (task count + budget) when a template is selected', () => {
    renderModal()
    fireEvent.change(screen.getByRole('combobox', { name: /template/i }), {
      target: { value: 'projectTemplates-1' },
    })
    expect(screen.getByText(/3\s+tasks?/i)).toBeInTheDocument()
    expect(screen.getByText(/\$47\.25/)).toBeInTheDocument()
  })

  it('renders a loading state while templates are loading', () => {
    renderModal({ templates: [], loading: true })
    expect(screen.getByText(/loading.*templates/i)).toBeInTheDocument()
  })

  it('displays an error message when error is provided', () => {
    renderModal({ error: 'Could not load templates' })
    expect(screen.getByText('Could not load templates')).toBeInTheDocument()
  })
})

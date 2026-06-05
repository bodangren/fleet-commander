/**
 * Integration tests for the "Save as Template" modal (Phase 3).
 *
 * The Save-as-Template flow is an action on a project's settings page that
 * derives a reusable `ProjectTemplate` from the current project via
 * `extractTemplateFromProject` (strips runtime fields, anonymizes agents).
 *
 * The modal exposes a small form (template name, category, description) and
 * calls the `createProjectTemplate` mutation with the stripped template
 * payload on submit.
 *
 * The test strategy says:
 *   "'Save as Template' flow: mock mutation, verify content stripping matches
 *    extractTemplateFromProject output."
 *
 * These tests are written first (Red phase) so the modal implementation has a
 * clear, testable contract.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { SaveAsTemplateModal } from '@/components/SaveAsTemplateModal'
import type { SaveAsTemplateSource, SaveAsTemplatePayload } from '@/components/SaveAsTemplateModal'

const sampleSource: SaveAsTemplateSource = {
  project: {
    _id: 'projects-1',
    name: 'Internal Reports',
    description: 'A weekly reporting dashboard',
  },
  tasks: [
    {
      _id: 'tasks-1',
      title: 'Pull data from warehouse',
      storyPoints: 3,
      priority: 'medium',
      status: 'backlog',
    },
    {
      _id: 'tasks-2',
      title: 'Render charts',
      storyPoints: 5,
      priority: 'medium',
      status: 'backlog',
      dependencies: ['Pull data from warehouse'],
    },
  ],
  agents: [
    {
      _id: 'agents-1',
      name: 'alice',
      role: 'architect',
      model: 'claude-opus',
      skills: ['system-design', 'typescript'],
      costPerPoint: 4.2,
    },
    {
      _id: 'agents-2',
      name: 'bob',
      role: 'executor',
      model: 'claude-sonnet',
      skills: ['typescript', 'react'],
      costPerPoint: 2.1,
    },
  ],
}

function renderModal(
  overrides: {
    source?: SaveAsTemplateSource
    onClose?: () => void
    onSave?: (payload: SaveAsTemplatePayload) => void | Promise<void>
    saving?: boolean
    error?: string | null
  } = {},
) {
  const onClose = overrides.onClose ?? vi.fn()
  const onSave = overrides.onSave ?? vi.fn()
  return {
    onClose,
    onSave,
    ...render(
      <SaveAsTemplateModal
        source={overrides.source ?? sampleSource}
        saving={overrides.saving ?? false}
        error={overrides.error ?? null}
        onClose={onClose}
        onSave={onSave}
      />,
    ),
  }
}

describe('SaveAsTemplateModal', () => {
  it('renders the modal title', () => {
    renderModal()
    expect(screen.getByRole('heading', { name: /save.*as.*template/i })).toBeInTheDocument()
  })

  it('pre-fills the template name from the source project name', () => {
    renderModal()
    const nameInput = screen.getByRole('textbox', { name: /template name/i }) as HTMLInputElement
    expect(nameInput.value).toBe('Internal Reports')
  })

  it('pre-fills the description from the source project description', () => {
    renderModal()
    const descInput = screen.getByRole('textbox', { name: /description/i }) as HTMLInputElement
    expect(descInput.value).toBe('A weekly reporting dashboard')
  })

  it('renders a category selector', () => {
    renderModal()
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument()
  })

  it('exposes the spec-required category options plus an Other fallback', () => {
    renderModal()
    const select = screen.getByRole('combobox', { name: /category/i }) as HTMLSelectElement
    const labels = Array.from(select.options).map(o => o.textContent)
    expect(labels).toContain('Web App')
    expect(labels).toContain('API Service')
    expect(labels).toContain('CLI')
    expect(labels).toContain('Documentation')
    expect(labels).toContain('Other')
  })

  it('shows a summary of what will be saved: task count + agent count + estimated budget', () => {
    renderModal()
    expect(screen.getByText(/2\s+tasks?/i)).toBeInTheDocument()
    expect(screen.getByText(/2\s+(default\s+)?agents?/i)).toBeInTheDocument()
  })

  it('disables the Save button until a non-empty template name is provided', () => {
    renderModal()
    const saveButton = screen.getByRole('button', { name: /^save$/i })
    // Default name comes from the project, so the button should be enabled.
    expect(saveButton).not.toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: /template name/i }), {
      target: { value: '' },
    })
    expect(saveButton).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: /template name/i }), {
      target: { value: 'Weekly Reports Template' },
    })
    expect(saveButton).not.toBeDisabled()
  })

  it('invokes onSave with the stripped template payload on submit', () => {
    const { onSave } = renderModal()

    fireEvent.change(screen.getByRole('textbox', { name: /template name/i }), {
      target: { value: 'Weekly Reports Template' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), {
      target: { value: 'Stripped desc' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /category/i }), {
      target: { value: 'Other' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const payload = onSave.mock.calls[0][0] as SaveAsTemplatePayload
    expect(payload.name).toBe('Weekly Reports Template')
    expect(payload.description).toBe('Stripped desc')
    expect(payload.category).toBe('Other')
    // Tasks must be structure-only: no description, no assigneeId, no sessionId, etc.
    expect(payload.tasks).toHaveLength(2)
    for (const t of payload.tasks) {
      expect(t).not.toHaveProperty('description')
      expect(t).not.toHaveProperty('assigneeId')
      expect(t).not.toHaveProperty('sessionId')
      expect(t).not.toHaveProperty('actualCost')
      expect(t).not.toHaveProperty('reviewerId')
      expect(t).not.toHaveProperty('mergerId')
      expect(t).toHaveProperty('title')
      expect(t).toHaveProperty('storyPoints')
      expect(t).toHaveProperty('priority')
      expect(t).toHaveProperty('status')
    }
    // Default agents must be anonymized: no `name` field.
    expect(payload.defaultAgents).toHaveLength(2)
    for (const a of payload.defaultAgents) {
      expect(a).not.toHaveProperty('name')
      expect(a).toHaveProperty('role')
      expect(a).toHaveProperty('model')
      expect(a).toHaveProperty('skills')
      expect(a).toHaveProperty('costPerPoint')
    }
  })

  it('preserves task dependencies in the stripped payload', () => {
    const { onSave } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const payload = onSave.mock.calls[0][0] as SaveAsTemplatePayload
    const dependent = payload.tasks.find(t => t.title === 'Render charts')
    expect(dependent?.dependencies).toEqual(['Pull data from warehouse'])
  })

  it('trims the template name before passing to onSave', () => {
    const { onSave } = renderModal()

    fireEvent.change(screen.getByRole('textbox', { name: /template name/i }), {
      target: { value: '   Padded   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const payload = onSave.mock.calls[0][0] as SaveAsTemplatePayload
    expect(payload.name).toBe('Padded')
  })

  it('computes an estimatedBudget via recommendBudget (sum of points * avg agent cost/point)', () => {
    const { onSave } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const payload = onSave.mock.calls[0][0] as SaveAsTemplatePayload
    // 2 tasks: 3 + 5 = 8 points
    // 2 agents: costPerPoint = 4.2 + 2.1 = 6.3, avg = 3.15
    // 8 * 3.15 = 25.20
    expect(payload.estimatedBudget).toBeCloseTo(25.2, 2)
  })

  it('renders a Cancel button that invokes onClose', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('displays an error message when error is provided', () => {
    renderModal({ error: 'Failed to save template' })
    expect(screen.getByText('Failed to save template')).toBeInTheDocument()
  })

  it('disables the Save button while saving', () => {
    renderModal({ saving: true })
    expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled()
  })
})

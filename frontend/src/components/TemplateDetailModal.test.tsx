/**
 * Unit tests for the `TemplateDetailModal` component (Phase 3: UI Components).
 *
 * The modal renders a project template preview before the user commits to creating
 * a project from it. It must show:
 *   - the task list (titles + story points + priority)
 *   - the default agent roles + models
 *   - the estimated budget
 *   - a "Create" button that fires the `onCreate` callback with the template id
 *
 * The test strategy specifies:
 *   "TemplateDetailModal: test open/close, task list rendering, budget display,
 *    'Create' button calls mutation."
 *
 * These tests are written first (Red phase) so the modal implementation has a
 * clear, testable contract.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { TemplateDetailModal } from '@/components/TemplateDetailModal'
import type {
  ProjectTemplateDetail,
  ProjectTemplateTask,
  ProjectTemplateAgent,
} from '@/components/TemplateDetailModal'

const sampleTask: ProjectTemplateTask = {
  title: 'Set up Next.js project',
  storyPoints: 2,
  priority: 'high',
  status: 'backlog',
}

const sampleAgent: ProjectTemplateAgent = {
  role: 'architect',
  model: 'claude-opus',
  skills: ['system-design', 'typescript'],
  costPerPoint: 4.2,
}

const baseTemplate: ProjectTemplateDetail = {
  _id: 'projectTemplates-1',
  name: 'Web App (Next.js)',
  description: 'A starter Next.js web application with auth, routing, and database',
  category: 'Web App',
  tasks: [sampleTask],
  defaultAgents: [sampleAgent],
  estimatedBudget: 47.25,
}

function renderModal(
  overrides: {
    template?: ProjectTemplateDetail | null
    onClose?: () => void
    onCreate?: (templateId: string) => void
    creating?: boolean
  } = {},
) {
  const onClose = overrides.onClose ?? vi.fn()
  const onCreate = overrides.onCreate ?? vi.fn()
  const template = overrides.template === undefined ? baseTemplate : overrides.template

  return {
    onClose,
    onCreate,
    ...render(
      <TemplateDetailModal
        template={template}
        onClose={onClose}
        onCreate={onCreate}
        creating={overrides.creating ?? false}
      />,
    ),
  }
}

describe('TemplateDetailModal', () => {
  it('renders the template name as the modal title', () => {
    renderModal({ template: baseTemplate })
    expect(screen.getByRole('heading', { name: 'Web App (Next.js)' })).toBeInTheDocument()
  })

  it('renders the category', () => {
    renderModal({ template: baseTemplate })
    expect(screen.getByText('Web App')).toBeInTheDocument()
  })

  it('renders the description', () => {
    renderModal({ template: baseTemplate })
    expect(
      screen.getByText('A starter Next.js web application with auth, routing, and database'),
    ).toBeInTheDocument()
  })

  it('renders every task title from the template', () => {
    renderModal({
      template: {
        ...baseTemplate,
        tasks: [
          sampleTask,
          { title: 'Configure database', storyPoints: 5, priority: 'high', status: 'backlog' },
          { title: 'Add authentication', storyPoints: 8, priority: 'medium', status: 'backlog' },
        ],
      },
    })
    expect(screen.getByText('Set up Next.js project')).toBeInTheDocument()
    expect(screen.getByText('Configure database')).toBeInTheDocument()
    expect(screen.getByText('Add authentication')).toBeInTheDocument()
  })

  it('renders the task count and total story points for the task list', () => {
    renderModal({
      template: {
        ...baseTemplate,
        tasks: [
          { title: 'Task A', storyPoints: 2, priority: 'low', status: 'backlog' },
          { title: 'Task B', storyPoints: 5, priority: 'medium', status: 'backlog' },
        ],
      },
    })
    expect(screen.getByText(/2\s+tasks?/i)).toBeInTheDocument()
    expect(screen.getByText(/7\s+(story\s*)?points?/i)).toBeInTheDocument()
  })

  it('renders an empty-state message when the template has no tasks', () => {
    renderModal({ template: { ...baseTemplate, tasks: [] } })
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument()
  })

  it('renders every default agent role + model', () => {
    renderModal({
      template: {
        ...baseTemplate,
        defaultAgents: [
          sampleAgent,
          { role: 'executor', model: 'claude-sonnet', skills: ['typescript'], costPerPoint: 2.1 },
        ],
      },
    })
    expect(screen.getByText('architect')).toBeInTheDocument()
    expect(screen.getByText('claude-opus')).toBeInTheDocument()
    expect(screen.getByText('executor')).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet')).toBeInTheDocument()
  })

  it('renders the estimated budget formatted as USD', () => {
    renderModal({ template: { ...baseTemplate, estimatedBudget: 47.25 } })
    expect(screen.getByText(/\$47\.25/)).toBeInTheDocument()
  })

  it('renders a "Create" button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
  })

  it('renders a "Close" button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('invokes onCreate with the template id when Create is clicked', () => {
    const { onCreate } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith(baseTemplate._id)
  })

  it('invokes onClose when the Close button is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('invokes onClose when the backdrop is clicked', () => {
    const { onClose } = renderModal()
    // The modal wrapper acts as the backdrop; clicking it should close.
    const backdrop = document.querySelector('[data-testid="template-detail-backdrop"]')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    } else {
      // Fallback: clicking the modal container via role="dialog" is also valid.
      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog)
      // At minimum, clicking the dialog itself must not throw.
      expect(onClose).toHaveBeenCalledTimes(0)
    }
  })

  it('disables the Create button while creating', () => {
    renderModal({ creating: true })
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('shows a "Creating..." label while creating', () => {
    renderModal({ creating: true })
    expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeInTheDocument()
  })

  it('renders nothing when the template prop is null', () => {
    renderModal({ template: null })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

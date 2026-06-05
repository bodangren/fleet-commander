/**
 * Unit tests for the `TemplateCard` component (Phase 3: UI Components).
 *
 * TemplateCard renders a single project template summary inside the gallery:
 *   - template name
 *   - category badge
 *   - task count
 *   - estimated budget
 *
 * The test strategy mandates snapshot + prop-based assertions:
 *   "TemplateCard: snapshot + prop-based assertions (name, category, taskCount, budget display)."
 *
 * These tests are written first (Red phase) so the component implementation has a
 * clear, testable contract.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { TemplateCard } from '@/components/TemplateCard'
import type { ProjectTemplateSummary } from '@/components/TemplateCard'

const baseTemplate: ProjectTemplateSummary = {
  _id: 'projectTemplates-1',
  name: 'Web App (Next.js)',
  description: 'A starter Next.js web application with auth, routing, and database',
  category: 'Web App',
  taskCount: 3,
  estimatedBudget: 47.25,
}

function renderCard(overrides: Partial<ProjectTemplateSummary> = {}) {
  const template = { ...baseTemplate, ...overrides }
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TemplateCard template={template} />
    </MemoryRouter>,
  )
}

describe('TemplateCard', () => {
  it('renders without crashing', () => {
    expect(() => renderCard()).not.toThrow()
  })

  it('renders the template name', () => {
    renderCard({ name: 'API Service (Bun/Hono)' })
    expect(screen.getByText('API Service (Bun/Hono)')).toBeInTheDocument()
  })

  it('renders the category badge', () => {
    renderCard({ category: 'API Service' })
    expect(screen.getByText('API Service')).toBeInTheDocument()
  })

  it('renders the task count summary', () => {
    renderCard({ taskCount: 5 })
    expect(screen.getByText(/5\s+tasks?/i)).toBeInTheDocument()
  })

  it('renders the estimated budget formatted as USD', () => {
    renderCard({ estimatedBudget: 47.25 })
    expect(screen.getByText(/\$47\.25/)).toBeInTheDocument()
  })

  it('renders a singular label when taskCount is 1', () => {
    renderCard({ taskCount: 1 })
    expect(screen.getByText(/1\s+task\b/i)).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    renderCard({
      description: 'A command-line tool built with Python and Click',
    })
    expect(screen.getByText('A command-line tool built with Python and Click')).toBeInTheDocument()
  })

  it('renders "No description" placeholder when description is empty', () => {
    renderCard({ description: '' })
    expect(screen.getByText(/no description/i)).toBeInTheDocument()
  })

  it('invokes the optional onSelect callback when the card is clicked', () => {
    const onSelect = vi.fn()
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TemplateCard template={baseTemplate} onSelect={onSelect} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /web app \(next\.js\)/i }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(baseTemplate._id)
  })
})

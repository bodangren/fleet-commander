/**
 * Unit tests for the sidebar navigation (Phase 3: add Templates link).
 *
 * The test strategy says:
 *   "Navigation: assert Templates link appears in sidebar."
 *
 * The Project Template Marketplace exposes a `/templates` gallery route. The
 * sidebar in `AppLayout` should include a link to it. The existing
 * `/agent-templates` link is labeled "Templates" inside the Team section, so
 * the new project-template link is placed in a contextually appropriate
 * section (Work or Team) with a label that disambiguates it
 * (e.g. "Project Templates").
 *
 * These tests are written first (Red phase) so the navigation update has a
 * clear, testable contract.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AppLayout } from '@/layout/AppLayout'

function renderLayout(initialPath = '/') {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[initialPath]}
    >
      <AppLayout healthStatus="ok" loading={false} onRefresh={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('AppLayout — sidebar navigation', () => {
  it('renders a Project Templates link pointing to /templates', () => {
    renderLayout()
    const link = screen.getByRole('link', { name: /project templates/i })
    expect(link).toHaveAttribute('href', '/templates')
  })

  it('keeps the existing Agent Templates link under /agent-templates', () => {
    renderLayout()
    const agentTemplates = screen.getByRole('link', { name: /^templates$/i })
    expect(agentTemplates).toHaveAttribute('href', '/agent-templates')
  })

  it('marks the Project Templates link as active when on /templates', () => {
    renderLayout('/templates')
    const link = screen.getByRole('link', { name: /project templates/i })
    expect(link.className).toMatch(/bg-\[#0f1011\]/)
  })

  it('does not mark the Project Templates link as active on a different route', () => {
    renderLayout('/portfolio')
    const link = screen.getByRole('link', { name: /project templates/i })
    expect(link.className).not.toMatch(/bg-\[#0f1011\]/)
  })

  it('renders the Project Templates link inside the sidebar <aside>', () => {
    const { container } = renderLayout()
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    const link = screen.getByRole('link', { name: /project templates/i })
    expect(aside!.contains(link)).toBe(true)
  })

  it('sets the page title to "Project Templates" when on /templates', () => {
    renderLayout('/templates')
    const headers = screen.getAllByText('Project Templates')
    expect(headers.length).toBeGreaterThan(0)
  })
})

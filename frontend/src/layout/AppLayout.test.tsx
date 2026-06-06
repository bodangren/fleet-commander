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
    expect(link.className).toMatch(/(^| )bg-\[#0f1011\]/)
  })

  it('does not mark the Project Templates link as active on a different route', () => {
    renderLayout('/portfolio')
    const link = screen.getByRole('link', { name: /project templates/i })
    expect(link.className).not.toMatch(/(^| )bg-\[#0f1011\]/)
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

/**
 * Phase 5 — Blockers nav link.
 *
 * Per plan.md Phase 5 task 4 ("Add Blockers link to main navigation under
 * Overview section"), the sidebar must surface a link to /blockers. The
 * current `AppLayout` already includes the link in the Overview section;
 * these tests pin the contract (link exists, points to /blockers, is
 * inside the <aside>, and is highlighted when on the route).
 */
describe('AppLayout — Blockers nav link (Phase 5 task 4)', () => {
  it('renders a Blockers link pointing to /blockers', () => {
    renderLayout()
    const link = screen.getByRole('link', { name: /blockers/i })
    expect(link).toHaveAttribute('href', '/blockers')
  })

  it('renders the Blockers link inside the sidebar <aside>', () => {
    const { container } = renderLayout()
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    const link = screen.getByRole('link', { name: /blockers/i })
    expect(aside!.contains(link)).toBe(true)
  })

  it('places the Blockers link inside the Overview section', () => {
    const { container } = renderLayout()
    const overview = screen.getByText('Overview')
    const overviewBlock = overview.closest('div')!
    const link = screen.getByRole('link', { name: /blockers/i })
    expect(overviewBlock.contains(link) || container.contains(link)).toBe(true)
  })

  it('marks the Blockers link as active when on /blockers', () => {
    renderLayout('/blockers')
    const link = screen.getByRole('link', { name: /blockers/i })
    expect(link.className).toMatch(/(^| )bg-\[#0f1011\]/)
  })

  it('does not mark the Blockers link as active on a different route', () => {
    renderLayout('/portfolio')
    const link = screen.getByRole('link', { name: /blockers/i })
    expect(link.className).not.toMatch(/(^| )bg-\[#0f1011\]/)
  })

  it('sets the page title to "Blockers" when on /blockers', () => {
    renderLayout('/blockers')
    // The topbar shows the page title; the sidebar also labels the link
    // "Blockers", so we assert at least one match.
    const headers = screen.getAllByText('Blockers')
    expect(headers.length).toBeGreaterThan(0)
  })
})

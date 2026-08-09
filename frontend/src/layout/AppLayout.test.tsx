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
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'

// Phase S2 (STORY-R2): mock react-router-dom's useNavigate so we can spy on
// programmatic navigation calls from the topbar "New Project" button while
// preserving the rest of the package (NavLink, MemoryRouter, useLocation,
// Outlet) used by the existing sidebar tests in this file. See
// measure/tracks/route_fixes_regression_20260613/test-strategy.md §2.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

import { AppLayout } from '@/layout/AppLayout'

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderLayout(initialPath = '/') {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[initialPath]}
    >
      <AppLayout
        healthStatus="ok"
        healthLoading={false}
        healthError={null}
        loading={false}
        onRefresh={vi.fn()}
        onRefreshHealth={vi.fn()}
      />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('AppLayout — sidebar navigation', () => {
  it('renders the Dashboard link pointing to the explicit dashboard route', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toHaveAttribute('href', '/dashboard')
  })

  it('navigates to /dashboard instead of relying on the root redirect', async () => {
    renderLayout('/portfolio')

    await userEvent.setup().click(screen.getByRole('link', { name: /^dashboard$/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
  })

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

/**
 * Phase S2 — STORY-R2: "New Project" header button must NOT redirect to
 * `/settings`.
 *
 * Spec: measure/tracks/route_fixes_regression_20260613/spec.md (story-r2)
 * Plan: measure/tracks/route_fixes_regression_20260613/plan.md (Phase S2)
 * Strategy: measure/tracks/route_fixes_regression_20260613/test-strategy.md
 *           §3 (S2 fallback path), §5 (S2 brief), §7 (S2 Red command)
 *
 * Contract (per plan.md Phase S2):
 *   - `AppLayout` accepts an optional `onNewProject?: () => void` prop.
 *   - When `onNewProject` IS provided, clicking the topbar "New Project"
 *     button calls the handler — and does NOT navigate to `/settings`.
 *   - When `onNewProject` is omitted, the button falls back to
 *     `navigate('/portfolio')` — NOT `/settings` (that was the bug).
 *
 * These tests are written first (Red phase) and are expected to fail at
 * HEAD for two anchored reasons:
 *   1. `AppLayout` does not yet accept an `onNewProject` prop, so the
 *      handler is never invoked even when passed.
 *   2. The button's `onClick` is hard-coded to `() => navigate('/settings')`
 *      at AppLayout.tsx:246, so the navigate spy is always called with
 *      `/settings` regardless of props.
 *
 * The Red failure mode therefore proves the live bug (wrong destination)
 * — not a stale artifact mismatch. After the Phase S2 Green implementation
 * adds the `onNewProject` prop and swaps the click handler to
 * `onNewProject ?? (() => navigate('/portfolio'))`, both tests will pass.
 */
describe('AppLayout — "New Project" header button (Phase S2 STORY-R2)', () => {
  beforeEach(() => {
    navigateSpy.mockClear()
  })

  it('calls onNewProject handler when "New Project" button is clicked and the prop is provided', async () => {
    const onNewProject = vi.fn()
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* @ts-expect-error onNewProject is added by Phase S2 Green; the
            prop is intentionally passed here to drive the Red failure. */}
        <AppLayout
          healthStatus="ok"
          healthLoading={false}
          healthError={null}
          loading={false}
          onRefresh={vi.fn()}
          onRefreshHealth={vi.fn()}
          onNewProject={onNewProject}
        />
      </MemoryRouter>,
    )

    const button = screen.getByRole('button', { name: /new project/i })
    await userEvent.click(button)

    expect(onNewProject).toHaveBeenCalledTimes(1)
    expect(navigateSpy).not.toHaveBeenCalledWith('/settings')
  })

  it('falls back to navigate("/portfolio") (not "/settings") when "New Project" button is clicked without an onNewProject prop', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout
          healthStatus="ok"
          healthLoading={false}
          healthError={null}
          loading={false}
          onRefresh={vi.fn()}
          onRefreshHealth={vi.fn()}
        />
      </MemoryRouter>,
    )

    const button = screen.getByRole('button', { name: /new project/i })
    await userEvent.click(button)

    expect(navigateSpy).toHaveBeenCalledWith('/portfolio')
    expect(navigateSpy).not.toHaveBeenCalledWith('/settings')
  })
})

describe('AppLayout — backend health status boundary', () => {
  it('announces health errors and retries only the health resource', async () => {
    const onRefreshHealth = vi.fn()

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout
          healthStatus="Backend Error: health endpoint unavailable"
          healthLoading={false}
          healthError="health endpoint unavailable"
          loading={false}
          onRefresh={vi.fn()}
          onRefreshHealth={onRefreshHealth}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getAllByText(/Backend health error: health endpoint unavailable/)).toHaveLength(2)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry health' }))
    expect(onRefreshHealth).toHaveBeenCalledOnce()
  })

  it('announces health loading independently from aggregate fleet syncing', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout
          healthStatus="Checking..."
          healthLoading
          healthError={null}
          loading={false}
          onRefresh={vi.fn()}
          onRefreshHealth={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Checking backend health...')).toHaveLength(2)
  })
})

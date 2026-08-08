import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    Outlet: () => <div data-testid="settings-outlet-mock" />,
  }
})

import { SettingsLayout } from './SettingsLayout'

/**
 * Wraps the layout in a MemoryRouter with a configurable initial entry so each
 * test can probe a different active route.
 */
function renderLayout(initialPath: string) {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <SettingsLayout />
    </MemoryRouter>,
  )
}

describe('SettingsLayout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders an Outlet so child sections appear next to the sidebar', () => {
    renderLayout('/settings/app')
    expect(screen.getByTestId('settings-outlet-mock')).toBeInTheDocument()
  })

  it('exposes the supported settings sub-routes in the sidebar nav', () => {
    renderLayout('/settings/app')

    // Application, agents, and profile remain user-configurable sections. We
    // probe by accessible nav name so the assertion survives Tailwind churn.
    const nav = screen.getByRole('navigation', { name: /settings sections/i })
    expect(within(nav).getByRole('link', { name: 'Application' })).toHaveAttribute(
      'href',
      '/settings/app',
    )
    expect(within(nav).getByRole('link', { name: /agents/i })).toHaveAttribute(
      'href',
      '/settings/agents',
    )
    expect(within(nav).getByRole('link', { name: /profile/i })).toHaveAttribute(
      'href',
      '/settings/profile',
    )
  })

  it('marks the active sub-route with the highlighted NavLink class', () => {
    renderLayout('/settings/agents')

    const agentsLink = screen.getByRole('link', { name: /agents/i })
    // The active style in SettingsLayout is `bg-cyan-500/10 text-cyan-200
    // border border-cyan-400/30`. Assert the presence of the active class
    // family without coupling to the exact Tailwind output.
    expect(agentsLink.className).toMatch(/bg-cyan-500/)
    expect(agentsLink.className).toMatch(/text-cyan-200/)

    // Sibling links must NOT carry the active highlight.
    const appLink = screen.getByRole('link', { name: 'Application' })
    expect(appLink.className).not.toMatch(/bg-cyan-500/)
  })

  it('marks the profile sub-route as active when /settings/profile is matched', () => {
    renderLayout('/settings/profile')

    const profileLink = screen.getByRole('link', { name: /profile/i })
    expect(profileLink.className).toMatch(/bg-cyan-500/)
  })
})

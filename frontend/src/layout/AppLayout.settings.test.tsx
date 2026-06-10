/**
 * Phase 4: Delete God-File + Wire Routes — sidebar Settings link contract.
 *
 * Spec: measure/tracks/settings_page_refactor_20260610/spec.md
 * Plan: measure/tracks/settings_page_refactor_20260610/plan.md (Phase 4)
 *
 * Phase 4 task 2: "Update `AppLayout` sidebar to link to `/settings`."
 *
 * The sidebar must surface a link to /settings so users can navigate from
 * any page into the settings subtree. This file pins the contract: the
 * link exists, points to /settings, lives inside the <aside> sidebar
 * element, and is highlighted when on a /settings* route.
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

describe('AppLayout — Phase 4: sidebar Settings link', () => {
  it('renders a Settings link pointing to /settings', () => {
    renderLayout()
    const link = screen.getByRole('link', { name: /^settings$/i })
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('renders the Settings link inside the sidebar <aside>', () => {
    const { container } = renderLayout()
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    const link = screen.getByRole('link', { name: /^settings$/i })
    expect(aside!.contains(link)).toBe(true)
  })

  it('places the Settings link inside the System section', () => {
    renderLayout()
    const systemLabel = screen.getByText('System')
    // The sidebar markup wraps each section as
    //   <div className="mt-2 ...">          ← outer section div
    //     <div className="px-5 py-2">       ← label container
    //       <span>{section.label}</span>     ← systemLabel
    //     </div>
    //     <div className="px-3 space-y-0.5"> ← items container
    //       <SidebarLink ... />
    //     </div>
    //   </div>
    // So the section's outer div is the grandparent of the <span>.
    const sectionBlock = systemLabel.parentElement!.parentElement!
    const link = screen.getByRole('link', { name: /^settings$/i })
    expect(sectionBlock.contains(link)).toBe(true)
  })

  it('marks the Settings link as active when on /settings', () => {
    renderLayout('/settings')
    const link = screen.getByRole('link', { name: /^settings$/i })
    // The active style is `bg-[#0f1011] text-[#f7f8f8]`. Match the
    // background colour family so the assertion survives Tailwind churn.
    expect(link.className).toMatch(/(^| )bg-\[#0f1011\]/)
  })

  it('marks the Settings link as active when on a /settings sub-route', () => {
    renderLayout('/settings/notifications')
    const link = screen.getByRole('link', { name: /^settings$/i })
    // React Router's NavLink matches on the `to` prop; with
    // <NavLink to="/settings"> a sub-route like /settings/notifications
    // also matches the parent so the active class is applied.
    expect(link.className).toMatch(/(^| )bg-\[#0f1011\]/)
  })

  it('does not mark the Settings link as active on a different route', () => {
    renderLayout('/portfolio')
    const link = screen.getByRole('link', { name: /^settings$/i })
    expect(link.className).not.toMatch(/(^| )bg-\[#0f1011\]/)
  })
})

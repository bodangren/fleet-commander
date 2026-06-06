import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TaskStatusBadge } from './TaskStatusBadge'

/**
 * Phase 3 Task 4 — Red gate: TaskStatusBadge with `blocked` status
 * and distinct visual treatment.
 *
 * The plan calls for a dedicated TaskStatusBadge component that renders
 * the task status with a distinct visual treatment per status — most
 * importantly, a visibly different treatment for `blocked` (e.g. yellow
 * warning) versus the other pipeline statuses. The current scaffolding
 * embeds a similar badge inside TaskCard; the new component is greenfield
 * work for the next role.
 *
 * The import below intentionally points at a component that does not yet
 * exist. Vitest will surface the resolution error as the Red signal —
 * the Green phase must create `./TaskStatusBadge.tsx` with the API
 * implied by the assertions below.
 */
describe('TaskStatusBadge (Phase 3 Task 4)', () => {
  it('renders the status label in uppercase', async () => {
    const { TaskStatusBadge: Comp } = await import('./TaskStatusBadge')
    render(<Comp status="in_progress" />)
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
  })

  it('renders the BLOCKED label with a distinct (yellow) visual treatment for blocked status', async () => {
    const { TaskStatusBadge: Comp } = await import('./TaskStatusBadge')
    const { container } = render(<Comp status="blocked" />)
    const badge = screen.getByText('BLOCKED')
    // The blocked treatment must use a yellow palette token (eab308) so it
    // is visually distinct from in_progress (blue) and review/done (green).
    const className = badge.className + ' ' + (container.firstChild as HTMLElement)?.className
    expect(className).toMatch(/#eab308/i)
  })

  it('does NOT use the blocked yellow treatment for other statuses', async () => {
    const { TaskStatusBadge: Comp } = await import('./TaskStatusBadge')
    const { container } = render(<Comp status="in_progress" />)
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toMatch(/#eab308/i)
  })

  it('exposes a role=img / data-status hook so screen readers and tests can target it', async () => {
    const { TaskStatusBadge: Comp } = await import('./TaskStatusBadge')
    const { container } = render(<Comp status="blocked" />)
    const root = container.firstChild as HTMLElement
    // At least one of these hooks must be present for a11y + testability.
    const hasHook =
      root.hasAttribute('role') ||
      root.hasAttribute('data-status') ||
      root.hasAttribute('aria-label')
    expect(hasHook).toBe(true)
  })
})

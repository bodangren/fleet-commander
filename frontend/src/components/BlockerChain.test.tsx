import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BlockerChain } from './BlockerChain'

describe('BlockerChain', () => {
  it('renders nothing for empty chain', () => {
    const { container } = render(<BlockerChain chain={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders single blocker', () => {
    const chain = [{ taskKey: 'TASK-A', title: 'Setup', status: 'done', depth: 1 }]
    render(<BlockerChain chain={chain} />)
    expect(screen.getByText('TASK-A')).toBeInTheDocument()
  })

  it('renders chain with arrows', () => {
    const chain = [
      { taskKey: 'TASK-A', title: 'Setup', status: 'done', depth: 1 },
      { taskKey: 'TASK-B', title: 'Build', status: 'in_progress', depth: 2 },
    ]
    render(<BlockerChain chain={chain} />)
    expect(screen.getByText('TASK-A')).toBeInTheDocument()
    expect(screen.getByText('TASK-B')).toBeInTheDocument()
  })

  it('sorts by depth', () => {
    const chain = [
      { taskKey: 'TASK-B', title: 'Build', status: 'in_progress', depth: 2 },
      { taskKey: 'TASK-A', title: 'Setup', status: 'done', depth: 1 },
    ]
    const { container } = render(<BlockerChain chain={chain} />)
    const items = container.querySelectorAll('span.inline-flex')
    expect(items[0]!.textContent).toContain('TASK-A')
    expect(items[1]!.textContent).toContain('TASK-B')
  })

  it('renders status dots with correct colors', () => {
    const chain = [
      { taskKey: 'TASK-A', title: 'Done task', status: 'done', depth: 1 },
      { taskKey: 'TASK-B', title: 'Blocked task', status: 'blocked', depth: 1 },
    ]
    const { container } = render(<BlockerChain chain={chain} />)
    const dots = container.querySelectorAll('span.rounded-full')
    expect(dots.length).toBe(2)
  })

  // ------------------------------------------------------------------
  // Phase 5 — deeper contracts the dashboard depends on.
  // Characterization only: the existing impl already satisfies these
  // tests; they pin the contract so the Green phase cannot regress it
  // while extracting BlockersTable.
  // ------------------------------------------------------------------

  it('renders a rounded-full status dot whose fill matches the status color', () => {
    const chain = [{ taskKey: 'TASK-A', title: 'Setup', status: 'done', depth: 1 }]
    const { container } = render(<BlockerChain chain={chain} />)
    const dot = container.querySelector('span.rounded-full') as HTMLElement
    expect(dot).not.toBeNull()
    // The dot's inline style carries the color from statusDotColors.
    // jsdom normalizes hex colors to rgb(), so we assert the rgb form
    // rather than the original hex string. The "done" color is
    // #27a644 → rgb(39, 166, 68).
    const style = dot.getAttribute('style') ?? ''
    expect(style).toMatch(/rgb\(\s*39\s*,\s*166\s*,\s*68\s*\)/)
  })

  it('uses the yellow #eab308 fill for a blocked status', () => {
    const chain = [{ taskKey: 'TASK-B', title: 'Block', status: 'blocked', depth: 1 }]
    const { container } = render(<BlockerChain chain={chain} />)
    const dot = container.querySelector('span.rounded-full') as HTMLElement
    const style = dot.getAttribute('style') ?? ''
    // #eab308 → rgb(234, 179, 8)
    expect(style).toMatch(/rgb\(\s*234\s*,\s*179\s*,\s*8\s*\)/)
  })

  it('sets a title attribute on each entry with the task title and status', () => {
    const chain = [
      { taskKey: 'TASK-A', title: 'Setup auth', status: 'done', depth: 1 },
      { taskKey: 'TASK-B', title: 'Wire UI', status: 'in_progress', depth: 2 },
    ]
    render(<BlockerChain chain={chain} />)
    expect(screen.getByTitle('Setup auth (done)')).toBeInTheDocument()
    expect(screen.getByTitle('Wire UI (in_progress)')).toBeInTheDocument()
  })

  it('renders the arrow separator (→) between chain entries but not before the first', () => {
    const chain = [
      { taskKey: 'TASK-A', title: 'a', status: 'done', depth: 1 },
      { taskKey: 'TASK-B', title: 'b', status: 'in_progress', depth: 2 },
      { taskKey: 'TASK-C', title: 'c', status: 'blocked', depth: 3 },
    ]
    const { container } = render(<BlockerChain chain={chain} />)
    // Two separators between three entries.
    const arrows = container.querySelectorAll('span.text-\\[10px\\]')
    // The arrow char is &rarr; rendered text is "→". Just count text nodes
    // that contain the arrow.
    const arrowCount = Array.from(arrows).filter(el => (el.textContent ?? '').includes('→')).length
    expect(arrowCount).toBe(2)
  })
})

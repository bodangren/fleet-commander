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
})

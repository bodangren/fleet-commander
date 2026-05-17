import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { RecentActivity } from './RecentActivity'
import { mockActivity } from '@/__fixtures__/dashboardFixtures'

describe('RecentActivity', () => {
  it('renders empty state when no activities are provided', () => {
    render(<RecentActivity activities={[]} />)

    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument()
  })

  it('renders activity list with agent and task', () => {
    render(<RecentActivity activities={mockActivity} />)

    expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
    expect(screen.getByText('Plan dashboard')).toBeInTheDocument()
    expect(screen.getByText('Review PR #1')).toBeInTheDocument()
  })

  it('shows agent names for each activity', () => {
    render(<RecentActivity activities={mockActivity} />)

    expect(screen.getByText('executor')).toBeInTheDocument()
    expect(screen.getByText('architect')).toBeInTheDocument()
    expect(screen.getByText('reviewer')).toBeInTheDocument()
  })

  it('color-codes merge activities', () => {
    render(<RecentActivity activities={mockActivity} />)

    const mergeItem = screen.getByText('Fix auth bug').closest('[data-activity-type]')
    expect(mergeItem).toHaveAttribute('data-activity-type', 'merge')
  })

  it('color-codes dispatch activities', () => {
    render(<RecentActivity activities={mockActivity} />)

    const dispatchItem = screen.getByText('Plan dashboard').closest('[data-activity-type]')
    expect(dispatchItem).toHaveAttribute('data-activity-type', 'dispatch')
  })

  it('color-codes blocked activities', () => {
    render(<RecentActivity activities={mockActivity} />)

    const blockedItem = screen.getByText('Review PR #1').closest('[data-activity-type]')
    expect(blockedItem).toHaveAttribute('data-activity-type', 'blocked')
  })

  it('renders a scrollable container', () => {
    render(<RecentActivity activities={mockActivity} />)

    const container = screen.getByRole('log')
    expect(container).toHaveClass('overflow-y-auto')
  })

  it('displays cost for activities with non-zero cost', () => {
    render(<RecentActivity activities={mockActivity} />)

    expect(screen.getByText(/\$12\.50/)).toBeInTheDocument()
    expect(screen.getByText(/\$8\.00/)).toBeInTheDocument()
  })

  it('shows relative timestamps', () => {
    render(<RecentActivity activities={mockActivity} />)

    const container = screen.getByRole('log')
    expect(container).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { InsightsTabs } from './InsightsTabs'

describe('InsightsTabs', () => {
  it('renders all three tabs', () => {
    render(<InsightsTabs activeTab="analytics" onTabChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /Analytics/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Performance/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Costs/i })).toBeInTheDocument()
  })

  it('marks the active tab as selected', () => {
    render(<InsightsTabs activeTab="performance" onTabChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /Analytics/i })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /Performance/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Costs/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<InsightsTabs activeTab="analytics" onTabChange={onTabChange} />)

    fireEvent.click(screen.getByRole('tab', { name: /Costs/i }))
    expect(onTabChange).toHaveBeenCalledWith('costs')

    fireEvent.click(screen.getByRole('tab', { name: /Performance/i }))
    expect(onTabChange).toHaveBeenCalledWith('performance')
  })

  it('uses tablist role for the container', () => {
    render(<InsightsTabs activeTab="analytics" onTabChange={vi.fn()} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })
})

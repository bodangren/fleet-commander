import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { KeyMetrics } from './KeyMetrics'

const mockMetrics = {
  deliveryRate: 0.56,
  successRate: 92,
  avgPipelineTime: 512000,
  rejectionRate: 8,
}

describe('KeyMetrics', () => {
  it('renders all four metrics', () => {
    render(<KeyMetrics metrics={mockMetrics} />)
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Pipeline Time')).toBeInTheDocument()
    expect(screen.getByText('Rejection Rate')).toBeInTheDocument()
  })

  it('formats delivery rate', () => {
    render(<KeyMetrics metrics={mockMetrics} />)
    expect(screen.getByText('0.56')).toBeInTheDocument()
  })

  it('formats success rate with %', () => {
    render(<KeyMetrics metrics={mockMetrics} />)
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('formats pipeline time', () => {
    render(<KeyMetrics metrics={mockMetrics} />)
    expect(screen.getByText('8m 32s')).toBeInTheDocument()
  })
})

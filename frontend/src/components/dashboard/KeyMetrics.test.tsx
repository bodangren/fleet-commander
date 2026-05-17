import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { KeyMetrics } from './KeyMetrics'
import { mockKeyMetrics } from '@/__fixtures__/dashboardFixtures'

describe('KeyMetrics', () => {
  it('renders delivery rate label and value', () => {
    render(<KeyMetrics metrics={mockKeyMetrics} />)
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('0.56 pts/$')).toBeInTheDocument()
  })

  it('renders success rate label and value', () => {
    render(<KeyMetrics metrics={mockKeyMetrics} />)
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('renders pipeline time label and formatted duration', () => {
    render(<KeyMetrics metrics={mockKeyMetrics} />)
    expect(screen.getByText('Pipeline Time')).toBeInTheDocument()
    expect(screen.getByText('8m 32s')).toBeInTheDocument()
  })

  it('renders rejection rate label and value', () => {
    render(<KeyMetrics metrics={mockKeyMetrics} />)
    expect(screen.getByText('Rejection Rate')).toBeInTheDocument()
    expect(screen.getByText('8%')).toBeInTheDocument()
  })

  it('shows all labels even when values are zero', () => {
    render(
      <KeyMetrics
        metrics={{ deliveryRate: 0, successRate: 0, pipelineTime: 0, rejectionRate: 0 }}
      />,
    )
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Pipeline Time')).toBeInTheDocument()
    expect(screen.getByText('Rejection Rate')).toBeInTheDocument()
  })
})

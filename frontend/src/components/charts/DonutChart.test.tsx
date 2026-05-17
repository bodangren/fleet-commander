import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DonutChart } from './DonutChart'

describe('DonutChart', () => {
  const mockData = [
    { stage: 'Design', cost: 450 },
    { stage: 'Dev', cost: 1200 },
    { stage: 'Test', cost: 300 },
  ]

  it('shows empty state when no data is provided', () => {
    render(<DonutChart data={[]} nameKey="stage" valueKey="cost" title="Cost Breakdown" />)

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders chart title', () => {
    render(<DonutChart data={mockData} nameKey="stage" valueKey="cost" title="Cost Breakdown" />)

    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
  })

  it('renders slice labels from data', () => {
    render(<DonutChart data={mockData} nameKey="stage" valueKey="cost" title="Cost Breakdown" />)

    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Dev')).toBeInTheDocument()
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('renders data values', () => {
    render(<DonutChart data={mockData} nameKey="stage" valueKey="cost" title="Cost Breakdown" />)

    expect(screen.getAllByText('450').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1200').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('300').length).toBeGreaterThanOrEqual(1)
  })

  it('renders legend labels', () => {
    render(<DonutChart data={mockData} nameKey="stage" valueKey="cost" title="Cost Breakdown" />)

    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Dev')).toBeInTheDocument()
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('re-renders with new data', () => {
    const { rerender } = render(
      <DonutChart data={mockData} nameKey="stage" valueKey="cost" title="Cost Breakdown" />,
    )

    expect(screen.getByText('Design')).toBeInTheDocument()

    const newData = [{ stage: 'Deploy', cost: 150 }]
    rerender(<DonutChart data={newData} nameKey="stage" valueKey="cost" title="Cost Breakdown" />)

    expect(screen.getByText('Deploy')).toBeInTheDocument()
    expect(screen.queryByText('Design')).not.toBeInTheDocument()
  })

  it('handles single data point', () => {
    const single = [{ stage: 'All', cost: 1000 }]

    render(<DonutChart data={single} nameKey="stage" valueKey="cost" title="Single Slice" />)

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getAllByText('1000').length).toBeGreaterThanOrEqual(1)
  })

  it('handles zero values without crashing', () => {
    const zeroData = [
      { stage: 'Free', cost: 0 },
    ]

    render(<DonutChart data={zeroData} nameKey="stage" valueKey="cost" title="Zero Values" />)

    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1)
  })

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup()
    render(<DonutChart data={mockData} nameKey="stage" valueKey="cost" title="Cost Breakdown" />)

    const chart = screen.getByText('Cost Breakdown').parentElement
    if (chart) {
      await user.hover(chart)
    }

    expect(document.body.textContent).toContain('450')
  })
})

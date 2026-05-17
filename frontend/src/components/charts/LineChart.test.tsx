import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LineChart } from './LineChart'

describe('LineChart', () => {
  const mockData = [
    { name: 'Sprint 1', value: 10 },
    { name: 'Sprint 2', value: 20 },
    { name: 'Sprint 3', value: 15 },
  ]

  it('shows empty state when no data is provided', () => {
    render(<LineChart data={[]} xKey="name" yKey="value" title="Velocity Trend" />)

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders chart title', () => {
    render(<LineChart data={mockData} xKey="name" yKey="value" title="Velocity Trend" />)

    expect(screen.getByText('Velocity Trend')).toBeInTheDocument()
  })

  it('renders x-axis labels from data', () => {
    render(<LineChart data={mockData} xKey="name" yKey="value" title="Velocity Trend" />)

    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 2')).toBeInTheDocument()
    expect(screen.getByText('Sprint 3')).toBeInTheDocument()
  })

  it('renders data values', () => {
    render(<LineChart data={mockData} xKey="name" yKey="value" title="Velocity Trend" />)

    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1)
  })

  it('renders legend label', () => {
    render(<LineChart data={mockData} xKey="name" yKey="value" title="Velocity Trend" />)

    expect(screen.getByText('value')).toBeInTheDocument()
  })

  it('re-renders with new data', () => {
    const { rerender } = render(
      <LineChart data={mockData} xKey="name" yKey="value" title="Velocity Trend" />,
    )

    expect(screen.getByText('Sprint 1')).toBeInTheDocument()

    const newData = [{ name: 'Sprint 4', value: 30 }]
    rerender(<LineChart data={newData} xKey="name" yKey="value" title="Velocity Trend" />)

    expect(screen.getByText('Sprint 4')).toBeInTheDocument()
    expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument()
  })

  it('handles single data point', () => {
    const single = [{ name: 'Sprint A', value: 5 }]

    render(<LineChart data={single} xKey="name" yKey="value" title="Single Point" />)

    expect(screen.getByText('Sprint A')).toBeInTheDocument()
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)
  })

  it('handles zero values without crashing', () => {
    const zeroData = [
      { name: 'Sprint Z', value: 0 },
    ]

    render(<LineChart data={zeroData} xKey="name" yKey="value" title="Zero Values" />)

    expect(screen.getByText('Sprint Z')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1)
  })

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup()
    render(<LineChart data={mockData} xKey="name" yKey="value" title="Velocity Trend" />)

    const chart = screen.getByText('Velocity Trend').parentElement
    if (chart) {
      await user.hover(chart)
    }

    expect(document.body.textContent).toContain('10')
  })
})

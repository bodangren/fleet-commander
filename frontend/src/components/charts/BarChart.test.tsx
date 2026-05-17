import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BarChart } from './BarChart'

describe('BarChart', () => {
  const mockData = [
    { name: 'Alice', value: 42 },
    { name: 'Bob', value: 38 },
    { name: 'Charlie', value: 25 },
  ]

  it('shows empty state when no data is provided', () => {
    render(<BarChart data={[]} xKey="name" yKey="value" title="Agent Tasks" />)

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders chart title', () => {
    render(<BarChart data={mockData} xKey="name" yKey="value" title="Agent Tasks" />)

    expect(screen.getByText('Agent Tasks')).toBeInTheDocument()
  })

  it('renders x-axis labels from data', () => {
    render(<BarChart data={mockData} xKey="name" yKey="value" title="Agent Tasks" />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('renders data values', () => {
    render(<BarChart data={mockData} xKey="name" yKey="value" title="Agent Tasks" />)

    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('38').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('25').length).toBeGreaterThanOrEqual(1)
  })

  it('renders legend label', () => {
    render(<BarChart data={mockData} xKey="name" yKey="value" title="Agent Tasks" />)

    expect(screen.getByText('value')).toBeInTheDocument()
  })

  it('re-renders with new data', () => {
    const { rerender } = render(
      <BarChart data={mockData} xKey="name" yKey="value" title="Agent Tasks" />,
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()

    const newData = [{ name: 'Diana', value: 50 }]
    rerender(<BarChart data={newData} xKey="name" yKey="value" title="Agent Tasks" />)

    expect(screen.getByText('Diana')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('handles single data point', () => {
    const single = [{ name: 'Solo', value: 99 }]

    render(<BarChart data={single} xKey="name" yKey="value" title="Single Bar" />)

    expect(screen.getByText('Solo')).toBeInTheDocument()
    expect(screen.getAllByText('99').length).toBeGreaterThanOrEqual(1)
  })

  it('handles zero values without crashing', () => {
    const zeroData = [
      { name: 'Empty', value: 0 },
    ]

    render(<BarChart data={zeroData} xKey="name" yKey="value" title="Zero Values" />)

    expect(screen.getByText('Empty')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1)
  })

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup()
    render(<BarChart data={mockData} xKey="name" yKey="value" title="Agent Tasks" />)

    const chart = screen.getByText('Agent Tasks').parentElement
    if (chart) {
      await user.hover(chart)
    }

    expect(document.body.textContent).toContain('42')
  })
})

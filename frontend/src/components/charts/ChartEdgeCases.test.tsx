import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { DonutChart } from './DonutChart'

describe('Chart edge cases — negative values', () => {
  describe('LineChart', () => {
    it('renders negative values without crashing', () => {
      const data = [
        { name: 'A', value: -10 },
        { name: 'B', value: -20 },
        { name: 'C', value: 5 },
      ]

      render(<LineChart data={data} xKey="name" yKey="value" title="Negative Trend" />)

      expect(screen.getByText('Negative Trend')).toBeInTheDocument()
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
      expect(screen.getByText('C')).toBeInTheDocument()
    })

    it('renders all-negative dataset', () => {
      const data = [
        { name: 'Q1', value: -50 },
        { name: 'Q2', value: -30 },
      ]

      render(<LineChart data={data} xKey="name" yKey="value" title="All Negative" />)

      expect(screen.getByText('All Negative')).toBeInTheDocument()
      expect(screen.getAllByText('-50').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('-30').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('BarChart', () => {
    it('renders negative values without crashing', () => {
      const data = [
        { name: 'Alice', value: -15 },
        { name: 'Bob', value: 25 },
      ]

      render(<BarChart data={data} xKey="name" yKey="value" title="Mixed Bars" />)

      expect(screen.getByText('Mixed Bars')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    it('renders all-negative dataset', () => {
      const data = [
        { name: 'Loss A', value: -100 },
        { name: 'Loss B', value: -200 },
      ]

      render(<BarChart data={data} xKey="name" yKey="value" title="All Negative Bars" />)

      expect(screen.getByText('All Negative Bars')).toBeInTheDocument()
      expect(screen.getAllByText('-100').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('-200').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('DonutChart', () => {
    it('renders negative slice values without crashing', () => {
      const data = [
        { stage: 'Refund', cost: -150 },
        { stage: 'Revenue', cost: 1200 },
      ]

      render(<DonutChart data={data} nameKey="stage" valueKey="cost" title="Mixed Donut" />)

      expect(screen.getByText('Mixed Donut')).toBeInTheDocument()
      expect(screen.getByText('Refund')).toBeInTheDocument()
      expect(screen.getByText('Revenue')).toBeInTheDocument()
    })

    it('renders all-negative dataset', () => {
      const data = [
        { stage: 'Overrun', cost: -300 },
        { stage: 'Penalty', cost: -150 },
      ]

      render(<DonutChart data={data} nameKey="stage" valueKey="cost" title="All Negative Donut" />)

      expect(screen.getByText('All Negative Donut')).toBeInTheDocument()
      expect(screen.getAllByText('-300').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('-150').length).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('Chart edge cases — large values', () => {
  it('LineChart handles values over 1 million', () => {
    const data = [{ name: 'Big', value: 1_500_000 }]

    render(<LineChart data={data} xKey="name" yKey="value" title="Large Values" />)

    expect(screen.getByText('Large Values')).toBeInTheDocument()
    expect(screen.getAllByText('1500000').length).toBeGreaterThanOrEqual(1)
  })

  it('BarChart handles values over 1 million', () => {
    const data = [{ name: 'Big', value: 2_000_000 }]

    render(<BarChart data={data} xKey="name" yKey="value" title="Large Values" />)

    expect(screen.getByText('Large Values')).toBeInTheDocument()
    expect(screen.getAllByText('2000000').length).toBeGreaterThanOrEqual(1)
  })

  it('DonutChart handles values over 1 million', () => {
    const data = [{ stage: 'Big', cost: 3_000_000 }]

    render(<DonutChart data={data} nameKey="stage" valueKey="cost" title="Large Values" />)

    expect(screen.getByText('Large Values')).toBeInTheDocument()
    expect(screen.getAllByText('3000000').length).toBeGreaterThanOrEqual(1)
  })
})

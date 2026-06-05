import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ProviderLatencyChart } from './ProviderLatencyChart'

describe('ProviderLatencyChart', () => {
  it('renders an empty-state placeholder when data is empty', () => {
    render(<ProviderLatencyChart data={[]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders a dot for a single data point (regression)', () => {
    const { container } = render(<ProviderLatencyChart data={[1200]} />)
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
    const circle = container.querySelector('svg circle')
    expect(circle).not.toBeNull()
    expect(circle).toHaveAttribute('r', '2')
  })

  it('renders a polyline when there are multiple data points', () => {
    const { container } = render(<ProviderLatencyChart data={[500, 800, 1200, 1500]} />)
    const polyline = container.querySelector('svg polyline')
    expect(polyline).not.toBeNull()
    expect(polyline).toHaveAttribute('points')
  })

  it('uses a green stroke for low-latency data', () => {
    const { container } = render(<ProviderLatencyChart data={[200, 400, 800, 1200]} />)
    const polyline = container.querySelector('svg polyline')
    expect(polyline).toHaveClass('stroke-green-500')
  })

  it('uses a yellow stroke when the latest latency exceeds 5_000ms', () => {
    const { container } = render(
      <ProviderLatencyChart data={[1000, 2000, 4000, 6000]} />,
    )
    const polyline = container.querySelector('svg polyline')
    expect(polyline).toHaveClass('stroke-yellow-500')
  })

  it('uses a red stroke when the latest latency exceeds 10_000ms', () => {
    const { container } = render(
      <ProviderLatencyChart data={[2000, 5000, 9000, 12_000]} />,
    )
    const polyline = container.querySelector('svg polyline')
    expect(polyline).toHaveClass('stroke-red-500')
  })

  it('honors the width and height props for the single-dot variant', () => {
    const { container } = render(
      <ProviderLatencyChart data={[800]} width={60} height={20} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '60')
    expect(svg).toHaveAttribute('height', '20')
  })

  it('appends the className to the svg element', () => {
    const { container } = render(
      <ProviderLatencyChart data={[500, 1000, 1500]} className="custom-class" />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('custom-class')
  })

  it('normalizes flat-line data to a stable polyline', () => {
    const { container } = render(
      <ProviderLatencyChart data={[1000, 1000, 1000, 1000]} />,
    )
    const polyline = container.querySelector('svg polyline')
    expect(polyline).not.toBeNull()
    expect(polyline?.getAttribute('points')).toBeTruthy()
  })
})

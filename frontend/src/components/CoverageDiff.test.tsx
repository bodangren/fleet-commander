import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoverageDiff } from './CoverageDiff'

describe('CoverageDiff', () => {
  it('shows increase indicator with green color when coverage improved', () => {
    render(<CoverageDiff before={80} after={85} />)
    expect(screen.getByText(/\+5\.0%/)).toBeInTheDocument()
  })

  it('shows decrease indicator with red color when coverage dropped', () => {
    render(<CoverageDiff before={90} after={82} />)
    expect(screen.getByText(/-8\.0%/)).toBeInTheDocument()
  })

  it('shows no change indicator when coverage stayed the same', () => {
    render(<CoverageDiff before={85} after={85} />)
    expect(screen.getByText(/0\.0%/)).toBeInTheDocument()
  })

  it('displays before and after percentages', () => {
    render(<CoverageDiff before={80} after={85} />)
    expect(screen.getByText('80.0%')).toBeInTheDocument()
    expect(screen.getByText('85.0%')).toBeInTheDocument()
  })

  it('shows neutral indicator when before and after are equal', () => {
    render(<CoverageDiff before={85} after={85} />)
    const delta = screen.getByTestId('coverage-delta')
    expect(delta.className).toContain('text-muted-foreground')
  })

  it('shows upward indicator when coverage increased', () => {
    render(<CoverageDiff before={80} after={85} />)
    const delta = screen.getByTestId('coverage-delta')
    expect(delta.className).toContain('text-emerald-400')
  })

  it('shows downward indicator when coverage decreased', () => {
    render(<CoverageDiff before={90} after={82} />)
    const delta = screen.getByTestId('coverage-delta')
    expect(delta.className).toContain('text-rose-400')
  })
})

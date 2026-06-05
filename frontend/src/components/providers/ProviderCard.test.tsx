import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { ProviderCard, type ProviderHealthData } from './ProviderCard'

function makeProvider(overrides: Partial<ProviderHealthData> = {}): ProviderHealthData {
  return {
    name: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini'],
    status: 'healthy',
    avgLatencyMs: 850,
    failureCount: 0,
    lastCheckedAt: Date.now() - 30_000,
    lastSuccessAt: Date.now() - 5_000,
    ...overrides,
  }
}

describe('ProviderCard', () => {
  it('renders the provider name in the card title', () => {
    render(<ProviderCard provider={makeProvider({ name: 'openai' })} />)
    expect(screen.getByText('openai')).toBeInTheDocument()
  })

  it('renders the model count with singular form for one model', () => {
    render(
      <ProviderCard
        provider={makeProvider({ name: 'openai', models: ['gpt-4o'] })}
      />,
    )
    expect(screen.getByText('1 model available')).toBeInTheDocument()
  })

  it('renders the model count with plural form for multiple models', () => {
    render(<ProviderCard provider={makeProvider({ name: 'openai' })} />)
    expect(screen.getByText('2 models available')).toBeInTheDocument()
  })

  it('renders every model as a provider/model row', () => {
    render(<ProviderCard provider={makeProvider({ name: 'openai' })} />)
    expect(screen.getByText('openai/gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('openai/gpt-4o-mini')).toBeInTheDocument()
  })

  it('renders the "Healthy" status label with a green badge dot', () => {
    render(<ProviderCard provider={makeProvider({ status: 'healthy' })} />)
    const dot = document.querySelector('.bg-green-500')
    expect(dot).not.toBeNull()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('renders the "Degraded" status label with a yellow badge dot', () => {
    render(<ProviderCard provider={makeProvider({ status: 'degraded' })} />)
    const dot = document.querySelector('.bg-yellow-500')
    expect(dot).not.toBeNull()
    expect(screen.getByText('Degraded')).toBeInTheDocument()
  })

  it('renders the "Unhealthy" status label with a red badge dot', () => {
    render(<ProviderCard provider={makeProvider({ status: 'unhealthy' })} />)
    const dot = document.querySelector('.bg-red-500')
    expect(dot).not.toBeNull()
    expect(screen.getByText('Unhealthy')).toBeInTheDocument()
  })

  it('renders the "Rate Limited" status label with an orange badge dot', () => {
    render(<ProviderCard provider={makeProvider({ status: 'rate_limited' })} />)
    const dot = document.querySelector('.bg-orange-500')
    expect(dot).not.toBeNull()
    expect(screen.getByText('Rate Limited')).toBeInTheDocument()
  })

  it('renders the raw status string as the label for unknown statuses', () => {
    render(<ProviderCard provider={makeProvider({ status: 'pending' })} />)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('formats sub-second latency in milliseconds', () => {
    render(<ProviderCard provider={makeProvider({ avgLatencyMs: 850 })} />)
    expect(screen.getByText('850ms')).toBeInTheDocument()
  })

  it('formats multi-second latency in seconds with one decimal', () => {
    render(<ProviderCard provider={makeProvider({ avgLatencyMs: 2350 })} />)
    expect(screen.getByText('2.4s')).toBeInTheDocument()
  })

  it('renders an em-dash when average latency is missing or zero', () => {
    const { rerender } = render(
      <ProviderCard provider={makeProvider({ avgLatencyMs: undefined })} />,
    )
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)

    rerender(<ProviderCard provider={makeProvider({ avgLatencyMs: 0 })} />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('displays the failure count', () => {
    render(<ProviderCard provider={makeProvider({ failureCount: 7 })} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('treats missing failure count as zero', () => {
    render(<ProviderCard provider={makeProvider({ failureCount: undefined })} />)
    const failuresCell = screen.getByText('Failures').parentElement
    expect(within(failuresCell!).getByText('0')).toBeInTheDocument()
  })

  it('renders "Never" when lastCheckedAt is undefined', () => {
    render(
      <ProviderCard
        provider={makeProvider({ lastCheckedAt: undefined, lastSuccessAt: undefined })}
      />,
    )
    const neverCells = screen.getAllByText('Never')
    expect(neverCells.length).toBe(2)
  })

  it('renders relative time since the last check', () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)
    render(
      <ProviderCard
        provider={makeProvider({
          lastCheckedAt: now - 2 * 60 * 1000,
          lastSuccessAt: now - 30 * 1000,
        })}
      />,
    )
    expect(screen.getByText('2m ago')).toBeInTheDocument()
    expect(screen.getByText('30s ago')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('falls back to a gray badge dot for unknown statuses', () => {
    render(<ProviderCard provider={makeProvider({ status: 'pending' })} />)
    const dot = document.querySelector('.bg-gray-400')
    expect(dot).not.toBeNull()
  })
})

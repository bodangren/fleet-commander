import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  mockCostData,
  mockSingleCostData,
  mockLargeCostData,
  mockEmptyCostData,
  mockZeroPointCostData,
} from '@/__fixtures__/insightsFixtures'

vi.mock('@/hooks/useCostData', () => ({
  useCostData: vi.fn(),
}))

import { CostsPage } from './CostsPage'

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>,
  )
}

describe('CostsPage', () => {
  it('renders the page title and subtitle', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText('Costs')).toBeInTheDocument()
    expect(
      screen.getByText(/Cost insights and optimization/i),
    ).toBeInTheDocument()
  })

  it('renders the cost per point trend chart', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText(/Cost per Point Trend/i)).toBeInTheDocument()
    expect(screen.getByText(/Sprint 14/i)).toBeInTheDocument()
    expect(screen.getByText(/Sprint 13/i)).toBeInTheDocument()
  })

  it('renders the agent cost efficiency table', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText(/Agent Cost Efficiency/i)).toBeInTheDocument()
    expect(screen.getByText(/Name/i)).toBeInTheDocument()
    expect(screen.getByText(/Model/i)).toBeInTheDocument()
    expect(screen.getByText(/Points/i)).toBeInTheDocument()
    expect(screen.getByText(/Total Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/Cost\/Point/i)).toBeInTheDocument()
    expect(screen.getByText(/Reliability/i)).toBeInTheDocument()
    expect(screen.getByText(/Value Score/i)).toBeInTheDocument()
  })

  it('renders the ROI summary', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText(/Avg Cost\/Point/i)).toBeInTheDocument()
    expect(screen.getByText(/Points per Dollar/i)).toBeInTheDocument()
    expect(screen.getByText(/Est\. Project Cost/i)).toBeInTheDocument()
  })

  it('renders the optimization opportunities section', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText(/Optimization Opportunities/i)).toBeInTheDocument()
    expect(screen.getByText(/Switch to cheaper model/i)).toBeInTheDocument()
    expect(screen.getByText(/Reduce retry rate/i)).toBeInTheDocument()
    expect(screen.getByText(/Batch API calls/i)).toBeInTheDocument()
  })

  it('populates the agent table with data from the hook', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('populates the cost trend with data from the hook', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText('Sprint 14')).toBeInTheDocument()
    expect(screen.getByText('Sprint 11')).toBeInTheDocument()
  })

  it('shows empty state when no cost data exists', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockEmptyCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText(/No cost data/i)).toBeInTheDocument()
  })

  it('shows loading state while cost data is loading', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(undefined)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText(/Loading costs/i)).toBeInTheDocument()
  })

  it('renders correctly with a single item dataset', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockSingleCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText('Sprint 14')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText(/Cost per Point Trend/i)).toBeInTheDocument()
    expect(screen.getByText(/Agent Cost Efficiency/i)).toBeInTheDocument()
  })

  it('handles large datasets without crashing', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockLargeCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.getByText('Sprint 55')).toBeInTheDocument()
    expect(screen.getByText('Agent 55')).toBeInTheDocument()
    expect(screen.getByText(/Cost per Point Trend/i)).toBeInTheDocument()
    expect(screen.getByText(/Agent Cost Efficiency/i)).toBeInTheDocument()
  })

  it('does not render Infinity or NaN when pointsDelivered is zero', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockZeroPointCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.queryByText('Infinity')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
    expect(screen.getByText(/Sprint Zero/i)).toBeInTheDocument()
  })

  it('shows zero values gracefully when cost is zero', async () => {
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockZeroPointCostData)
    renderWithRouter(<CostsPage />)

    expect(screen.queryByText('Infinity')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

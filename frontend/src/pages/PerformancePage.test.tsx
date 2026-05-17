import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  mockPerformanceData,
  mockSinglePerformanceData,
  mockLargePerformanceData,
  mockEmptyPerformanceData,
  mockZeroCostPerformanceData,
} from '@/__fixtures__/performanceFixtures'

vi.mock('@/hooks/usePerformanceData', () => ({
  usePerformanceData: vi.fn(),
}))

import { PerformancePage } from './PerformancePage'

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>,
  )
}

describe('PerformancePage', () => {
  it('renders the page title and subtitle', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText('Performance')).toBeInTheDocument()
    expect(
      screen.getByText(/Agent reliability, pipeline costs, and rejection tracking/i),
    ).toBeInTheDocument()
  })

  it('renders the agent reliability leaderboard', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText(/Agent Reliability/i)).toBeInTheDocument()
    expect(screen.getByText(/Name/i)).toBeInTheDocument()
    expect(screen.getByText(/Model/i)).toBeInTheDocument()
    expect(screen.getByText(/Tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/Reliability/i)).toBeInTheDocument()
    expect(screen.getByText(/Rejection Rate/i)).toBeInTheDocument()
    expect(screen.getByText(/Trend/i)).toBeInTheDocument()
  })

  it('renders the pipeline cost breakdown', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText(/Pipeline Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/Architect/i)).toBeInTheDocument()
    expect(screen.getByText(/Executor/i)).toBeInTheDocument()
    expect(screen.getByText(/Reviewer/i)).toBeInTheDocument()
    expect(screen.getByText(/Merger/i)).toBeInTheDocument()
    expect(screen.getByText(/Retries/i)).toBeInTheDocument()
  })

  it('renders the rejection reasons analysis', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText(/Rejection Reasons/i)).toBeInTheDocument()
    expect(screen.getByText(/Code quality/i)).toBeInTheDocument()
    expect(screen.getByText(/Test failures/i)).toBeInTheDocument()
  })

  it('populates the agent leaderboard with data from the hook', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows empty state when no performance data exists', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockEmptyPerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText(/No performance data/i)).toBeInTheDocument()
  })

  it('shows loading state while performance data is loading', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(undefined)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText(/Loading performance/i)).toBeInTheDocument()
  })

  it('renders correctly with a single agent', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockSinglePerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText(/Agent Reliability/i)).toBeInTheDocument()
    expect(screen.getByText(/Pipeline Cost/i)).toBeInTheDocument()
  })

  it('handles large datasets without crashing', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockLargePerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.getByText('Agent 55')).toBeInTheDocument()
    expect(screen.getByText(/Agent Reliability/i)).toBeInTheDocument()
    expect(screen.getByText(/Rejection Reasons/i)).toBeInTheDocument()
  })

  it('does not render Infinity or NaN when cost is zero', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockZeroCostPerformanceData)
    renderWithRouter(<PerformancePage />)

    expect(screen.queryByText('Infinity')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
    expect(screen.getByText(/Alice/i)).toBeInTheDocument()
  })

  it('shows zero rejection rate when no rejections exist', async () => {
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    const noRejectionData = {
      ...mockPerformanceData,
      rejectionReasons: [],
    }
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(noRejectionData)
    renderWithRouter(<PerformancePage />)

    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
  })
})

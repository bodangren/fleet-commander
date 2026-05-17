import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import { mockSprintHistory } from '@/__fixtures__/historyFixtures'
import { mockPerformanceData } from '@/__fixtures__/performanceFixtures'
import { mockCostData } from '@/__fixtures__/insightsFixtures'

vi.mock('@/hooks/usePerformanceData', () => ({
  usePerformanceData: vi.fn(),
}))

vi.mock('@/hooks/useCostData', () => ({
  useCostData: vi.fn(),
}))

setupConvexMocks()

import { InsightsPage } from './InsightsPage'

afterEach(() => {
  resetMockConvexData()
})

function renderWithRouter(initialEntries: string[] = ['/insights/analytics']) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="insights/:tab" element={<InsightsPage />} />
        <Route path="insights" element={<InsightsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InsightsPage', () => {
  it('renders Analytics tab content by default', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)

    renderWithRouter(['/insights/analytics'])

    expect(screen.getByRole('tab', { name: /Analytics/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Analytics' })).toBeInTheDocument()
  })

  it('renders Performance tab content when URL is /insights/performance', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)

    renderWithRouter(['/insights/performance'])

    expect(screen.getByRole('tab', { name: /Performance/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Performance' })).toBeInTheDocument()
  })

  it('renders Costs tab content when URL is /insights/costs', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)

    renderWithRouter(['/insights/costs'])

    expect(screen.getByRole('tab', { name: /Costs/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Costs' })).toBeInTheDocument()
  })

  it('navigates to correct tab when clicked', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    const { usePerformanceData } = await import('@/hooks/usePerformanceData')
    ;(usePerformanceData as ReturnType<typeof vi.fn>).mockReturnValue(mockPerformanceData)
    const { useCostData } = await import('@/hooks/useCostData')
    ;(useCostData as ReturnType<typeof vi.fn>).mockReturnValue(mockCostData)

    renderWithRouter(['/insights/analytics'])

    fireEvent.click(screen.getByRole('tab', { name: /Performance/i }))
    expect(screen.getByRole('tab', { name: /Performance/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Performance' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Costs/i }))
    expect(screen.getByRole('tab', { name: /Costs/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Costs' })).toBeInTheDocument()
  })
})

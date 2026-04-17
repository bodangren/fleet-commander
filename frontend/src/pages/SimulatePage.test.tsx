import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SimulatePage, type SimulationReport } from './SimulatePage'

function renderPage(props: Partial<React.ComponentProps<typeof SimulatePage>> = {}) {
  return render(
    <SimulatePage onRun={vi.fn()} initialReport={undefined} loading={false} {...props} />,
  )
}

describe('SimulatePage', () => {
  it('renders window input and weights textarea', () => {
    renderPage()

    expect(screen.getByTestId('window-days-input')).toBeInTheDocument()
    expect(screen.getByTestId('weights-json-input')).toBeInTheDocument()
    expect(screen.getByTestId('run-simulation-button')).toBeInTheDocument()
  })

  it('calls onRun when button is clicked', async () => {
    const onRun = vi.fn().mockResolvedValue({
      totalDispatches: 1,
      throughputDelta: 0,
      costDelta: 0,
      passRateDelta: 0,
      retryRateDelta: 0,
      coverageRegressionDelta: 0,
      starvationMaxAgeDelta: 0,
      rejectionRate: 0,
      misconfigurationWarning: false,
      divergences: [],
    })

    renderPage({ onRun })

    fireEvent.click(screen.getByTestId('run-simulation-button'))

    await waitFor(() => expect(onRun).toHaveBeenCalledTimes(1))
    expect(onRun).toHaveBeenCalledWith(7, expect.any(String))
  })

  it('displays report after run', async () => {
    const report: SimulationReport = {
      totalDispatches: 10,
      throughputDelta: 0.1,
      costDelta: -0.05,
      passRateDelta: 0.02,
      retryRateDelta: -0.03,
      coverageRegressionDelta: 0,
      starvationMaxAgeDelta: -0.1,
      rejectionRate: 0.1,
      misconfigurationWarning: false,
      divergences: [
        { historicalChoice: 'task-a', simulatedChoice: 'task-b', matched: false, deltaImpact: 1 },
      ],
    }

    renderPage({ initialReport: report })

    expect(screen.getByTestId('simulation-report')).toBeInTheDocument()
    expect(screen.getByTestId('delta-throughput')).toHaveTextContent('+10.0%')
    expect(screen.getByTestId('delta-cost')).toHaveTextContent('-5.0%')
    expect(screen.getByTestId('divergences-count')).toHaveTextContent('Divergences: 1')
    expect(screen.getByTestId('rejection-rate')).toHaveTextContent('Rejection Rate: 10.0%')
  })

  it('shows misconfiguration warning when rejection rate > 25%', () => {
    const report: SimulationReport = {
      totalDispatches: 10,
      throughputDelta: -0.5,
      costDelta: 0,
      passRateDelta: 0,
      retryRateDelta: 0,
      coverageRegressionDelta: 0,
      starvationMaxAgeDelta: 0,
      rejectionRate: 0.3,
      misconfigurationWarning: true,
      divergences: [],
    }

    renderPage({ initialReport: report })

    expect(screen.getByTestId('misconfiguration-warning')).toBeInTheDocument()
    expect(screen.getByTestId('misconfiguration-warning')).toHaveTextContent('25%')
  })

  it('updates window days on input change', () => {
    renderPage()

    const input = screen.getByTestId('window-days-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '14' } })
    expect(input.value).toBe('14')
  })

  it('shows error when onRun throws', async () => {
    const onRun = vi.fn().mockRejectedValue(new Error('Network error'))

    renderPage({ onRun })

    fireEvent.click(screen.getByTestId('run-simulation-button'))

    await waitFor(() =>
      expect(screen.getByTestId('simulation-error')).toHaveTextContent('Network error'),
    )
  })
})

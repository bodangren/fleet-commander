import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach, vi } from 'vitest'

import { OpsPage } from './OpsPage'

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

vi.mock('@/lib/useConvexData', () => ({
  useQueueHealth: vi.fn(() => ({
    readyCount: 5,
    inProgressCount: 1,
    blockedCount: 0,
    doneCount: 10,
    starvationTasks: [],
    retryHotspots: [],
    openBlockers: [],
  })),
  useFleetHealth: vi.fn(() => ({
    dispatchStats: [
      {
        persona: 'executor',
        taskKind: 'feature',
        repoType: 'default',
        meanDurationMs: 120000,
        p50Cost: 0.8,
        p90Cost: 0.95,
        reviewFailRate: 0.1,
        retryRate: 0.05,
        blockerCreationRate: 0.02,
        coverageRegressionRate: 0.01,
        sampleCount: 25,
        windowDays: 7,
        insufficientData: false,
        lastUpdatedAt: Date.now(),
      },
    ],
    harnessStats: [
      {
        harnessName: 'opencode',
        successRate7d: 0.92,
        medianLatencyMs: 45000,
        averageTokens: 850,
        reviewPassRateByTaskClassJson: JSON.stringify({ feature: 0.9, bug: 0.85 }),
        topFailureModesJson: JSON.stringify(['retry', 'escalate']),
        lastUpdatedAt: Date.now(),
      },
    ],
  })),
  useDispatchTimeline: vi.fn(() => [
    {
      taskId: 'task-101',
      projectSlug: 'kanban-conductor',
      objective: 'Fix coverage parser',
      createdAt: Date.now(),
      hasArchitect: true,
      hasExecutor: true,
      hasReviewer: false,
      hasRecovery: false,
      rejectionCount: 0,
    },
  ]),
  useGovernanceEvents: vi.fn(() => []),
  useReconciliationEvents: vi.fn(() => []),
  usePolicyWeights: vi.fn(() => []),
  useReconciliationProposals: vi.fn(() => []),
}))

describe('OpsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', window)
  })

  it('renders all four tabs with numbered labels', () => {
    renderWithRouter(<OpsPage />)

    expect(screen.getByTestId('tab-queue')).toHaveTextContent('1. Queue')
    expect(screen.getByTestId('tab-fleet')).toHaveTextContent('2. Fleet')
    expect(screen.getByTestId('tab-timeline')).toHaveTextContent('3. Timeline')
    expect(screen.getByTestId('tab-governance')).toHaveTextContent('4. Governance')
    expect(screen.getByTestId('tab-reconcile')).toHaveTextContent('5. Reconcile')
  })

  it('defaults to the Queue tab', () => {
    renderWithRouter(<OpsPage />)

    expect(screen.getByText('Queue Health')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('switches tabs on click', () => {
    renderWithRouter(<OpsPage />)

    fireEvent.click(screen.getByTestId('tab-fleet'))
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tab-timeline'))
    expect(screen.getByText('Dispatch Timeline')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tab-governance'))
    expect(screen.getByTestId('governance')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tab-reconcile'))
    expect(screen.getByTestId('reconcile-panel')).toBeInTheDocument()
  })

  it('switches tabs via keyboard shortcuts 1–5', () => {
    renderWithRouter(<OpsPage />)

    fireEvent.keyDown(window, { key: '2' })
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '3' })
    expect(screen.getByText('Dispatch Timeline')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '4' })
    expect(screen.getByTestId('governance')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '5' })
    expect(screen.getByTestId('reconcile-panel')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByText('Queue Health')).toBeInTheDocument()
  })

  it('does not switch tabs when modifier keys are held', () => {
    renderWithRouter(<OpsPage />)
    fireEvent.click(screen.getByTestId('tab-fleet'))

    fireEvent.keyDown(window, { key: '1', ctrlKey: true })
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '1', metaKey: true })
    expect(screen.getByText('Fleet Health')).toBeInTheDocument()
  })
})

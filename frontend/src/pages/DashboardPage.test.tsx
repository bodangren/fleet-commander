import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from './DashboardPage'

const mockUseDashboardData = vi.fn()

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => mockUseDashboardData(),
}))

function mockDashboardData(data: ReturnType<typeof mockUseDashboardData>) {
  mockUseDashboardData.mockReturnValue({
    data,
    loading: data === undefined,
    error: null,
    refresh: vi.fn(),
  })
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseDashboardData.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockDashboardData(undefined)
    render(<DashboardPage />)
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('renders an actionable error state and retries', async () => {
    const refresh = vi.fn()
    mockUseDashboardData.mockReturnValue({
      data: undefined,
      loading: false,
      error: 'Backend unavailable',
      refresh,
    })
    render(<DashboardPage />)
    expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument()
    expect(screen.getByText('Backend unavailable')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('renders dashboard with sprint data', async () => {
    mockDashboardData({
      sprint: {
        _id: 's1',
        name: 'Sprint 14',
        status: 'active',
        budget: 50,
        actualCost: 32.4,
        pointsDelivered: 12,
        taskCount: 18,
        completedCount: 12,
        burnRate: 2.5,
        projectedExhaustionMs: Date.now() + 86400000,
        atRisk: false,
        forecastConfidence: 0.85,
      },
      tasks: [
        {
          _id: 't1',
          title: 'Auth middleware',
          status: 'done',
          storyPoints: 5,
          actualCost: 8.4,
          priority: 'high',
        },
        { _id: 't2', title: 'DB migration', status: 'blocked', storyPoints: 3, priority: 'medium' },
      ],
      agents: [
        {
          _id: 'a1',
          name: 'alice',
          role: 'architect',
          status: 'active',
          workload: 1,
          maxWorkload: 5,
        },
        { _id: 'a2', name: 'bob', role: 'executor', status: 'idle', workload: 0, maxWorkload: 5 },
      ],
      pipelineRuns: [
        {
          _id: 'r1',
          taskId: 't1',
          stage: 'dispatch',
          agentId: 'a1',
          startTime: Date.now() - 300000,
          endTime: Date.now() - 240000,
          status: 'completed',
          cost: 2,
        },
      ],
      alerts: [],
      metrics: { deliveryRate: 0.56, successRate: 92, avgPipelineTime: 512000, rejectionRate: 8 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Sprint 14')).toBeInTheDocument()
    expect(screen.getAllByText('active').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    expect(screen.getByText('Budget Burn Forecast')).toBeInTheDocument()
    expect(screen.getByText('Attention Needed')).toBeInTheDocument()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders metrics values', async () => {
    mockDashboardData({
      sprint: null,
      tasks: [],
      agents: [],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0.56, successRate: 92, avgPipelineTime: 512000, rejectionRate: 8 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('0.56')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('renders agent list', async () => {
    mockDashboardData({
      sprint: null,
      tasks: [],
      agents: [
        {
          _id: 'a1',
          name: 'alice',
          role: 'architect',
          status: 'active',
          workload: 1,
          maxWorkload: 5,
        },
        { _id: 'a2', name: 'bob', role: 'executor', status: 'idle', workload: 0, maxWorkload: 5 },
      ],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('@alice')).toBeInTheDocument()
    expect(screen.getByText('@bob')).toBeInTheDocument()
    expect(screen.getByText('1 active · 1 idle · 0 blocked')).toBeInTheDocument()
  })

  it('renders blocked tasks in attention section', async () => {
    mockDashboardData({
      sprint: {
        _id: 's1',
        name: 'Sprint 1',
        status: 'active',
        budget: 100,
        actualCost: 50,
        pointsDelivered: 10,
        taskCount: 5,
        completedCount: 3,
        burnRate: 1.5,
        projectedExhaustionMs: Date.now() + 172800000,
        atRisk: false,
        forecastConfidence: 0.7,
      },
      tasks: [
        { _id: 't1', title: 'DB migration', status: 'blocked', storyPoints: 3, priority: 'medium' },
      ],
      agents: [],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('1 task blocked')).toBeInTheDocument()
    expect(screen.getByText('DB migration')).toBeInTheDocument()
  })

  it('renders budget warning when over 60%', async () => {
    mockDashboardData({
      sprint: {
        _id: 's1',
        name: 'Sprint 1',
        status: 'active',
        budget: 100,
        actualCost: 80,
        pointsDelivered: 10,
        taskCount: 5,
        completedCount: 3,
        burnRate: 4.0,
        projectedExhaustionMs: Date.now() + 3600000,
        atRisk: true,
        forecastConfidence: 0.9,
      },
      tasks: [],
      agents: [],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Budget at 80%')).toBeInTheDocument()
  })

  it('renders alerts in attention section', async () => {
    mockDashboardData({
      sprint: null,
      tasks: [],
      agents: [],
      pipelineRuns: [],
      alerts: [
        {
          _id: 'al1',
          type: 'budget_breach',
          severity: 'critical',
          message: 'Budget exceeded',
          createdAt: Date.now() - 60000,
        },
      ],
      metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Budget exceeded')).toBeInTheDocument()
  })

  it('renders no attention items message when all clear', async () => {
    mockDashboardData({
      sprint: null,
      tasks: [],
      agents: [],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('All clear — no attention items')).toBeInTheDocument()
  })

  it('renders recent activity from pipeline runs', async () => {
    mockDashboardData({
      sprint: null,
      tasks: [{ _id: 't1', title: 'Auth', status: 'done', storyPoints: 3, priority: 'high' }],
      agents: [
        {
          _id: 'a1',
          name: 'alice',
          role: 'architect',
          status: 'active',
          workload: 1,
          maxWorkload: 5,
        },
      ],
      pipelineRuns: [
        {
          _id: 'r1',
          taskId: 't1',
          stage: 'dispatch',
          agentId: 'a1',
          startTime: Date.now() - 300000,
          status: 'completed',
          cost: 2,
        },
      ],
      alerts: [],
      metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
    })

    render(<DashboardPage />)

    expect(await screen.findByText(/dispatch completed/)).toBeInTheDocument()
  })
})

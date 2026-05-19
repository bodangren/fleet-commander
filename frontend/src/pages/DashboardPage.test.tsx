import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function mockDashboardResponse(data: object) {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data }),
    } as Response)
  }

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<DashboardPage />)
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('renders error state', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    render(<DashboardPage />)
    expect(await screen.findByText(/Error:/)).toBeInTheDocument()
  })

  it('renders dashboard with sprint data', async () => {
    mockDashboardResponse({
      sprint: {
        _id: 's1',
        name: 'Sprint 14',
        status: 'active',
        budget: 50,
        actualCost: 32.4,
        pointsDelivered: 12,
        taskCount: 18,
        completedCount: 12,
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
    expect(screen.getByText('Agent Status')).toBeInTheDocument()
    expect(screen.getByText('Attention Needed')).toBeInTheDocument()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders metrics values', async () => {
    mockDashboardResponse({
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
    mockDashboardResponse({
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
    mockDashboardResponse({
      sprint: {
        _id: 's1',
        name: 'Sprint 1',
        status: 'active',
        budget: 100,
        actualCost: 50,
        pointsDelivered: 10,
        taskCount: 5,
        completedCount: 3,
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
    mockDashboardResponse({
      sprint: {
        _id: 's1',
        name: 'Sprint 1',
        status: 'active',
        budget: 100,
        actualCost: 80,
        pointsDelivered: 10,
        taskCount: 5,
        completedCount: 3,
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
    mockDashboardResponse({
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
    mockDashboardResponse({
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
    mockDashboardResponse({
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

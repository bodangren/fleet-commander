import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TaskTimelinePage } from './TaskTimelinePage'

vi.mock('@/hooks/useRunContract', () => ({
  useRunContract: vi.fn(),
}))

vi.mock('@/hooks/useTaskTimeline', () => ({
  useTaskTimeline: vi.fn(),
}))

function renderWithRouter(ui: React.ReactElement, route = '/tasks/task-1/timeline') {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)
}

describe('TaskTimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    const { useTaskTimeline } = await import('@/hooks/useTaskTimeline')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: true,
      error: null,
    })
    vi.mocked(useTaskTimeline).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('shows error state', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    const { useTaskTimeline } = await import('@/hooks/useTaskTimeline')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: false,
      error: 'Failed to fetch contract',
    })
    vi.mocked(useTaskTimeline).mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch contract',
      refresh: vi.fn(),
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Error')).toBeDefined()
    expect(screen.getByText('Failed to fetch contract')).toBeDefined()
  })

  it('renders new timeline components when timeline data is available', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    const { useTaskTimeline } = await import('@/hooks/useTaskTimeline')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: false,
      error: null,
    })
    vi.mocked(useTaskTimeline).mockReturnValue({
      data: {
        task: {
          _id: 'task-1',
          projectId: 'proj-1',
          title: 'Build employee roster page',
          description: 'Test',
          storyPoints: 3,
          status: 'in_progress',
          priority: 'high',
          costEstimate: 10,
          assigneeId: 'agent-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        pipelineRuns: [
          {
            _id: 'run-1',
            taskId: 'task-1',
            stage: 'dispatch',
            startTime: 1000,
            endTime: 12000,
            cost: 0.5,
            status: 'completed',
            createdAt: Date.now(),
          },
        ],
        agents: [
          {
            _id: 'agent-1',
            name: 'bob',
            role: 'Backend Lead',
            skills: ['node'],
            model: 'gpt-4',
            costPerPoint: 2,
            reliability: 0.9,
            status: 'active',
            workload: 1,
            maxWorkload: 3,
            createdAt: Date.now(),
          },
        ],
        sprint: { _id: 'sprint-1', projectId: 'proj-1', name: 'Sprint 14', status: 'active', budget: 50, actualCost: 30, pointsDelivered: 10, taskCount: 5, completedCount: 2, createdAt: Date.now() },
        project: { _id: 'proj-1', name: 'Fleet Commander', description: '', createdAt: Date.now(), updatedAt: Date.now() },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Task Timeline')).toBeDefined()
    expect(screen.getByTestId('task-info-bar')).toBeDefined()
    expect(screen.getByTestId('pipeline-timeline')).toBeDefined()
    expect(screen.getByTestId('agent-chain')).toBeDefined()
    expect(screen.getByTestId('execution-log')).toBeDefined()
    expect(screen.getByText('Build employee roster page')).toBeDefined()
  })

  it('renders legacy run contract when only contract data exists', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    const { useTaskTimeline } = await import('@/hooks/useTaskTimeline')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: {
        taskId: 'task-1',
        projectSlug: 'test-project',
        objective: 'Implement feature X',
        createdAt: new Date('2024-04-01'),
        stages: {},
        dispatchRejections: [],
      },
      loading: false,
      error: null,
    })
    vi.mocked(useTaskTimeline).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('Run Timeline')).toBeDefined()
    expect(screen.getAllByText('Implement feature X').length).toBeGreaterThan(0)
  })

  it('shows empty state when no data sources available', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    const { useTaskTimeline } = await import('@/hooks/useTaskTimeline')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: false,
      error: null,
    })
    vi.mocked(useTaskTimeline).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    renderWithRouter(<TaskTimelinePage />)

    expect(screen.getByText('No timeline data available')).toBeDefined()
  })

  it('navigates back to dashboard via link', async () => {
    const { useRunContract } = await import('@/hooks/useRunContract')
    const { useTaskTimeline } = await import('@/hooks/useTaskTimeline')
    vi.mocked(useRunContract).mockReturnValue({
      runContract: null,
      loading: false,
      error: null,
    })
    vi.mocked(useTaskTimeline).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    renderWithRouter(<TaskTimelinePage />)

    const backLinks = screen.getAllByText('Back to dashboard')
    expect(backLinks.length).toBeGreaterThan(0)
  })
});

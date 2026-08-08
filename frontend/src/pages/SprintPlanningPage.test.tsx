import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SprintPlanningPage } from './SprintPlanningPage'

vi.mock('@/hooks/useSprintPlanning', () => ({
  useSprintPlanningRecommendation: vi.fn(),
  useProjectStats: vi.fn(),
  createSprint: vi.fn(),
}))

import {
  useSprintPlanningRecommendation,
  useProjectStats,
  createSprint,
} from '@/hooks/useSprintPlanning'

const mockUseSprintPlanningRecommendation = useSprintPlanningRecommendation as ReturnType<
  typeof vi.fn
>
const mockUseProjectStats = useProjectStats as ReturnType<typeof vi.fn>
const mockCreateSprint = createSprint as ReturnType<typeof vi.fn>

describe('SprintPlanningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => [{ id: 'p1', name: 'Project 1', slug: 'project-one' }],
        }),
      ),
    )

    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: {
        tasks: [
          {
            taskId: 't1',
            taskTitle: 'Task 1',
            storyPoints: 3,
            priority: 'high',
            assignedAgentId: 'a1',
            assignedAgentName: 'Alice',
            agentRole: 'architect',
            costPerPoint: 4.2,
            estimatedCost: 12.6,
            selected: true,
          },
          {
            taskId: 't2',
            taskTitle: 'Task 2',
            storyPoints: 2,
            priority: 'medium',
            assignedAgentId: 'a2',
            assignedAgentName: 'Bob',
            agentRole: 'executor',
            costPerPoint: 2.1,
            estimatedCost: 4.2,
            selected: true,
          },
        ],
        agentBreakdown: [
          {
            agentId: 'a1',
            agentName: 'Alice',
            role: 'architect',
            totalPoints: 3,
            costPerPoint: 4.2,
            totalCost: 12.6,
            taskCount: 1,
          },
        ],
        totalPoints: 5,
        totalCost: 16.8,
        taskCount: 2,
        avgCostPerPoint: 3.36,
        recommendedBudget: 20,
        bufferPercent: 15,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    mockUseProjectStats.mockReturnValue({
      stats: { backlogCount: 5, totalPoints: 15, activeSprintCount: 1 },
      loading: false,
      error: null,
    })

    mockCreateSprint.mockResolvedValue({ ok: true, sprintId: 's1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders page header', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sprint Planning')).toBeInTheDocument()
    expect(screen.getByText(/PM Agent recommends tasks/)).toBeInTheDocument()
  })

  it('renders project stats', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Backlog Tasks')).toBeInTheDocument()
    // Use container queries to avoid ambiguous matches
    const projectCard = screen.getByText('Project').closest('div')?.parentElement
    expect(projectCard?.textContent).toContain('5')
    expect(projectCard?.textContent).toContain('15')
  })

  it('exposes the selected project through a labelled combobox', async () => {
    render(
      <MemoryRouter initialEntries={['/sprint-planning?project=project-one']}>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    const projectSelect = await screen.findByRole('combobox', { name: 'Project' })
    expect(projectSelect).toHaveValue('p1')
    expect(projectSelect).toHaveTextContent('Project 1')
  })

  it('resolves a slug URL selection to the project id used by Convex', async () => {
    render(
      <MemoryRouter initialEntries={['/sprint-planning?project=project-one']}>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    await screen.findByText('Project 1')
    await vi.waitFor(() => {
      expect(mockUseSprintPlanningRecommendation).toHaveBeenCalledWith('p1')
    })
  })

  it('preserves an ID URL selection for the project query', async () => {
    render(
      <MemoryRouter initialEntries={['/sprint-planning?project=p1']}>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    await screen.findByText('Project 1')
    await vi.waitFor(() => {
      expect(mockUseSprintPlanningRecommendation).toHaveBeenCalledWith('p1')
    })
  })

  it('renders the recommendation error instead of an empty backlog message', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: null,
      loading: false,
      error: 'Failed to fetch recommendation: 500',
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to fetch recommendation: 500',
    )
    expect(screen.queryByText(/No backlog tasks available/)).not.toBeInTheDocument()
  })

  it('renders recommendation summary', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('PM Agent Recommendation')).toBeInTheDocument()
    expect(screen.getByText(/5 story points across 2 tasks/)).toBeInTheDocument()
  })

  it('renders task selection list', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('starts with no task selected and permits only one selection', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    const checkboxes = await screen.findAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()

    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
    expect(screen.getByText('1 of 2 selected')).toBeInTheDocument()
  })

  it('renders agent cost breakdown', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    fireEvent.click((await screen.findAllByRole('checkbox'))[0])
    expect(await screen.findByText('Agent Cost Breakdown')).toBeInTheDocument()
    // Agent name and role are in separate spans; check container text
    const breakdownSection = screen.getByText('Agent Cost Breakdown').closest('div')!
    expect(breakdownSection.textContent).toContain('@Alice')
    expect(breakdownSection.textContent).toContain('architect')
  })

  it('disables Start Sprint when no tasks selected', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: {
        tasks: [],
        agentBreakdown: [],
        totalPoints: 0,
        totalCost: 0,
        taskCount: 0,
        avgCostPerPoint: 0,
        recommendedBudget: 0,
        bufferPercent: 0,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    const button = await screen.findByRole('button', { name: /Start Sprint/i })
    expect(button).toBeDisabled()
  })

  it('renders unassigned backlog tasks with an explicit agent requirement', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: {
        tasks: [
          {
            taskId: 't1',
            taskTitle: 'Imported backlog task',
            storyPoints: 3,
            priority: 'high',
            assignedAgentId: undefined,
            assignedAgentName: 'Unassigned',
            agentRole: 'unassigned',
            costPerPoint: 0,
            estimatedCost: 0,
            selected: false,
          },
        ],
        agentBreakdown: [],
        totalPoints: 0,
        totalCost: 0,
        taskCount: 0,
        avgCostPerPoint: 0,
        recommendedBudget: 0,
        bufferPercent: 0,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Imported backlog task')).toBeInTheDocument()
    expect(screen.getByText(/needs an active agent/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Start Sprint/i })).toBeDisabled()
  })

  it('calls createSprint on Start Sprint click', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    // Wait for project to be selected and UI to stabilize
    await screen.findByText('Project 1')

    // Wait for budget input to be populated from recommendation.recommendedBudget
    // (handleStartSprint early-returns when budget is empty)
    await screen.findByDisplayValue('20.00')

    fireEvent.click((await screen.findAllByRole('checkbox'))[0])
    const button = await screen.findByRole('button', { name: /Start Sprint/i })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)

    // Wait for async createSprint call
    await vi.waitFor(() => {
      expect(mockCreateSprint).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'p1',
          taskAssignments: [{ taskId: 't1', agentId: 'a1' }],
        }),
      )
    })
  })
})

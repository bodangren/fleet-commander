/**
 * The "Start Sprint" flow must validate that every
 * selected ready task has all of its dependencies accounted for within the
 * sprint (or already done outside it). When a selected task has incomplete
 * dependencies outside the sprint, the page must surface a warning before
 * the user starts the sprint. See plan.md Phase 4 task 3 and
 * test-strategy "Phase 4 — Sprint planning" row.
 *
 * The mock recommendation supplies the hook's `externalIncompleteDeps`
 * response so the tests cover the page's blocking behavior.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

interface ExternalIncompleteDep {
  taskId: string
  taskTitle: string
  missingDeps: Array<{ taskKey: string; title: string; status: string }>
}

interface RecommendationWithExternalDeps {
  tasks: Array<{
    taskId: string
    taskTitle: string
    storyPoints: number
    priority: string
    assignedAgentId: string
    assignedAgentName: string
    agentRole: string
    costPerPoint: number
    estimatedCost: number
    selected: boolean
  }>
  agentBreakdown: Array<{
    agentId: string
    agentName: string
    role: string
    totalPoints: number
    costPerPoint: number
    totalCost: number
    taskCount: number
  }>
  totalPoints: number
  totalCost: number
  taskCount: number
  avgCostPerPoint: number
  recommendedBudget: number
  bufferPercent: number
  externalIncompleteDeps?: ExternalIncompleteDep[]
}

function buildBaseRecommendation(
  overrides: Partial<RecommendationWithExternalDeps> = {},
): RecommendationWithExternalDeps {
  return {
    tasks: [
      {
        taskId: 't1',
        taskTitle: 'Auth backend',
        storyPoints: 5,
        priority: 'high',
        assignedAgentId: 'a1',
        assignedAgentName: 'Alice',
        agentRole: 'architect',
        costPerPoint: 4.2,
        estimatedCost: 21,
        selected: true,
      },
      {
        taskId: 't2',
        taskTitle: 'Auth UI',
        storyPoints: 3,
        priority: 'medium',
        assignedAgentId: 'a2',
        assignedAgentName: 'Bob',
        agentRole: 'executor',
        costPerPoint: 2.1,
        estimatedCost: 6.3,
        selected: true,
      },
    ],
    agentBreakdown: [
      {
        agentId: 'a1',
        agentName: 'Alice',
        role: 'architect',
        totalPoints: 5,
        costPerPoint: 4.2,
        totalCost: 21,
        taskCount: 1,
      },
    ],
    totalPoints: 8,
    totalCost: 27.3,
    taskCount: 2,
    avgCostPerPoint: 3.41,
    recommendedBudget: 30,
    bufferPercent: 10,
    ...overrides,
  }
}

describe('SprintPlanningPage: Start Sprint dependency validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => [{ id: 'p1', name: 'Project 1' }],
        }),
      ),
    )
    mockUseProjectStats.mockReturnValue({
      stats: { backlogCount: 2, totalPoints: 8, activeSprintCount: 0 },
      loading: false,
      error: null,
    })
    mockCreateSprint.mockResolvedValue({ ok: true, sprintId: 's1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an "incomplete external dependencies" warning when externalIncompleteDeps is non-empty', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: buildBaseRecommendation({
        externalIncompleteDeps: [
          {
            taskId: 't2',
            taskTitle: 'Auth UI',
            missingDeps: [{ taskKey: 'T-EXT-1', title: 'Design system', status: 'in_progress' }],
          },
        ],
      }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText(/incomplete dependencies outside the sprint/i),
    ).toBeInTheDocument()
  })

  it('renders the dependency warning inside a role="alert" region', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: buildBaseRecommendation({
        externalIncompleteDeps: [
          {
            taskId: 't2',
            taskTitle: 'Auth UI',
            missingDeps: [{ taskKey: 'T-EXT-1', title: 'Design system', status: 'in_progress' }],
          },
        ],
      }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    const alerts = await screen.findAllByRole('alert')
    const externalDepsAlert = alerts.find(el =>
      /incomplete dependencies outside the sprint/i.test(el.textContent ?? ''),
    )
    expect(externalDepsAlert).toBeDefined()
  })

  it('does not show the warning when externalIncompleteDeps is empty or absent', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: buildBaseRecommendation({ externalIncompleteDeps: [] }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )
    await screen.findByText('Auth backend')
    expect(
      screen.queryByText(/incomplete dependencies outside the sprint/i),
    ).not.toBeInTheDocument()
  })

  it('blocks Start Sprint without entering a creating state when external dependencies are incomplete', async () => {
    const user = userEvent.setup()
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: buildBaseRecommendation({
        externalIncompleteDeps: [
          {
            taskId: 't1',
            taskTitle: 'Auth backend',
            missingDeps: [{ taskKey: 'T-EXT-1', title: 'Infra', status: 'in_progress' }],
          },
          {
            taskId: 't2',
            taskTitle: 'Auth UI',
            missingDeps: [{ taskKey: 'T-EXT-2', title: 'Design system', status: 'in_progress' }],
          },
        ],
      }),
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )
    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent(/incomplete dependencies outside the sprint/i)

    const projectSelect = await screen.findByRole('combobox', { name: 'Project' })
    await vi.waitFor(() => expect(projectSelect).toHaveValue('p1'))
    await screen.findByDisplayValue('30.00')
    const taskCheckbox = await screen.findByRole('checkbox', { name: /Auth backend/i })
    await user.click(taskCheckbox)
    const startButton = await screen.findByRole('button', { name: /Start Sprint/i })
    expect(startButton).toBeEnabled()
    await user.click(startButton)

    expect(mockCreateSprint).not.toHaveBeenCalled()
    expect(warning).toBeInTheDocument()
    expect(startButton).toHaveAccessibleName('Start Sprint')
    expect(startButton).toBeEnabled()
    expect(taskCheckbox).toBeChecked()
  })
})

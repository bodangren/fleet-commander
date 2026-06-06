/**
 * Phase 4 Red gate: the "Start Sprint" flow must validate that every
 * selected ready task has all of its dependencies accounted for within the
 * sprint (or already done outside it). When a selected task has incomplete
 * dependencies outside the sprint, the page must surface a warning before
 * the user starts the sprint. See plan.md Phase 4 task 3 and
 * test-strategy "Phase 4 — Sprint planning" row.
 *
 * The current `SprintPlanningPage` does NOT validate external dependencies
 * at all (it posts `taskAssignments` to `createSprint` and surfaces the
 * response error only). Every assertion in this file is therefore a Red
 * gate.
 *
 * The mock recommendation is extended locally with an
 * `externalIncompleteDeps` array; the Green phase is expected to plumb
 * this through the hook and the page.
 */

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

function buildBaseRecommendation(overrides: Partial<RecommendationWithExternalDeps> = {}): RecommendationWithExternalDeps {
  return {
    tasks: [
      {
        taskId: 't1', taskTitle: 'Auth backend', storyPoints: 5, priority: 'high',
        assignedAgentId: 'a1', assignedAgentName: 'Alice', agentRole: 'architect',
        costPerPoint: 4.2, estimatedCost: 21, selected: true,
      },
      {
        taskId: 't2', taskTitle: 'Auth UI', storyPoints: 3, priority: 'medium',
        assignedAgentId: 'a2', assignedAgentName: 'Bob', agentRole: 'executor',
        costPerPoint: 2.1, estimatedCost: 6.3, selected: true,
      },
    ],
    agentBreakdown: [
      {
        agentId: 'a1', agentName: 'Alice', role: 'architect',
        totalPoints: 5, costPerPoint: 4.2, totalCost: 21, taskCount: 1,
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

describe('SprintPlanningPage: Start Sprint dependency validation (Phase 4 Red)', () => {
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

  it('shows an "incomplete external dependencies" warning when externalIncompleteDeps is non-empty [RED]', async () => {
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

  it('renders the dependency warning inside a role="alert" region [RED]', async () => {
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
    const externalDepsAlert = alerts.find((el) =>
      /incomplete dependencies outside the sprint/i.test(el.textContent ?? ''),
    )
    expect(externalDepsAlert).toBeDefined()
  })

  it('does NOT show the warning when externalIncompleteDeps is empty or absent [RED]', async () => {
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
    expect(screen.queryByText(/incomplete dependencies outside the sprint/i)).not.toBeInTheDocument()
  })

  it('blocks the Start Sprint API call (or surfaces the warning) when external deps are incomplete [RED]', async () => {
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
    await screen.findByText(/incomplete dependencies outside the sprint/i)

    const startButton = await screen.findByRole('button', { name: /Start Sprint/i })
    fireEvent.click(startButton)

    // Either the API call is gated and not invoked, OR it is invoked but
    // the warning remains visible. Both are valid Green implementations;
    // the test pins that the user is informed.
    await vi.waitFor(() => {
      const warning = screen.queryByText(/incomplete dependencies outside the sprint/i)
      expect(warning).toBeInTheDocument()
    })
    // The mock should NOT have been called with a silent success path that
    // hides the warning. If the Green phase does call createSprint, the
    // page must keep the warning visible (e.g. by also setting createError
    // or by gating the call). The test does not assert whether createSprint
    // was called — only that the warning persists.
  })
})

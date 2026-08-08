/**
 * Phase 4 Red gate: the sprint planning page must show a "Critical path:
 * X story points" warning banner when the selected tasks form a long
 * dependency chain. See plan.md Phase 4 task 2 and the test-strategy
 * "Phase 4 — Sprint planning" row.
 *
 * The current `SprintPlanningPage` does not render any critical-path
 * indicator, so every assertion in this file is a Red gate.
 *
 * The mock `useSprintPlanningRecommendation` is extended (locally) with
 * a `criticalPath: { totalStoryPoints: number; path: string[] } | null`
 * field. The Green phase is expected to plumb that through the hook and
 * the page; the test pins the UI contract (text + role="alert" + visible
 * when selected tasks contain a long chain).
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

interface CriticalPath {
  totalStoryPoints: number
  path: string[]
}

function buildChainRecommendation() {
  // 4-task chain: T1 -> T2 -> T3 -> T4. Story points 2+8+3+1 = 14.
  // The recommender type is widened locally to include `criticalPath`.
  return {
    tasks: [
      {
        taskId: 't1',
        taskTitle: 'T1',
        storyPoints: 2,
        priority: 'medium',
        assignedAgentId: 'a1',
        assignedAgentName: 'Alice',
        agentRole: 'architect',
        costPerPoint: 4.2,
        estimatedCost: 8.4,
        selected: true,
      },
      {
        taskId: 't2',
        taskTitle: 'T2',
        storyPoints: 8,
        priority: 'medium',
        assignedAgentId: 'a1',
        assignedAgentName: 'Alice',
        agentRole: 'architect',
        costPerPoint: 4.2,
        estimatedCost: 33.6,
        selected: true,
      },
      {
        taskId: 't3',
        taskTitle: 'T3',
        storyPoints: 3,
        priority: 'medium',
        assignedAgentId: 'a2',
        assignedAgentName: 'Bob',
        agentRole: 'executor',
        costPerPoint: 2.1,
        estimatedCost: 6.3,
        selected: true,
      },
      {
        taskId: 't4',
        taskTitle: 'T4',
        storyPoints: 1,
        priority: 'medium',
        assignedAgentId: 'a2',
        assignedAgentName: 'Bob',
        agentRole: 'executor',
        costPerPoint: 2.1,
        estimatedCost: 2.1,
        selected: true,
      },
    ],
    agentBreakdown: [],
    totalPoints: 14,
    totalCost: 50.4,
    taskCount: 4,
    avgCostPerPoint: 3.6,
    recommendedBudget: 55.44,
    bufferPercent: 10,
    criticalPath: {
      totalStoryPoints: 14,
      path: ['t1', 't2', 't3', 't4'],
    } as CriticalPath | null,
  }
}

async function selectChainTasks() {
  const checkboxes = await screen.findAllByRole('checkbox')
  for (const box of checkboxes) {
    if (!(box as HTMLInputElement).checked) {
      fireEvent.click(box)
    }
  }
}

describe('SprintPlanningPage: critical path warning (Phase 4 Red)', () => {
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
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: buildChainRecommendation(),
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
    mockUseProjectStats.mockReturnValue({
      stats: { backlogCount: 4, totalPoints: 14, activeSprintCount: 0 },
      loading: false,
      error: null,
    })
    mockCreateSprint.mockResolvedValue({ ok: true, sprintId: 's1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders "Critical path: 14 story points" banner when selected tasks form a chain [RED]', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )
    await screen.findByText('T1')
    await selectChainTasks()
    // Red gate: this text does not appear anywhere in the current page.
    expect(await screen.findByText(/Critical path: 14 story points/i)).toBeInTheDocument()
  })

  it('renders the critical path banner inside a role="alert" region [RED]', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )
    await screen.findByText('T1')
    await selectChainTasks()
    const banner = await screen.findByRole('alert')
    expect(banner.textContent ?? '').toMatch(/Critical path/i)
    expect(banner.textContent ?? '').toMatch(/14 story points/i)
  })

  it('does NOT render the critical path banner when the recommendation has no criticalPath [RED]', async () => {
    const rec = buildChainRecommendation()
    rec.criticalPath = null
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: rec,
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )
    await screen.findByText('T1')
    expect(screen.queryByText(/Critical path:/i)).not.toBeInTheDocument()
  })

  it('hides the critical path banner after the user deselects the chain tasks [RED]', async () => {
    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )
    await screen.findByText('T1')
    await selectChainTasks()
    await screen.findByText(/Critical path: 14 story points/i)

    // Deselect every task in the recommendation.
    const checkboxes = await screen.findAllByRole('checkbox')
    for (const box of checkboxes) {
      if ((box as HTMLInputElement).checked) {
        fireEvent.click(box)
      }
    }

    expect(screen.queryByText(/Critical path: 14 story points/i)).not.toBeInTheDocument()
  })
})

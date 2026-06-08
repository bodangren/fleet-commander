/**
 * Phase 4b Red gate: the sprint planning page must surface the
 * `SprintRecommendation.makespan` field as a distinct labelled field
 * ("Makespan: X pts"), per the acceptance sub-spec in
 * `measure/tracks/task_dependencies_critical_path_20260605/plan.md`
 * (Phase 4b preamble):
 *
 *   - UI surface: the sprint planning page shows `makespan` as a
 *     distinct labelled field ("Makespan: X pts"), not folded into
 *     "Total Cost" or "Total Points".
 *
 * The current `SprintPlanningPage` does NOT render any "Makespan" text
 * — `grep -n 'Makespan' frontend/src/pages/SprintPlanningPage.tsx`
 * returns nothing. The backend already populates
 * `SprintRecommendation.makespan` (in `pivot/src/planning/recommender.ts:39`
 * and `generateRecommendation` line 254), but the frontend
 * `SprintRecommendation` type in `frontend/src/hooks/useSprintPlanning.ts`
 * does not yet expose `makespan` and the page does not render it.
 *
 * This test pins the UI contract:
 *   1. A distinct "Makespan: 14 pts" label/value pair is rendered when
 *      the recommendation has `makespan: 14`.
 *   2. The makespan value (14 pts) appears as its own DOM node, not
 *      concatenated into a "Total Cost" or "Total Points" string.
 *   3. Makespan is rendered even when the recommendation has no
 *      `criticalPath` (the critical-path banner and the makespan field
 *      are orthogonal UI surfaces — see plan.md Phase 4b partial
 *      re-audit 2026-06-08).
 *
 * The frontend `SprintRecommendation` type currently has no `makespan`
 * field, so the mock recommendation is cast to a local extended type
 * (same pattern the existing critical-path / start-sprint-validation
 * test files use for `criticalPath` and `externalIncompleteDeps`).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

function buildRecommendationWithMakespan(makespan: number) {
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
    // Frontend SprintRecommendation type does not yet expose `makespan`;
    // the Green phase must widen the type. Cast to a local extended
    // shape so this Red test can express the contract today.
    makespan,
  }
}

describe('SprintPlanningPage: makespan UI surface (Phase 4b Red)', () => {
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
      stats: { backlogCount: 4, totalPoints: 14, activeSprintCount: 0 },
      loading: false,
      error: null,
    })
    mockCreateSprint.mockResolvedValue({ ok: true, sprintId: 's1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a distinct "Makespan: 14 pts" label/value when recommendation.makespan is 14 [RED]', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: buildRecommendationWithMakespan(14) as ReturnType<
        typeof mockUseSprintPlanningRecommendation
      >['recommendation'],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    // Red gate: the text "Makespan: 14 pts" does not appear anywhere in
    // the current page. The Green phase must add a labelled field that
    // surfaces the recommendation's `makespan` value as a distinct
    // (not folded into "Total Cost" / "Total Points") UI element.
    expect(await screen.findByText(/Makespan: 14 pts/i)).toBeInTheDocument()
  })

  it('renders "Makespan" as its own label, not embedded in a "Total Cost" or "Total Points" string [RED]', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: buildRecommendationWithMakespan(11) as ReturnType<
        typeof mockUseSprintPlanningRecommendation
      >['recommendation'],
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
    // The makespan text node should be a distinct DOM element, not
    // concatenated into the "Total Cost" or "Total Points" lines.
    const makespanNode = await screen.findByText(/Makespan: 11 pts/i)
    expect(makespanNode.textContent ?? '').toBe('Makespan: 11 pts')
    // No string in the document should read e.g. "Total Points 11 pts
    // makespan" — i.e. makespan is a sibling field, not a suffix on an
    // existing metric.
    const docText = document.body.textContent ?? ''
    expect(docText).not.toMatch(/Total (Cost|Points)[^\n]*Makespan/i)
  })

  it('renders "Makespan: 0 pts" when the sprint has no tasks (acceptance sub-spec empty case) [RED]', async () => {
    mockUseSprintPlanningRecommendation.mockReturnValue({
      recommendation: {
        tasks: [],
        agentBreakdown: [],
        totalPoints: 0,
        totalCost: 0,
        taskCount: 0,
        avgCostPerPoint: 0,
        recommendedBudget: 0,
        bufferPercent: 10,
        makespan: 0,
      } as ReturnType<
        typeof mockUseSprintPlanningRecommendation
      >['recommendation'],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <SprintPlanningPage />
      </MemoryRouter>,
    )

    // Red gate: the empty-sprint case must still render the "Makespan"
    // label so the field is always visible (per the acceptance sub-spec
    // "Empty sprint: makespan = 0").
    expect(await screen.findByText(/Makespan: 0 pts/i)).toBeInTheDocument()
  })
})

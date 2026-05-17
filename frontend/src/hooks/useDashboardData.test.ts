import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/useFleetApi', () => ({
  useActiveSprint: vi.fn(),
  useAgentWorkload: vi.fn(),
  useAlerts: vi.fn(),
}))

vi.mock('@/lib/useConvexData', () => ({
  useGovernanceEvents: vi.fn(),
  useFleetHealth: vi.fn(),
  useQueueHealth: vi.fn(),
}))

import {
  useDashboardSprint,
  useDashboardAgents,
  useDashboardActivity,
  useDashboardAlerts,
  useDashboardMetrics,
} from './useDashboardData'

describe('useDashboardSprint', () => {
  it('returns transformed sprint data with budget, tasks, and points', async () => {
    const { useActiveSprint } = await import('@/lib/useFleetApi')
    vi.mocked(useActiveSprint).mockReturnValue({
      data: {
        _id: 's1' as unknown as import('convex/values').Id<'sprints'>,
        projectSlug: 'proj-1',
        name: 'Sprint 42',
        status: 'active',
        startDate: 1712000000000,
        endDate: 1713000000000,
        goal: 'Ship dashboard',
        taskKeys: ['T-1', 'T-2', 'T-3'],
        updatedAt: 1712500000000,
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useDashboardSprint())

    expect(result.current).toBeDefined()
    expect(result.current?.name).toBe('Sprint 42')
    expect(result.current).toEqual(
      expect.objectContaining({
        budget: expect.any(Object),
        tasks: expect.any(Object),
        points: expect.any(Object),
      }),
    )
  })

  it('reacts to sprint data updates', async () => {
    const { useActiveSprint } = await import('@/lib/useFleetApi')
    let sprintData = {
      _id: 's1' as unknown as import('convex/values').Id<'sprints'>,
      projectSlug: 'proj-1',
      name: 'Sprint 42',
      status: 'active',
      startDate: 1712000000000,
      endDate: 1713000000000,
      goal: 'Ship dashboard',
      taskKeys: ['T-1'],
      updatedAt: 1712500000000,
    }

    vi.mocked(useActiveSprint).mockImplementation(() => ({
      data: sprintData,
      loading: false,
      error: null,
    }))

    const { result, rerender } = renderHook(() => useDashboardSprint())
    expect(result.current?.name).toBe('Sprint 42')

    sprintData = { ...sprintData, name: 'Sprint 43' }
    rerender()

    await waitFor(() => {
      expect(result.current?.name).toBe('Sprint 43')
    })
  })
})

describe('useDashboardAgents', () => {
  it('transforms agent workload into dashboard agent status shape', async () => {
    const { useAgentWorkload } = await import('@/lib/useFleetApi')
    vi.mocked(useAgentWorkload).mockReturnValue({
      data: [
        {
          name: 'architect',
          displayName: 'Architect',
          mode: 'run',
          model: 'gpt-4',
          currentTask: {
            taskKey: 'T-1',
            title: 'Plan dashboard',
            projectSlug: 'proj-1',
            projectName: 'Proj One',
          },
          successRate7d: 0.92,
          medianLatencyMs: 1200,
          queueDepth: 2,
          circuitState: 'closed' as const,
        },
      ],
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useDashboardAgents())

    expect(result.current).toBeDefined()
    expect(result.current).toHaveLength(1)
    expect(result.current?.[0]).toEqual(
      expect.objectContaining({
        name: 'architect',
        displayName: 'Architect',
        status: expect.stringMatching(/Active|Idle|Blocked/),
        currentTask: 'Plan dashboard',
      }),
    )
  })

  it('reacts to agent workload updates', async () => {
    const { useAgentWorkload } = await import('@/lib/useFleetApi')
    let workload = [
      {
        name: 'architect',
        displayName: 'Architect',
        mode: 'run',
        model: 'gpt-4',
        currentTask: undefined,
        successRate7d: 0.92,
        medianLatencyMs: 1200,
        queueDepth: 0,
        circuitState: 'closed' as const,
      },
    ]

    vi.mocked(useAgentWorkload).mockImplementation(() => ({
      data: workload,
      loading: false,
      error: null,
    }))

    const { result, rerender } = renderHook(() => useDashboardAgents())
    expect(result.current).toHaveLength(1)
    expect(result.current?.[0].name).toBe('architect')

    workload = [
      ...workload,
      {
        name: 'executor',
        displayName: 'Executor',
        mode: 'run',
        model: 'gpt-4',
        currentTask: undefined,
        successRate7d: 0.85,
        medianLatencyMs: 800,
        queueDepth: 1,
        circuitState: 'closed' as const,
      },
    ]
    rerender()

    await waitFor(() => {
      expect(result.current).toHaveLength(2)
    })
  })
})

describe('useDashboardActivity', () => {
  it('transforms governance events into activity items', async () => {
    const { useGovernanceEvents } = await import('@/lib/useConvexData')
    vi.mocked(useGovernanceEvents).mockReturnValue([
      {
        scope: 'proj-1',
        eventType: 'budget_breach' as const,
        payloadJson: JSON.stringify({ agent: 'executor', task: 'Fix auth bug', cost: 12.5 }),
        createdAt: Date.now() - 1000 * 60 * 5,
      },
    ])

    const { result } = renderHook(() => useDashboardActivity())

    expect(result.current).toBeDefined()
    expect(result.current).toHaveLength(1)
    expect(result.current?.[0]).toEqual(
      expect.objectContaining({
        type: expect.stringMatching(/merge|dispatch|blocked/),
        agent: 'executor',
        task: 'Fix auth bug',
        cost: 12.5,
      }),
    )
  })
})

describe('useDashboardAlerts', () => {
  it('transforms alert entries into dashboard alert shape', async () => {
    const { useAlerts } = await import('@/lib/useFleetApi')
    vi.mocked(useAlerts).mockReturnValue({
      data: [
        {
          _id: 'a1',
          type: 'budget_breach',
          severity: 'critical',
          message: 'Budget exceeded by 20%',
          contextJson: '{}',
          resolved: false,
          createdAt: Date.now(),
        },
      ],
      loading: false,
      error: null,
      criticalCount: 1,
      resolveAlert: vi.fn(),
      refresh: vi.fn(),
    })

    const { result } = renderHook(() => useDashboardAlerts())

    expect(result.current).toBeDefined()
    expect(result.current).toHaveLength(1)
    expect(result.current?.[0]).toEqual(
      expect.objectContaining({
        type: 'budget_breach',
        severity: 'critical',
        message: 'Budget exceeded by 20%',
        resolved: false,
      }),
    )
  })
})

describe('useDashboardMetrics', () => {
  it('computes key metrics from fleet health and queue data', async () => {
    const { useFleetHealth } = await import('@/lib/useConvexData')
    const { useQueueHealth } = await import('@/lib/useConvexData')

    vi.mocked(useFleetHealth).mockReturnValue({
      dispatchStats: [
        {
          persona: 'architect',
          taskKind: 'feature',
          repoType: 'ts',
          p50Cost: 5,
          p90Cost: 10,
          reviewFailRate: 0.08,
          retryRate: 0.02,
          blockerCreationRate: 0.01,
          coverageRegressionRate: 0,
          sampleCount: 100,
          windowDays: 7,
          insufficientData: false,
          lastUpdatedAt: Date.now(),
        },
      ],
      harnessStats: [],
    })

    vi.mocked(useQueueHealth).mockReturnValue({
      readyCount: 3,
      inProgressCount: 2,
      blockedCount: 1,
      doneCount: 10,
      starvationTasks: [],
      retryHotspots: [],
      openBlockers: [],
    })

    const { result } = renderHook(() => useDashboardMetrics())

    expect(result.current).toBeDefined()
    expect(result.current).toEqual(
      expect.objectContaining({
        deliveryRate: expect.any(Number),
        successRate: expect.any(Number),
        pipelineTime: expect.any(Number),
        rejectionRate: expect.any(Number),
      }),
    )
  })
})

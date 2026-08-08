import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({
  completion: undefined as unknown,
  utilization: undefined as unknown,
  bottlenecks: undefined as unknown,
  queue: undefined as unknown,
  hooks: undefined as unknown,
  sessions: undefined as unknown,
}))

vi.mock('@/lib/AnalyticsFiltersContext', () => ({
  useAnalyticsFilters: () => ({
    filters: { days: 30, projectSlug: '', agent: '', priority: '' },
  }),
}))

vi.mock('@/lib/useConvexRealtime', () => ({
  useCompletionTrends: () => state.completion,
  useAgentUtilization: () => state.utilization,
  useBottlenecks: () => state.bottlenecks,
  useQueueDepth: () => state.queue,
  useHookMetrics: () => state.hooks,
  useSessionMetrics: () => state.sessions,
}))

import { AgentHeatmap } from './AgentHeatmap'
import { BottleneckChart } from './BottleneckChart'
import { CompletionTrendChart } from './CompletionTrendChart'
import { HookPerformanceChart } from './HookPerformanceChart'
import { QueueDepthChart } from './QueueDepthChart'
import { SessionResumptionChart } from './SessionResumptionChart'

describe('analytics charts loaded-empty states', () => {
  it('labels empty utilization instead of showing a spinner', () => {
    state.utilization = []
    render(<AgentHeatmap />)

    expect(screen.getByText(/no agent utilization data/i)).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('labels empty bottlenecks instead of showing a spinner', () => {
    state.bottlenecks = []
    render(<BottleneckChart />)

    expect(screen.getByText(/no bottleneck data/i)).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('labels empty completion and queue observations', () => {
    state.completion = []
    state.queue = []

    const { unmount } = render(<CompletionTrendChart />)
    expect(screen.getByText(/no completion data/i)).toBeInTheDocument()
    unmount()

    render(<QueueDepthChart />)
    expect(screen.getByText(/no queue depth data/i)).toBeInTheDocument()
  })

  it('keeps hook and session empty states labeled', () => {
    state.hooks = []
    state.sessions = {
      totalTasks: 0,
      sessionBoundTasks: 0,
      resumptionRate: 0,
      activeSessions: 0,
      byDate: [],
    }

    const { unmount } = render(<HookPerformanceChart />)
    expect(screen.getByText(/no hook execution data/i)).toBeInTheDocument()
    unmount()

    render(<SessionResumptionChart />)
    expect(screen.getByText(/no session data/i)).toBeInTheDocument()
  })
})

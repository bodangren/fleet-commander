import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { getSliceConfig } from './dataAdapter'

vi.mock('./dataAdapter', () => ({
  getSliceConfig: vi.fn(),
}))

vi.mock('./useConvexData', () => ({
  useConvexQuery: vi.fn((queryName: string, args: unknown) => ({
    queryName,
    args,
  })),
}))

describe('useConvexRealtime hooks', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Dashboard hooks', () => {
    it('useFleetStatus returns undefined when disabled', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'bun',
        agents: 'bun',
        harnesses: 'bun',
        tasks: 'bun',
        issues: 'bun',
        logs: 'bun',
      })

      const { useFleetStatus } = await import('./useConvexRealtime')
      const result = useFleetStatus()
      expect(result).toBeUndefined()
    })

    it('useFleetStatus calls useConvexQuery with correct query name when enabled', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useFleetStatus } = await import('./useConvexRealtime')
      const result = useFleetStatus()
      expect((result as { queryName: string }).queryName).toBe('fleet:getFleetStatus')
    })

    it('useBlockedTasks calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useBlockedTasks } = await import('./useConvexRealtime')
      const result = useBlockedTasks()
      expect((result as { queryName: string }).queryName).toBe(
        'fleet:getBlockedTasksAcrossProjects',
      )
    })

    it('useOpenIssues calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useOpenIssues } = await import('./useConvexRealtime')
      const result = useOpenIssues()
      expect((result as { queryName: string }).queryName).toBe('fleet:getOpenIssuesAcrossProjects')
    })

    it('useActiveRuns calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useActiveRuns } = await import('./useConvexRealtime')
      const result = useActiveRuns()
      expect((result as { queryName: string }).queryName).toBe('fleet:getActiveRunsAcrossProjects')
    })

    it('useAlerts calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useAlerts } = await import('./useConvexRealtime')
      const result = useAlerts()
      expect((result as { queryName: string }).queryName).toBe('fleet:getAlertsWithFilters')
    })

    it('useActiveAlerts calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useActiveAlerts } = await import('./useConvexRealtime')
      const result = useActiveAlerts()
      expect((result as { queryName: string }).queryName).toBe('alerts:listActiveAlerts')
    })

    it('useCircuitBreakers calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useCircuitBreakers } = await import('./useConvexRealtime')
      const result = useCircuitBreakers()
      expect((result as { queryName: string }).queryName).toBe(
        'circuitBreakers:getAllCircuitBreakers',
      )
    })

    it('useInProgressTasks calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useInProgressTasks } = await import('./useConvexRealtime')
      const result = useInProgressTasks()
      expect((result as { queryName: string }).queryName).toBe('taskRecovery:getInProgressTasks')
    })

    it('useReadyTasks calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useReadyTasks } = await import('./useConvexRealtime')
      const result = useReadyTasks()
      expect((result as { queryName: string }).queryName).toBe('scheduler:listReadyTasks')
    })

    it('useActiveEmployees calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useActiveEmployees } = await import('./useConvexRealtime')
      const result = useActiveEmployees()
      expect((result as { queryName: string }).queryName).toBe('scheduler:listActiveEmployees')
    })
  })

  describe('Analytics hooks', () => {
    it('useCompletionTrends calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useCompletionTrends } = await import('./useConvexRealtime')
      const result = useCompletionTrends()
      expect((result as { queryName: string }).queryName).toBe('analytics:getCompletionTrends')
    })

    it('useAgentUtilization calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useAgentUtilization } = await import('./useConvexRealtime')
      const result = useAgentUtilization()
      expect((result as { queryName: string }).queryName).toBe('analytics:getAgentUtilization')
    })

    it('useQueueDepth calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useQueueDepth } = await import('./useConvexRealtime')
      const result = useQueueDepth()
      expect((result as { queryName: string }).queryName).toBe('analytics:getQueueDepth')
    })
  })

  describe('Performance hooks', () => {
    it('usePhaseBreakdown calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { usePhaseBreakdown } = await import('./useConvexRealtime')
      const result = usePhaseBreakdown()
      expect((result as { queryName: string }).queryName).toBe('performance:getPhaseBreakdown')
    })

    it('useSlowAgents calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useSlowAgents } = await import('./useConvexRealtime')
      const result = useSlowAgents()
      expect((result as { queryName: string }).queryName).toBe('performance:getSlowAgents')
    })

    it('usePerformanceOverview calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { usePerformanceOverview } = await import('./useConvexRealtime')
      const result = usePerformanceOverview()
      expect((result as { queryName: string }).queryName).toBe('performance:getPerformanceOverview')
    })
  })

  describe('Cost hooks', () => {
    it('useCostByProject calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useCostByProject } = await import('./useConvexRealtime')
      const result = useCostByProject()
      expect((result as { queryName: string }).queryName).toBe('costs:getCostByProject')
    })

    it('useCostTrend calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useCostTrend } = await import('./useConvexRealtime')
      const result = useCostTrend()
      expect((result as { queryName: string }).queryName).toBe('costs:getCostTrend')
    })
  })

  describe('Kanban/Sprint hooks', () => {
    it('useSprintBoard calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useSprintBoard } = await import('./useConvexRealtime')
      const result = useSprintBoard('test-project')
      expect((result as { queryName: string }).queryName).toBe('kanban:getSprintBoardHandler')
    })

    it('useActiveSprint calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useActiveSprint } = await import('./useConvexRealtime')
      const result = useActiveSprint('test-project')
      expect((result as { queryName: string }).queryName).toBe('kanban:getActiveSprintHandler')
    })

    it('useBacklogTasks calls useConvexQuery with correct query name', async () => {
      vi.mocked(getSliceConfig).mockReturnValue({
        projects: 'convex',
        agents: 'convex',
        harnesses: 'convex',
        tasks: 'convex',
        issues: 'convex',
        logs: 'convex',
      })

      const { useBacklogTasks } = await import('./useConvexRealtime')
      const result = useBacklogTasks('test-project')
      expect((result as { queryName: string }).queryName).toBe(
        'sprintPlanning:getBacklogTasksHandler',
      )
    })
  })
})

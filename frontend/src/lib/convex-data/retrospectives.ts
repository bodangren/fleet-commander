import { useConvexQuery } from './core'

export interface SprintAggregateData {
  sprintName: string
  projectSlug: string
  dateRange: { start: string; end: string }
  taskCounts: {
    planned: number
    completed: number
    blocked: number
    failed: number
    carriedOver: number
  }
  agentWorkload: Array<{
    agent: string
    tasksAssigned: number
    tasksCompleted: number
    avgDurationMs: number
  }>
  velocity: { planned: number; completed: number; completionRate: number }
  issuePatterns: Array<{ pattern: string; count: number }>
  hookFailures: Array<{ phase: string; count: number }>
  sessionMetrics: { totalSessions: number; resumedSessions: number; continuationRate: number }
  priorityCorrelation: Array<{
    priority: string
    total: number
    completed: number
    completionRate: number
    avgCycleTimeMs: number
  }>
  blockedByChains: Array<{ taskKey: string; blockerCount: number; cycleTimeMs: number | null }>
  topErrors: Array<{ message: string; count: number }>
}

export interface CostTrendEntry {
  sprintName: string
  budget: number
  actualCost: number
  costPerPoint: number
}

export interface RejectionReasonEntry {
  reason: string
  count: number
}

/**
 * Returns aggregate data for a sprint retrospective.
 * Returns undefined when sprintId is not provided or still loading.
 */
export function useSprintAggregateData(
  sprintId: string | undefined,
): SprintAggregateData | undefined {
  const enabled = Boolean(sprintId)
  return useConvexQuery<SprintAggregateData>(
    'retrospectives:getSprintAggregateData',
    { sprintId: sprintId ?? '' },
    enabled,
  )
}

/**
 * Returns cost trend data for a sprint.
 * Returns undefined when sprintId is not provided or still loading.
 */
export function useSprintCostTrend(sprintId: string | undefined): CostTrendEntry[] | undefined {
  const enabled = Boolean(sprintId)
  return useConvexQuery<CostTrendEntry[]>(
    'retrospectives:getSprintCostTrend',
    { sprintId: sprintId ?? '' },
    enabled,
  )
}

/**
 * Returns rejection reasons for a sprint.
 * Returns undefined when sprintId is not provided or still loading.
 */
export function useSprintRejectionReasons(
  sprintId: string | undefined,
): RejectionReasonEntry[] | undefined {
  const enabled = Boolean(sprintId)
  return useConvexQuery<RejectionReasonEntry[]>(
    'retrospectives:getSprintRejectionReasons',
    { sprintId: sprintId ?? '' },
    enabled,
  )
}

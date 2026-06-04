import { useRealtime } from './core'
import { useConvexQuery } from '../convex-data/core'
import { getSliceConfig } from '../dataAdapter'

export interface LeaderboardEntry {
  agentId: string
  agentName: string
  role: string
  model: string
  rank: number
  compositeScore: number
  trend: 'up' | 'down' | 'flat'
  previousRank: number | null
  badges: string[]
  metrics: {
    costPerPoint: number
    rejectionRate: number
    throughput: number
    mergeRate: number
  }
  breakdown: {
    costPerPoint: number
    rejectionRate: number
    throughput: number
    mergeRate: number
  }
}

export interface AgentPerformanceHistory {
  agentId: string
  agentName: string
  role: string
  model: string
  dailySnapshots: Array<{
    date: string
    compositeScore: number
    costPerPoint: number
    rejectionRate: number
    throughput: number
    mergeRate: number
  }>
}

/**
 * Returns the agent leaderboard with optional filtering by role, project, and time range.
 */
export function useAgentLeaderboard(args?: {
  role?: string
  projectSlug?: string
  timeRange?: '7d' | '30d' | 'all'
}) {
  return useRealtime<LeaderboardEntry[]>('leaderboard:getAgentLeaderboard', args ?? {})
}

/**
 * Returns historical performance data for a specific agent.
 */
export function useAgentPerformanceHistory(args?: { agentId?: string; days?: number }) {
  const enabled = getSliceConfig().projects === 'convex' && Boolean(args?.agentId)
  return useConvexQuery<AgentPerformanceHistory>(
    'leaderboard:getAgentPerformanceHistory',
    args ?? { agentId: '' },
    enabled,
  )
}

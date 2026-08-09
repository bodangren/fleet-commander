import { useState } from 'react'
import { useAgentLeaderboard, useAgentPerformanceHistory } from '@/lib/convex-realtime/leaderboard'
import { useConvexProjectsTransformed } from '@/lib/convex-data'
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import {
  LeaderboardFilterBar,
  type LeaderboardFilters,
} from '@/components/leaderboard/LeaderboardFilterBar'
import { AgentPerformanceChart } from '@/components/leaderboard/AgentPerformanceChart'
import type { LeaderboardEntry } from '@/lib/convex-realtime/leaderboard'

/**
 * Leaderboard page displaying cross-project agent performance rankings with drill-down.
 */
export function LeaderboardPage() {
  const [filters, setFilters] = useState<LeaderboardFilters>({
    role: '',
    projectSlug: '',
    timeRange: '30d',
  })
  const [selectedAgent, setSelectedAgent] = useState<LeaderboardEntry | null>(null)

  const leaderboard = useAgentLeaderboard({
    role: filters.role || undefined,
    projectSlug: filters.projectSlug || undefined,
    timeRange: filters.timeRange,
  })

  const history = useAgentPerformanceHistory({
    agentId: selectedAgent?.agentId,
    days: filters.timeRange === '7d' ? 7 : filters.timeRange === '30d' ? 30 : 90,
  })

  const projects = useConvexProjectsTransformed()
  const timedOut = useLoadingTimeout(leaderboard === undefined)

  const projectList = (projects ?? []).map(p => ({
    slug: p.slug ?? p.id,
    name: p.name,
  }))

  if (selectedAgent && history) {
    return (
      <div className="space-y-6">
        <AgentPerformanceChart data={history} onBack={() => setSelectedAgent(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Agent Leaderboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-project agent performance rankings with trend indicators
        </p>
      </div>

      <LeaderboardFilterBar filters={filters} onChange={setFilters} projects={projectList} />

      {leaderboard === undefined ? (
        timedOut ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            Unable to load leaderboard data. The backend may be unavailable.
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">Loading leaderboard…</div>
        )
      ) : (
        <LeaderboardTable entries={leaderboard} onSelectAgent={setSelectedAgent} />
      )}
    </div>
  )
}

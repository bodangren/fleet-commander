import type { ScoredCandidate } from '@/lib/fleetTypes'
import { Button } from '@/components/ui/button'

export type ProjectNextMissionProps = {
  nextTask: ScoredCandidate | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

/**
 * Renders the next-task recommendation and its refresh action for a project.
 * @param props - Recommendation state and refresh callback
 * @returns The next mission panel
 */
export function ProjectNextMission({
  nextTask,
  loading,
  error,
  onRefresh,
}: ProjectNextMissionProps) {
  return (
    <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Next Mission</h2>
            <div className="text-sm text-[#8a8f98]">Dispatcher scored high-intensity output</div>
          </div>
          {nextTask ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[#5e6ad2] text-white">
                  Score: {nextTask.score.toFixed(1)}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[#141516] text-[#8a8f98]">
                  ID: {nextTask.id}
                </span>
                {nextTask.agentTag ? (
                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]">
                    Agent: {nextTask.agentTag}
                  </span>
                ) : null}
              </div>
              <p className="text-lg font-medium">{nextTask.title}</p>
              {nextTask.rationale ? (
                <p className="text-xs text-[#8a8f98] bg-[#141516] p-3 rounded-md border-l-2 border-[#5e6ad2]">
                  {nextTask.rationale}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-[#8a8f98]">
                {loading ? 'Scanning...' : 'No tasks available'}
              </p>
              {error ? <p className="text-sm text-[#eb3d54]">{error}</p> : null}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onRefresh()}
          disabled={loading}
          aria-label="Refresh Next Task"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  )
}

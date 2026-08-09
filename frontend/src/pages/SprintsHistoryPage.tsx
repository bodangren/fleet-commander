import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useSprintHistory } from '@/hooks/useSprintHistory'
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout'
import { SprintHistoryTable } from '@/components/history/SprintHistoryTable'
import { SprintDetailView } from '@/components/history/SprintDetailView'
import { VelocityTrendChart } from '@/components/history/VelocityTrendChart'
import { ProjectScopeSelector } from '@/components/ProjectScopeSelector'
import { Button } from '@/components/ui/button'
import type { FleetDataState } from '@/lib/useFleetData'
import { useSelectedProject } from '@/lib/useSelectedProject'
import type { SprintHistoryItem } from '@/types/history'

/**
 * Sprint history page with project-scoped list and sprint detail views.
 * @returns Sprint history content for the current project scope
 */
export function SprintsHistoryPage() {
  const fleet = useOutletContext<FleetDataState | undefined>()
  const project = useSelectedProject(fleet?.projects ?? [])
  const projectsLoading = fleet?.projectsLoading ?? false
  const projectsError = fleet?.projectsError ?? null
  const [selectedSprint, setSelectedSprint] = useState<SprintHistoryItem | null>(null)
  const data = useSprintHistory()
  const timedOut = useLoadingTimeout(data === undefined)

  if (selectedSprint) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sprint History</h2>
        </div>
        <SprintDetailView sprint={selectedSprint} onBack={() => setSelectedSprint(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sprint History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Past sprints with performance metrics and retrospectives
        </p>
      </div>

      {fleet && !projectsLoading && !projectsError && (
        <ProjectScopeSelector projects={fleet.projects} selectedProject={project} />
      )}

      {fleet && projectsLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading imported projects…</div>
      ) : fleet && projectsError ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            Unable to load imported projects: {projectsError}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fleet.refreshProjects()}
          >
            Retry projects
          </Button>
        </div>
      ) : data === null ? (
        <div className="py-12 text-center text-muted-foreground">
          Select a valid project to view sprint history.
        </div>
      ) : data === undefined ? (
        timedOut ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            Unable to load sprint history. The backend may be unavailable.
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">Loading sprint history…</div>
        )
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No sprint history</div>
      ) : (
        <>
          <SprintHistoryTable sprints={data} onSelectSprint={setSelectedSprint} />
          <VelocityTrendChart sprints={data} />
        </>
      )}
    </div>
  )
}

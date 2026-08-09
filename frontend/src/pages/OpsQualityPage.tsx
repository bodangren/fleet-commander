import { QualityOperationsPanel } from './operations/QualityOperationsPanel'
import { EmptyState } from '@/components/EmptyState'
import { ProjectScopeSelector } from '@/components/ProjectScopeSelector'
import { Button } from '@/components/ui/button'
import { useOutletContext } from 'react-router-dom'
import type { FleetDataState } from '@/lib/useFleetData'
import { useSelectedProject } from '@/lib/useSelectedProject'

/**
 * Dedicated operations surface for quality run diagnose / retry.
 * Route: `/ops/quality`
 */
export function OpsQualityPage() {
  const fleet = useOutletContext<FleetDataState | undefined>()
  const project = useSelectedProject(fleet?.projects ?? [])
  const projectsLoading = fleet?.projectsLoading ?? false
  const projectsError = fleet?.projectsError ?? null

  if (!fleet || projectsLoading) {
    return <EmptyState text="Loading imported projects..." />
  }

  if (projectsError) {
    return (
      <div className="space-y-3 p-6 md:p-8">
        <EmptyState text={`Unable to load imported projects: ${projectsError}`} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void fleet.refreshProjects()}
        >
          Retry projects
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <ProjectScopeSelector projects={fleet.projects} selectedProject={project} />
      {project ? (
        <>
          <p className="mb-4 mt-4 text-xs text-muted-foreground">
            Project: {project.slug ?? project.id}
          </p>
          <QualityOperationsPanel projectSlug={project.slug ?? project.id} />
        </>
      ) : (
        <div className="mt-4">
          <EmptyState text="No project selected. Import or select a project before using quality operations." />
        </div>
      )}
    </div>
  )
}

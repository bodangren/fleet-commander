import { QualityProfileSection } from './QualityProfileSection'
import { EmptyState } from '@/components/EmptyState'
import { ProjectScopeSelector } from '@/components/ProjectScopeSelector'
import { Button } from '@/components/ui/button'
import { useOutletContext } from 'react-router-dom'
import type { FleetDataState } from '@/lib/useFleetData'
import { useSelectedProject } from '@/lib/useSelectedProject'

/**
 * Settings sub-page for quality workflow profile selection.
 * Uses the selected imported project from fleet context.
 */
export function QualitySettingsPage() {
  const fleet = useOutletContext<FleetDataState | undefined>()
  const project = useSelectedProject(fleet?.projects ?? [])
  const projectsLoading = fleet?.projectsLoading ?? false
  const projectsError = fleet?.projectsError ?? null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Quality</h2>
        <p className="text-sm text-muted-foreground">
          Choose the quality-workflow profile for project work and inspect ordered stages.
        </p>
      </div>
      {!fleet || projectsLoading ? (
        <EmptyState text="Loading imported projects..." />
      ) : projectsError ? (
        <div className="space-y-3">
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
      ) : (
        <>
          <ProjectScopeSelector projects={fleet.projects} selectedProject={project} />
          {project ? (
            <QualityProfileSection projectSlug={project.slug ?? project.id} />
          ) : (
            <EmptyState text="No project selected. Import or select a project before configuring quality." />
          )}
        </>
      )}
    </div>
  )
}

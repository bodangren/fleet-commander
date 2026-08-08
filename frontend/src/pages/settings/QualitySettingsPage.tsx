import { QualityProfileSection } from './QualityProfileSection'
import { EmptyState } from '@/components/EmptyState'
import { ProjectScopeSelector } from '@/components/ProjectScopeSelector'
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Quality</h2>
        <p className="text-sm text-muted-foreground">
          Choose the quality-workflow profile for project work and inspect ordered stages.
        </p>
      </div>
      {!fleet || fleet.loading ? (
        <EmptyState text="Loading imported projects..." />
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

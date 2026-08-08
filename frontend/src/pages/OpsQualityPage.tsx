import { QualityOperationsPanel } from './operations/QualityOperationsPanel'
import { EmptyState } from '@/components/EmptyState'
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

  if (!fleet || fleet.loading) {
    return <EmptyState text="Loading imported projects..." />
  }

  if (!project) {
    return (
      <EmptyState text="No project selected. Import or select a project before using quality operations." />
    )
  }

  return (
    <div className="p-6 md:p-8">
      <p className="mb-4 text-xs text-muted-foreground">Project: {project.slug ?? project.id}</p>
      <QualityOperationsPanel projectSlug={project.slug ?? project.id} />
    </div>
  )
}

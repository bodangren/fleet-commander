import { useSearchParams } from 'react-router-dom'

import type { ProjectSummary } from './fleetTypes'

/**
 * Resolves the project selected by the current route, falling back to the
 * only imported project when there is no explicit selection.
 *
 * @param projects - Imported projects available to the current fleet
 * @returns The selected project, or null when selection is required
 */
export function useSelectedProject(projects: ProjectSummary[]): ProjectSummary | null {
  const [searchParams] = useSearchParams()
  const requestedId = searchParams.get('project')

  if (requestedId) {
    return (
      projects.find(project => project.id === requestedId || project.slug === requestedId) ?? null
    )
  }

  return projects.length === 1 ? projects[0] : null
}

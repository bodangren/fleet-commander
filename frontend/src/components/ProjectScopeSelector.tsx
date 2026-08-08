import type { ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { ProjectSummary } from '@/lib/fleetTypes'

type ProjectScopeSelectorProps = {
  projects: ProjectSummary[]
  selectedProject: ProjectSummary | null
}

function projectScopeValue(project: ProjectSummary): string {
  return project.slug?.trim() || project.id
}

/**
 * Renders an accessible project scope selector backed by the current URL.
 * @param projects - Projects available to the current fleet
 * @param selectedProject - Project resolved from the current route
 * @returns Project selector that preserves unrelated query parameters
 */
export function ProjectScopeSelector({ projects, selectedProject }: ProjectScopeSelectorProps) {
  const [, setSearchParams] = useSearchParams()
  const selectedValue = selectedProject ? projectScopeValue(selectedProject) : ''

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextProject = projects.find(project => projectScopeValue(project) === event.target.value)
    if (!nextProject) return

    setSearchParams(
      current => {
        const next = new URLSearchParams(current)
        next.set('project', projectScopeValue(nextProject))
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor="project-scope-selector">
        Project
      </label>
      <select
        id="project-scope-selector"
        className="w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground appearance-none focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
        value={selectedValue}
        onChange={handleChange}
        disabled={projects.length === 0}
      >
        <option value="" disabled>
          Select a project...
        </option>
        {projects.map(project => {
          const value = projectScopeValue(project)
          return (
            <option key={project.id} value={value}>
              {project.name}
            </option>
          )
        })}
      </select>
    </div>
  )
}

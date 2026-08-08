import { useConvexQuery } from '@/lib/useConvexData'

export type Project = {
  id: string
  slug: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

/**
 * Hook fetching project list from Convex
 * @returns List of projects with loading state
 */
export function useProjectList() {
  const raw = useConvexQuery<
    Array<{
      _id: string
      slug: string
      name: string
      description: string
      createdAt: number
      updatedAt: number
    }>
  >('projects:listProjectsHandler', {}, true)

  if (raw === undefined) {
    return { projects: [] as Project[], loading: true, error: null }
  }

  const projects: Project[] = raw.map(p => ({
    id: p._id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))

  return { projects, loading: false, error: null }
}

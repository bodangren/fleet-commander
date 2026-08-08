import {
  useSprintHistoryQuery,
  useAgentHistoryQuery,
  useTaskHistoryQuery,
} from '@/lib/useConvexData'
import type {
  SprintHistoryItem,
  AgentHistoryItem,
  TaskHistoryItem,
} from '@/__fixtures__/historyFixtures'
import { usePortfolioData, type PortfolioProject } from './usePortfolioData'

const DEFAULT_LIMIT = 50

function selectHistoryProject(
  projects: PortfolioProject[] | undefined,
  projectParam: string | null | undefined,
): PortfolioProject | undefined {
  if (!projects) return undefined
  if (projectParam) {
    return projects.find(project => project._id === projectParam || project.slug === projectParam)
  }
  return projects.length === 1 ? projects[0] : undefined
}

/**
 * Fetches sprint history items from Convex query
 * @returns History rows, undefined while loading, or null when project selection is unavailable
 */
export function useSprintHistory(): SprintHistoryItem[] | undefined | null {
  const { projects, projectParam } = usePortfolioData()
  const project = selectHistoryProject(projects, projectParam)
  const history = useSprintHistoryQuery({
    projectId: project?._id ?? '',
    limit: DEFAULT_LIMIT,
  })
  if (projects !== undefined && !project) return null
  return history
}

/**
 * Fetches agent history items from Convex query
 * @returns Array of agent history items or undefined
 */
export function useAgentHistory(): AgentHistoryItem[] | undefined {
  return useAgentHistoryQuery({ limit: DEFAULT_LIMIT })
}

/**
 * Fetches task history items from Convex query
 * @returns History rows, undefined while loading, or null when project selection is unavailable
 */
export function useTaskHistory(): TaskHistoryItem[] | undefined | null {
  const { projects, projectParam } = usePortfolioData()
  const project = selectHistoryProject(projects, projectParam)
  const history = useTaskHistoryQuery({
    projectId: project?._id ?? '',
    limit: DEFAULT_LIMIT,
  })
  if (projects !== undefined && !project) return null
  return history
}

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

const DEFAULT_PROJECT = ''
const DEFAULT_LIMIT = 50

/**
 * Fetches sprint history items from Convex query
 * @returns Array of sprint history items or undefined
 */
export function useSprintHistory(): SprintHistoryItem[] | undefined {
  return useSprintHistoryQuery({ projectId: DEFAULT_PROJECT, limit: DEFAULT_LIMIT })
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
 * @returns Array of task history items or undefined
 */
export function useTaskHistory(): TaskHistoryItem[] | undefined {
  return useTaskHistoryQuery({ projectId: DEFAULT_PROJECT, limit: DEFAULT_LIMIT })
}

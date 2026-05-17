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

export function useSprintHistory(): SprintHistoryItem[] | undefined {
  return useSprintHistoryQuery({ projectId: DEFAULT_PROJECT, limit: DEFAULT_LIMIT })
}

export function useAgentHistory(): AgentHistoryItem[] | undefined {
  return useAgentHistoryQuery({ limit: DEFAULT_LIMIT })
}

export function useTaskHistory(): TaskHistoryItem[] | undefined {
  return useTaskHistoryQuery({ projectId: DEFAULT_PROJECT, limit: DEFAULT_LIMIT })
}

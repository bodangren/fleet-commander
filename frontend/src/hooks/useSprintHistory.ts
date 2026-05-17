import { useState, useEffect } from 'react'

import type {
  SprintHistoryItem,
  AgentHistoryItem,
  TaskHistoryItem,
} from '@/__fixtures__/historyFixtures'

export function useSprintHistory(): SprintHistoryItem[] | undefined {
  const [data, setData] = useState<SprintHistoryItem[] | undefined>(undefined)

  useEffect(() => {
    // TODO: wire to Convex query
    setData(undefined)
  }, [])

  return data
}

export function useAgentHistory(): AgentHistoryItem[] | undefined {
  const [data, setData] = useState<AgentHistoryItem[] | undefined>(undefined)

  useEffect(() => {
    // TODO: wire to Convex query
    setData(undefined)
  }, [])

  return data
}

export function useTaskHistory(): TaskHistoryItem[] | undefined {
  const [data, setData] = useState<TaskHistoryItem[] | undefined>(undefined)

  useEffect(() => {
    // TODO: wire to Convex query
    setData(undefined)
  }, [])

  return data
}

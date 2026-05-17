import { useMemo } from 'react'

import type {
  MockSprint,
  MockAgent,
  MockActivityItem,
  MockAlert,
  MockKeyMetrics,
} from '@/__fixtures__/dashboardFixtures'

import { useActiveSprint } from '@/lib/useFleetApi'
import { useAgentWorkload, useAlerts } from '@/lib/useFleetApi'
import { useGovernanceEvents, useFleetHealth, useQueueHealth } from '@/lib/useConvexData'

function deriveAgentStatus(
  circuitState?: 'closed' | 'open' | 'half-open',
  hasCurrentTask?: boolean,
): MockAgent['status'] {
  if (circuitState === 'open') return 'Blocked'
  if (!hasCurrentTask) return 'Idle'
  return 'Active'
}

export function useDashboardSprint(): MockSprint | undefined {
  const { data } = useActiveSprint(undefined)
  return useMemo(() => {
    if (!data) return undefined
    return {
      name: data.name,
      status: data.status,
      budget: { actual: 0, estimated: 0 },
      tasks: { done: 0, total: data.taskKeys.length },
      points: { delivered: 0, estimated: 0 },
    }
  }, [data])
}

export function useDashboardAgents(): MockAgent[] | undefined {
  const { data } = useAgentWorkload()
  return useMemo(() => {
    if (!data) return undefined
    return data.map(agent => ({
      name: agent.name,
      displayName: agent.displayName,
      status: deriveAgentStatus(agent.circuitState, Boolean(agent.currentTask)),
      currentTask: agent.currentTask?.title ?? '',
    }))
  }, [data])
}

export function useDashboardActivity(): MockActivityItem[] | undefined {
  const events = useGovernanceEvents()
  return useMemo(() => {
    if (!events) return undefined
    return events.map(event => {
      let type: MockActivityItem['type'] = 'blocked'
      const ev = event.eventType
      if (ev.includes('merge') || ev.includes('completed')) type = 'merge'
      else if (ev.includes('dispatch') || ev.includes('start')) type = 'dispatch'
      else if (ev.includes('block') || ev.includes('stall')) type = 'blocked'

      let task = ''
      let cost = 0
      let agent = event.scope
      try {
        const payload = JSON.parse(event.payloadJson) as Record<string, unknown>
        task = (payload.task as string) ?? ''
        cost = (payload.cost as number) ?? 0
        agent = (payload.agent as string) ?? agent
      } catch {
        // use defaults
      }

      return { type, agent, task, cost, timestamp: event.createdAt }
    })
  }, [events])
}

export function useDashboardAlerts(): MockAlert[] | undefined {
  const { data } = useAlerts()
  return useMemo(() => {
    if (!data) return undefined
    return data.map(alert => ({
      type: alert.type,
      severity: alert.severity as MockAlert['severity'],
      message: alert.message,
      resolved: alert.resolved,
    }))
  }, [data])
}

export function useDashboardMetrics(): MockKeyMetrics | undefined {
  const health = useFleetHealth()
  const queue = useQueueHealth()
  return useMemo(() => {
    if (!health && !queue) return undefined
    const dispatch = health?.dispatchStats[0]
    return {
      deliveryRate:
        queue && queue.doneCount + queue.readyCount + queue.inProgressCount + queue.blockedCount > 0
          ? queue.doneCount /
            (queue.doneCount + queue.readyCount + queue.inProgressCount + queue.blockedCount)
          : 0,
      successRate:
        dispatch && !dispatch.insufficientData
          ? (1 - dispatch.reviewFailRate) * 100
          : 0,
      pipelineTime: dispatch?.p50Cost ?? 0,
      rejectionRate: dispatch ? dispatch.reviewFailRate * 100 : 0,
    }
  }, [health, queue])
}

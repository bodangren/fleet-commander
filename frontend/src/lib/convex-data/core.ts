import { useEffect, useState } from 'react'

import type { AgentRecord, HarnessRecord, ProjectSummary } from '../fleetTypes'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

export interface CoverageDisplay {
  projectSlug: string
  projectId: string
  percentage: number
  tool: string
  executionId: string | undefined
  date: Date
}

/**
 * Converts a raw Convex coverage record into the display format used by charts.
 */
export function convexCoverageRecordToDisplay(record: {
  projectSlug: string
  projectId: string
  percentage: number
  tool: string
  executionId?: string
  createdAt: number
}): CoverageDisplay {
  return {
    projectSlug: record.projectSlug,
    projectId: record.projectId,
    percentage: record.percentage,
    tool: record.tool,
    executionId: record.executionId,
    date: new Date(record.createdAt),
  }
}

/**
 * Parses a JSON string of tool flags, returning an empty object on failure.
 */
export function parseToolsJson(toolsJson: string): Record<string, boolean> {
  try {
    return JSON.parse(toolsJson) as Record<string, boolean>
  } catch {
    return {}
  }
}

/**
 * Maps a Convex project row to the frontend ProjectSummary shape.
 */
export function convexProjectToSummary(project: {
  slug: string
  name: string
  rootPath: string
  status: string
  updatedAt: number
}): ProjectSummary {
  return {
    id: project.slug,
    name: project.name,
    path: project.rootPath,
    tracks: [],
    lastUpdated: project.updatedAt,
  }
}

/**
 * Maps a Convex agent row to the frontend AgentRecord shape.
 */
export function convexAgentToRecord(agent: {
  name: string
  displayName: string
  mode: string
  model: string
  temperature: number
  prompt: string
  toolsJson: string
}): AgentRecord {
  return {
    layer: 'convex',
    definition: {
      name: agent.name,
      description: agent.displayName,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature,
      tools: parseToolsJson(agent.toolsJson),
      body: agent.prompt,
    },
  }
}

/**
 * Maps a Convex harness row to the frontend HarnessRecord shape.
 */
export function convexHarnessToRecord(harness: {
  name: string
  commandTemplate: string
  discoveryCommand?: string
}): HarnessRecord {
  return {
    layer: 'convex',
    binaryFound: true,
    definition: {
      name: harness.name,
      binary: '',
      discovery: {
        command: harness.discoveryCommand ?? '',
        parseStrategy: 'lines',
        pattern: '',
      },
      invocation: {
        template: harness.commandTemplate,
        flags: {},
      },
    },
  }
}

/**
 * Subscribe to a Convex query imperatively (no React provider required).
 * Returns undefined when Convex is not configured or client unavailable.
 * @param onError - Optional callback for query or connection failures
 */
export function useConvexQuery<T>(
  queryName: string,
  args: Record<string, unknown>,
  enabled: boolean,
  onError?: (error: unknown) => void,
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined)
  const argsKey = JSON.stringify(args)

  useEffect(() => {
    if (!enabled || !convexUrl) {
      setData(undefined)
      if (enabled && !convexUrl) {
        onError?.(new Error('Convex is not configured'))
      }
      return
    }

    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any
    let unsubscribe: (() => void) | undefined

    import('convex/browser')
      .then(({ ConvexClient }) => {
        if (cancelled) return
        client = new ConvexClient(convexUrl)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unsubscribe = (client as any).onUpdate(
          queryName,
          args,
          (result: T) => {
            if (!cancelled) {
              setData(result)
            }
          },
          (error: unknown) => {
            if (!cancelled) {
              onError?.(error)
            }
          },
        ) as () => void
      })
      .catch(() => {
        if (!cancelled) {
          onError?.(new Error(`Unable to load ${queryName}`))
        }
      })

    return () => {
      cancelled = true
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
      if (client && typeof client.close === 'function') {
        client.close()
      }
    }
  }, [queryName, argsKey, enabled, onError])

  return data
}

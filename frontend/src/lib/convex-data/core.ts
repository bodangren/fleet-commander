import { useEffect, useRef, useState } from 'react'

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
  _id: string
  slug: string
  name: string
  description: string
  path?: string
  createdAt: number
  updatedAt: number
}): ProjectSummary {
  return {
    id: project._id,
    slug: project.slug,
    name: project.name,
    path: project.path ?? '',
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
 * Returns only data delivered by the current successful subscription. A
 * previous result is retained by the state hook, but is not exposed while a
 * refresh is pending or after the subscription reports an error.
 * @param queryName - Public Convex query name
 * @param args - Query arguments
 * @param enabled - Whether the subscription should be opened
 * @param onError - Optional callback for query or connection failures
 * @param refreshKey - Changes when the caller requests a fresh subscription
 * @returns Current data for a ready subscription, or undefined otherwise
 */
export function useConvexQuery<T>(
  queryName: string,
  args: Record<string, unknown>,
  enabled: boolean,
  onError?: (error: unknown) => void,
  refreshKey = 0,
): T | undefined {
  return useConvexQueryState<T>(queryName, args, enabled, onError, refreshKey).data
}

/**
 * Subscribe to a Convex query and retain failures for truthful read states.
 * @param queryName - Public Convex query name
 * @param args - Query arguments
 * @param enabled - Whether the subscription should be opened
 * @param onError - Optional callback for query or connection failures
 * @param refreshKey - Changes when the caller requests a fresh subscription
 * @returns Current query data and any connection/query error
 */
export function useConvexQueryState<T>(
  queryName: string,
  args: Record<string, unknown>,
  enabled: boolean,
  onError?: (error: unknown) => void,
  refreshKey = 0,
): {
  data: T | undefined
  error: Error | null
} {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [ready, setReady] = useState(false)
  const argsKey = JSON.stringify(args)
  const requestKey = JSON.stringify([queryName, argsKey, enabled, refreshKey])
  const committedRequestKey = useRef<string | null>(null)
  const generationRef = useRef(0)
  const requestChanged = committedRequestKey.current !== requestKey

  useEffect(() => {
    const subscriptionGeneration = generationRef.current + 1
    generationRef.current = subscriptionGeneration
    committedRequestKey.current = requestKey
    setReady(false)
    setError(null)
    if (!enabled || !convexUrl) {
      if (enabled && !convexUrl) {
        const nextError = new Error('Convex is not configured')
        setError(nextError)
        onError?.(nextError)
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
            if (
              !cancelled &&
              generationRef.current === subscriptionGeneration &&
              committedRequestKey.current === requestKey
            ) {
              setError(null)
              setReady(true)
              setData(result)
            }
          },
          (error: unknown) => {
            if (
              !cancelled &&
              generationRef.current === subscriptionGeneration &&
              committedRequestKey.current === requestKey
            ) {
              const nextError = error instanceof Error ? error : new Error(String(error))
              setReady(false)
              setError(nextError)
              onError?.(error)
            }
          },
        ) as () => void
      })
      .catch(() => {
        if (
          !cancelled &&
          generationRef.current === subscriptionGeneration &&
          committedRequestKey.current === requestKey
        ) {
          const nextError = new Error(`Unable to load ${queryName}`)
          setReady(false)
          setError(nextError)
          onError?.(nextError)
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
  }, [argsKey, enabled, onError, queryName, requestKey])

  const effectiveReady = !requestChanged && ready
  const effectiveError = requestChanged ? null : error

  return {
    data: effectiveReady ? data : undefined,
    error: effectiveError,
  }
}

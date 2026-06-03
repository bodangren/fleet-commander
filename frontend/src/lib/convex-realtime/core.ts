import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from '../convex-data/core'

/**
 * Check if Convex backend is enabled via slice config.
 */
function isConvexEnabled(): boolean {
  return getSliceConfig().projects === 'convex'
}

/**
 * Generic real-time query hook with enable/disable flag.
 */
export function useRealtime<T>(queryName: string, args: Record<string, unknown>): T | undefined {
  const enabled = isConvexEnabled()
  return useConvexQuery<T>(queryName, args, enabled)
}

/**
 * Real-time query hook that auto-enables when projectId is provided.
 */
export function useRealtimeWithProject<T>(
  queryName: string,
  projectId: string | undefined,
): T | undefined {
  const enabled = isConvexEnabled() && Boolean(projectId)
  return useConvexQuery<T>(queryName, { projectId: projectId ?? '' }, enabled)
}

/**
 * Real-time query hook with dynamic parameter filtering.
 */
export function useRealtimeWithParam<T>(
  queryName: string,
  paramName: string,
  paramValue: string | undefined,
): T | undefined {
  const enabled = isConvexEnabled() && Boolean(paramValue)
  return useConvexQuery<T>(queryName, { [paramName]: paramValue ?? '' }, enabled)
}

export type AnalyticsArgs = {
  days?: number
  projectSlug?: string
  agent?: string
  priority?: string
}

export type ProjectSlugArgs = {
  days?: number
  projectSlug?: string
}

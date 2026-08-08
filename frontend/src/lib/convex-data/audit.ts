import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery, useConvexQueryState } from './core'
import type { ConvexQueryState } from './types'

export interface AuditEventEntry {
  _id: string
  type: string
  projectSlug?: string
  trackId?: string
  taskKey?: string
  agentId?: string
  agentName?: string
  severity?: string
  message: string
  createdAt: number
}

/**
 * Returns audit events with an explicit loading/error state.
 * @param type - Optional event type filter
 * @param agentId - Optional agent filter
 * @param limit - Maximum number of events
 * @returns Query state for audit events
 */
export function useAuditEventsState(
  type?: string,
  agentId?: string,
  limit: number = 100,
): ConvexQueryState<AuditEventEntry[]> {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const state = useConvexQueryState<AuditEventEntry[]>(
    'audit:listAuditEventsHandler',
    { type, agentId, limit },
    enabled,
  )
  if (!enabled && state.data === undefined) return { data: [], error: null, loading: false }
  return { ...state, loading: enabled && state.data === undefined && state.error === null }
}

/**
 * Returns audit events with optional type and agent filtering.
 * Returns an empty array when Convex is not configured.
 */
export function useAuditEvents(
  type?: string,
  agentId?: string,
  limit: number = 100,
): AuditEventEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      _id: string
      type: string
      projectSlug?: string
      trackId?: string
      taskKey?: string
      agentId?: string
      agentName?: string
      severity?: string
      message: string
      createdAt: number
    }>
  >('audit:listAuditEventsHandler', { type, agentId, limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

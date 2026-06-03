import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'

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
  >('audit:listAuditEvents', { type, agentId, limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery, useConvexQueryState } from './core'
import type { ConvexQueryState } from './types'

export interface ReconciliationEventEntry {
  projectSlug: string
  artifactType: string
  artifactId: string
  divergenceType: string
  conductorHash: string
  canonicalHash: string
  description: string
  counter: number
  createdAt: number
}

/**
 * Returns recent reconciliation events.
 * Returns an empty array when Convex is not configured.
 */
export function useReconciliationEvents(
  limit: number = 50,
): ReconciliationEventEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      projectSlug: string
      artifactType: string
      artifactId: string
      divergenceType: string
      conductorHash: string
      canonicalHash: string
      description: string
      counter: number
      createdAt: number
    }>
  >('reconciliationEvents:listRecent', { limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

export interface ReconciliationProposalEntry {
  _id: string
  projectSlug: string
  artifactType: string
  artifactId: string
  patchJson: string
  sourceSide: string
  reason: string
  status: string
  createdAt: number
}

/**
 * Returns pending reconciliation proposals with explicit read state.
 * @param projectSlug - Selected or sole imported project slug
 * @param limit - Maximum number of proposals
 * @returns Query state for reconciliation proposals
 */
export function useReconciliationProposalsState(
  projectSlug?: string,
  limit: number = 50,
): ConvexQueryState<ReconciliationProposalEntry[]> {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const state = useConvexQueryState<ReconciliationProposalEntry[]>(
    'reconciliationProposals:listPendingProposals',
    { projectSlug: projectSlug ?? '', limit },
    enabled,
  )
  if (!enabled && state.data === undefined) return { data: [], error: null, loading: false }
  return { ...state, loading: enabled && state.data === undefined && state.error === null }
}

/**
 * Returns pending reconciliation proposals with optional project filtering.
 * Returns an empty array when Convex is not configured.
 */
export function useReconciliationProposals(
  projectSlug?: string,
  limit: number = 50,
): ReconciliationProposalEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const queryName = 'reconciliationProposals:listPendingProposals'
  const args = { projectSlug: projectSlug ?? '', limit }
  const raw = useConvexQuery<
    Array<{
      _id: string
      projectSlug: string
      artifactType: string
      artifactId: string
      patchJson: string
      sourceSide: string
      reason: string
      status: string
      createdAt: number
    }>
  >(queryName, args, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

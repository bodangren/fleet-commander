import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery, convexCoverageRecordToDisplay } from './core'
import type { CoverageDisplay } from './core'

/**
 * Returns coverage history for a project.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useCoverageHistory(
  projectSlug: string | undefined,
  limit?: number,
): CoverageDisplay[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const raw = useConvexQuery<
    Array<{
      projectSlug: string
      projectId: string
      percentage: number
      tool: string
      executionId?: string
      createdAt: number
    }>
  >('coverageRecords:getCoverageHistory', { projectSlug: projectSlug ?? '', limit }, enabled)
  if (raw === undefined) return undefined
  return raw.map(convexCoverageRecordToDisplay)
}

/**
 * Returns the latest coverage for a project.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useLatestCoverage(
  projectSlug: string | undefined,
): CoverageDisplay | null | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const raw = useConvexQuery<{
    projectSlug: string
    projectId: string
    percentage: number
    tool: string
    executionId?: string
    createdAt: number
  } | null>('coverageRecords:getLatestCoverage', { projectSlug: projectSlug ?? '' }, enabled)
  if (raw === undefined) return undefined
  return raw ? convexCoverageRecordToDisplay(raw) : null
}

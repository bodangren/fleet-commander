import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'

export interface AnalysisResultEntry {
  projectSlug: string
  executionId: string
  tool: string
  file: string
  line?: number
  column?: number
  severity: 'error' | 'warning' | 'info'
  message: string
  rule?: string
  createdAt: number
}

/**
 * Returns analysis results for a specific execution.
 * Returns an empty array when Convex is not configured.
 */
export function useAnalysisByExecution(
  executionId: string | undefined,
): AnalysisResultEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(executionId)
  const raw = useConvexQuery<
    Array<{
      projectSlug: string
      executionId: string
      tool: string
      file: string
      line?: number
      column?: number
      severity: 'error' | 'warning' | 'info'
      message: string
      rule?: string
      createdAt: number
    }>
  >('analysisResults:getAnalysisByExecution', { executionId: executionId ?? '' }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

/**
 * Returns analysis results for a project.
 * Returns an empty array when Convex is not configured.
 */
export function useAnalysisByProject(
  projectSlug: string | undefined,
  limit: number = 100,
): AnalysisResultEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const raw = useConvexQuery<
    Array<{
      projectSlug: string
      executionId: string
      tool: string
      file: string
      line?: number
      column?: number
      severity: 'error' | 'warning' | 'info'
      message: string
      rule?: string
      createdAt: number
    }>
  >('analysisResults:getAnalysisByProject', { projectSlug: projectSlug ?? '', limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

export interface AnalysisHistoryEntry {
  executionId: string
  tool: string
  errorCount: number
  warningCount: number
  infoCount: number
  createdAt: number
}

/**
 * Returns analysis history for a project.
 * Returns an empty array when Convex is not configured.
 */
export function useAnalysisHistory(
  projectSlug: string | undefined,
  limit: number = 50,
): AnalysisHistoryEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const raw = useConvexQuery<
    Array<{
      executionId: string
      tool: string
      errorCount: number
      warningCount: number
      infoCount: number
      createdAt: number
    }>
  >('analysisResults:getAnalysisHistory', { projectSlug: projectSlug ?? '', limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

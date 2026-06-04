import type { PipelineRun } from '@/hooks/useTaskTimeline'
import { formatDuration } from '@/lib/formatDuration'

export const STAGES = ['dispatch', 'architect', 'executor', 'reviewer', 'merger'] as const

export { formatDuration }

/**
 * Get status (done/active/pending) for a pipeline stage from runs array
 * @param stage - The stage name to look up
 * @param runs - Array of pipeline runs
 * @returns Object with status and matching run if found
 */
export function getStageStatus(
  stage: string,
  runs: PipelineRun[],
): { status: 'done' | 'active' | 'pending'; run?: PipelineRun } {
  const run = runs.find(r => r.stage === stage)
  if (!run) return { status: 'pending' }
  if (run.status === 'completed') return { status: 'done', run }
  if (run.status === 'running') return { status: 'active', run }
  if (run.status === 'failed') return { status: 'done', run }
  return { status: 'pending', run }
}

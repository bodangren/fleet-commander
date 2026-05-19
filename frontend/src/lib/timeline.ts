import type { PipelineRun } from '@/hooks/useTaskTimeline'

export const STAGES = ['dispatch', 'architect', 'executor', 'reviewer', 'merger'] as const

export function formatDuration(ms: number): string {
  if (ms < 60000) {
    const s = Math.floor(ms / 1000)
    return `${s}s`
  }
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

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

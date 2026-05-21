import { useConvexQuery } from '@/lib/useConvexData'

interface PipelineExecution {
  executionId: string
  pipelineName: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  startedAt: number
  completedAt?: number
}

export function usePipelineList() {
  const data = useConvexQuery<PipelineExecution[]>('pipelines:listPipelines', {}, true)

  if (data === undefined) {
    return { executions: [] as PipelineExecution[], loading: true, error: null, refresh: () => {} }
  }

  return { executions: data, loading: false, error: null, refresh: () => {} }
}

export async function triggerPipeline(
  name: string,
  options?: { env?: Record<string, string>; projectId?: string },
): Promise<{ executionId: string; status: string }> {
  const response = await fetch(`/api/pipelines/${name}/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options ?? {}),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(
      body.message || body.error || `Failed to trigger pipeline: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function getPipelineStatus(name: string) {
  const response = await fetch(`/api/pipelines/${name}/status`)

  if (!response.ok) {
    throw new Error(`Failed to fetch pipeline status: ${response.statusText}`)
  }

  return response.json()
}

export async function getPipelineLogs(executionId: string) {
  const response = await fetch(`/api/pipelines/${executionId}/logs`)

  if (!response.ok) {
    throw new Error(`Failed to fetch pipeline logs: ${response.statusText}`)
  }

  return response.json()
}

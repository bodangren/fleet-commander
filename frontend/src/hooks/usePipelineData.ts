import { useCallback, useEffect, useState } from 'react'

interface PipelineExecution {
  executionId: string
  pipelineName: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  startedAt: number
  completedAt?: number
}

/**
 * Hook managing pipeline executions list with refresh
 * @returns Pipeline executions list with loading, error, and refresh functions
 */
export function usePipelineList() {
  const [executions, setExecutions] = useState<PipelineExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pipelines')
      if (!response.ok) {
        setError('Failed to fetch executions')
        setLoading(false)
        return
      }
      const data = await response.json()
      if (!Array.isArray(data)) {
        setError('Failed to fetch executions')
        setLoading(false)
        return
      }
      setExecutions(data)
    } catch {
      setError('Failed to fetch executions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { executions, loading, error, refresh: fetchData }
}

/**
 * Triggers a pipeline execution via API
 * @param name - Pipeline name to trigger
 * @param options - Optional environment variables and project ID
 * @returns Execution ID and status from the API
 */
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

/**
 * Fetches pipeline status via API
 * @param name - Pipeline name to get status for
 * @returns Pipeline status data from API
 */
export async function getPipelineStatus(name: string) {
  const response = await fetch(`/api/pipelines/${name}/status`)

  if (!response.ok) {
    throw new Error(`Failed to fetch pipeline status: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetches pipeline execution logs via API
 * @param executionId - Execution ID to fetch logs for
 * @returns Pipeline logs data from API
 */
export async function getPipelineLogs(executionId: string) {
  const response = await fetch(`/api/pipelines/${executionId}/logs`)

  if (!response.ok) {
    throw new Error(`Failed to fetch pipeline logs: ${response.statusText}`)
  }

  return response.json()
}

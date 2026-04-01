import { useCallback, useState } from 'react'

import type { TaskReviewResponse } from '@/lib/fleetTypes'

export type UseTaskReviewReturn = {
  review: TaskReviewResponse | null
  loading: boolean
  error: string | null
  fetchReview: (taskId: string) => Promise<void>
  clearReview: () => void
}

export function useTaskReview(projectId: string | undefined): UseTaskReviewReturn {
  const [review, setReview] = useState<TaskReviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReview = useCallback(
    async (taskId: string) => {
      if (!projectId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/review`,
        )
        const payload = (await response.json()) as TaskReviewResponse & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load review results')
        }
        setReview(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [projectId],
  )

  const clearReview = useCallback(() => {
    setReview(null)
    setError(null)
  }, [])

  return { review, loading, error, fetchReview, clearReview }
}

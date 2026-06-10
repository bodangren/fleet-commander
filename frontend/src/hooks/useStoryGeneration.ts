import { useCallback, useState } from 'react'

import type { GeneratedStoryPreview } from '@/components/GenerateStoriesModal'

export interface UseStoryGenerationReturn {
  showModal: boolean
  generating: boolean
  committing: boolean
  error: string | null
  stories: GeneratedStoryPreview[] | null
  openModal: () => void
  closeModal: () => void
  handleGenerate: (goal: string) => Promise<void>
  handleCommit: (stories: GeneratedStoryPreview[]) => Promise<void>
}

/**
 * Encapsulates the AI story generation flow for a track: open modal,
 * call the generate endpoint, then commit accepted stories.
 * @param projectId - Project Convex id (route param)
 * @param trackId - Track identifier to target; when missing, requests no-op
 * @returns Modal state + generate/commit handlers
 */
export function useStoryGeneration(
  projectId: string | undefined,
  trackId: string | undefined,
): UseStoryGenerationReturn {
  const [showModal, setShowModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stories, setStories] = useState<GeneratedStoryPreview[] | null>(null)

  const openModal = useCallback(() => {
    setShowModal(true)
    setError(null)
    setStories(null)
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setError(null)
    setStories(null)
    setGenerating(false)
    setCommitting(false)
  }, [])

  const handleGenerate = useCallback(
    async (goal: string) => {
      if (!projectId || !trackId) return
      setGenerating(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/tracks/${encodeURIComponent(trackId)}/generate`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ goal: goal || undefined }),
          },
        )
        const body = await response.json()
        if (!response.ok) {
          throw new Error(body.error ?? 'Generation failed')
        }
        setStories(body.stories as GeneratedStoryPreview[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setGenerating(false)
      }
    },
    [projectId, trackId],
  )

  const handleCommit = useCallback(
    async (committed: GeneratedStoryPreview[]) => {
      if (!projectId || !trackId) return
      setCommitting(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/tracks/${encodeURIComponent(trackId)}/generate/commit`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ stories: committed }),
          },
        )
        const body = await response.json()
        if (!response.ok) {
          throw new Error(body.error ?? 'Commit failed')
        }
        setShowModal(false)
        setStories(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setCommitting(false)
      }
    },
    [projectId, trackId],
  )

  return {
    showModal,
    generating,
    committing,
    error,
    stories,
    openModal,
    closeModal,
    handleGenerate,
    handleCommit,
  }
}

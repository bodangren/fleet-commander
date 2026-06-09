import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { NewSprintModalSubmit } from '@/components/NewSprintModal'

export interface UseCreateSprintReturn {
  showNewSprint: boolean
  newSprintSaving: boolean
  newSprintError: string | null
  openNewSprint: () => void
  closeNewSprint: () => void
  handleCreateSprint: (payload: NewSprintModalSubmit) => Promise<void>
}

/**
 * Encapsulates the "New Sprint" modal state and POST + navigation flow.
 * @param projectId - Project Convex id (route param). When undefined, submit no-ops.
 * @returns Open/close handlers, modal state, and submit handler suitable for `NewSprintModal`.
 */
export function useCreateSprint(projectId: string | undefined): UseCreateSprintReturn {
  const navigate = useNavigate()
  const [showNewSprint, setShowNewSprint] = useState(false)
  const [newSprintSaving, setNewSprintSaving] = useState(false)
  const [newSprintError, setNewSprintError] = useState<string | null>(null)

  const openNewSprint = useCallback(() => {
    setNewSprintError(null)
    setShowNewSprint(true)
  }, [])

  const closeNewSprint = useCallback(() => {
    setShowNewSprint(false)
  }, [])

  const handleCreateSprint = useCallback(
    async (payload: NewSprintModalSubmit) => {
      if (!projectId) return
      setNewSprintSaving(true)
      setNewSprintError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/tracks`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await response.json()
        if (!response.ok) {
          throw new Error(body.error ?? 'Failed to create sprint')
        }
        setShowNewSprint(false)
        const trackId: string = body.trackId ?? ''
        const target = trackId
          ? `/project/${encodeURIComponent(projectId)}?track=${encodeURIComponent(trackId)}`
          : `/project/${encodeURIComponent(projectId)}`
        navigate(target)
      } catch (err) {
        setNewSprintError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setNewSprintSaving(false)
      }
    },
    [navigate, projectId],
  )

  return {
    showNewSprint,
    newSprintSaving,
    newSprintError,
    openNewSprint,
    closeNewSprint,
    handleCreateSprint,
  }
}

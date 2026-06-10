import { useCallback, useMemo, useState } from 'react'

import { convexClient } from '@/lib/convex'
import { api } from '@convex/_generated/api'
import type { SaveAsTemplatePayload } from '@/components/SaveAsTemplateModal'
import type { ProjectDetail } from '@/lib/fleetTypes'

interface SaveAsTemplateTask {
  _id: string
  title: string
  storyPoints: number
  priority: 'medium'
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
}

export interface UseSaveAsTemplateReturn {
  showSaveAsTemplate: boolean
  openSaveAsTemplate: () => void
  closeSaveAsTemplate: () => void
  tasks: SaveAsTemplateTask[]
  handleSaveAsTemplate: (payload: SaveAsTemplatePayload) => Promise<void>
}

/**
 * Encapsulates the "Save as Template" modal state, derived task list, and
 * Convex mutation call.
 * @param project - Loaded project (or null while loading)
 * @returns Modal handlers, flattened task list, and submit handler
 */
export function useSaveAsTemplate(
  project: ProjectDetail | null | undefined,
): UseSaveAsTemplateReturn {
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)

  const tasks = useMemo<SaveAsTemplateTask[]>(
    () =>
      (project?.tracks ?? []).flatMap(track =>
        (track.phases ?? []).flatMap(phase =>
          (phase.tasks ?? []).map(task => ({
            _id: task.id,
            title: task.description,
            storyPoints: 1,
            priority: 'medium' as const,
            status: task.status as SaveAsTemplateTask['status'],
          })),
        ),
      ),
    [project],
  )

  const openSaveAsTemplate = useCallback(() => setShowSaveAsTemplate(true), [])
  const closeSaveAsTemplate = useCallback(() => setShowSaveAsTemplate(false), [])

  const handleSaveAsTemplate = useCallback(async (payload: SaveAsTemplatePayload) => {
    if (!convexClient) return
    await convexClient.mutation(api.projectTemplates.createProjectTemplateHandler, payload)
    setShowSaveAsTemplate(false)
  }, [])

  return {
    showSaveAsTemplate,
    openSaveAsTemplate,
    closeSaveAsTemplate,
    tasks,
    handleSaveAsTemplate,
  }
}

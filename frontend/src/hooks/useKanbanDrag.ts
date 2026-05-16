import { useCallback, useState } from 'react'

import { isValidStatusTransition } from '@/lib/kanban'

export function useKanbanDrag() {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback((taskId: string) => {
    setDraggedTaskId(taskId)
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((columnId: string) => {
    setDragOverColumnId(columnId)
  }, [])

  const handleDrop = useCallback(
    (onDrop: (taskId: string, columnId: string) => void) => {
      if (draggedTaskId && dragOverColumnId) {
        onDrop(draggedTaskId, dragOverColumnId)
      }
      setDraggedTaskId(null)
      setDragOverColumnId(null)
      setIsDragging(false)
    },
    [draggedTaskId, dragOverColumnId],
  )

  const resetDrag = useCallback(() => {
    setDraggedTaskId(null)
    setDragOverColumnId(null)
    setIsDragging(false)
  }, [])

  const isValidTransition = useCallback(
    (from: string, to: string) => isValidStatusTransition(from, to),
    [],
  )

  return {
    draggedTaskId,
    dragOverColumnId,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDrag,
    isValidTransition,
  }
}

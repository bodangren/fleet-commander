import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useKanbanDrag } from '@/hooks/useKanbanDrag'

describe('useKanbanDrag', () => {
  it('returns initial state with no drag', () => {
    const { result } = renderHook(() => useKanbanDrag())

    expect(result.current.draggedTaskId).toBeNull()
    expect(result.current.dragOverColumnId).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })

  it('sets draggedTaskId on drag start', () => {
    const { result } = renderHook(() => useKanbanDrag())

    act(() => {
      result.current.handleDragStart('task-1')
    })

    expect(result.current.draggedTaskId).toBe('task-1')
    expect(result.current.isDragging).toBe(true)
  })

  it('sets dragOverColumnId on drag over', () => {
    const { result } = renderHook(() => useKanbanDrag())

    act(() => {
      result.current.handleDragOver('col-2')
    })

    expect(result.current.dragOverColumnId).toBe('col-2')
  })

  it('clears state and calls callback on drop', () => {
    const onDrop = vi.fn()
    const { result } = renderHook(() => useKanbanDrag())

    act(() => {
      result.current.handleDragStart('task-1')
      result.current.handleDragOver('col-2')
    })

    act(() => {
      result.current.handleDrop(onDrop)
    })

    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop).toHaveBeenCalledWith('task-1', 'col-2')
    expect(result.current.draggedTaskId).toBeNull()
    expect(result.current.dragOverColumnId).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })

  it('does not call callback when no task is being dragged', () => {
    const onDrop = vi.fn()
    const { result } = renderHook(() => useKanbanDrag())

    act(() => {
      result.current.handleDrop(onDrop)
    })

    expect(onDrop).not.toHaveBeenCalled()
  })

  it('returns true for valid status transitions', () => {
    const { result } = renderHook(() => useKanbanDrag())

    expect(result.current.isValidTransition('backlog', 'ready')).toBe(true)
    expect(result.current.isValidTransition('ready', 'in_progress')).toBe(true)
    expect(result.current.isValidTransition('in_progress', 'review')).toBe(true)
    expect(result.current.isValidTransition('review', 'done')).toBe(true)
  })

  it('returns false for invalid status transitions', () => {
    const { result } = renderHook(() => useKanbanDrag())

    expect(result.current.isValidTransition('done', 'backlog')).toBe(false)
    expect(result.current.isValidTransition('blocked', 'ready')).toBe(true)
    expect(result.current.isValidTransition('done', 'in_progress')).toBe(false)
  })

  it('allows backward transition from in_progress to ready', () => {
    const { result } = renderHook(() => useKanbanDrag())

    expect(result.current.isValidTransition('in_progress', 'ready')).toBe(true)
  })

  it('resets drag state explicitly', () => {
    const { result } = renderHook(() => useKanbanDrag())

    act(() => {
      result.current.handleDragStart('task-1')
      result.current.handleDragOver('col-2')
    })

    act(() => {
      result.current.resetDrag()
    })

    expect(result.current.draggedTaskId).toBeNull()
    expect(result.current.dragOverColumnId).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })
})

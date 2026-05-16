import { describe, expect, it } from 'vitest'
import {
  groupTasksByColumn,
  isValidStatusTransition,
  mapStatusToColumn,
} from '@/lib/kanban'

describe('groupTasksByColumn', () => {
  const columns = [
    { _id: 'col-1', name: 'Backlog', order: 0, boardId: 'b1', createdAt: 0 },
    { _id: 'col-2', name: 'Ready', order: 1, boardId: 'b1', createdAt: 0 },
    { _id: 'col-3', name: 'In Progress', order: 2, boardId: 'b1', createdAt: 0 },
  ]

  const tasks = [
    { _id: 't1', title: 'Task 1', columnId: 'col-1', status: 'backlog', priority: 'medium', projectId: 'p1', createdAt: 0, updatedAt: 0 },
    { _id: 't2', title: 'Task 2', columnId: 'col-1', status: 'backlog', priority: 'low', projectId: 'p1', createdAt: 0, updatedAt: 0 },
    { _id: 't3', title: 'Task 3', columnId: 'col-2', status: 'ready', priority: 'high', projectId: 'p1', createdAt: 0, updatedAt: 0 },
    { _id: 't4', title: 'Task 4', status: 'backlog', priority: 'medium', projectId: 'p1', createdAt: 0, updatedAt: 0 },
  ]

  it('groups tasks by their columnId', () => {
    const grouped = groupTasksByColumn(tasks, columns)

    expect(grouped.get('col-1')).toHaveLength(2)
    expect(grouped.get('col-2')).toHaveLength(1)
    expect(grouped.get('col-3')).toHaveLength(0)
  })

  it('includes tasks without columnId in unmapped group', () => {
    const grouped = groupTasksByColumn(tasks, columns)

    expect(grouped.get('unmapped')).toHaveLength(1)
    expect(grouped.get('unmapped')?.[0]._id).toBe('t4')
  })

  it('returns empty map for empty tasks', () => {
    const grouped = groupTasksByColumn([], columns)

    expect(grouped.size).toBe(0)
  })
})

describe('isValidStatusTransition', () => {
  it('allows forward transitions through the pipeline', () => {
    expect(isValidStatusTransition('backlog', 'ready')).toBe(true)
    expect(isValidStatusTransition('ready', 'in_progress')).toBe(true)
    expect(isValidStatusTransition('in_progress', 'review')).toBe(true)
    expect(isValidStatusTransition('review', 'done')).toBe(true)
  })

  it('allows backward transitions to previous states', () => {
    expect(isValidStatusTransition('in_progress', 'ready')).toBe(true)
    expect(isValidStatusTransition('review', 'in_progress')).toBe(true)
    expect(isValidStatusTransition('ready', 'backlog')).toBe(true)
  })

  it('allows transition to blocked from any active state', () => {
    expect(isValidStatusTransition('ready', 'blocked')).toBe(true)
    expect(isValidStatusTransition('in_progress', 'blocked')).toBe(true)
    expect(isValidStatusTransition('review', 'blocked')).toBe(true)
  })

  it('allows transition from blocked back to ready', () => {
    expect(isValidStatusTransition('blocked', 'ready')).toBe(true)
  })

  it('prevents transition from done to any active state', () => {
    expect(isValidStatusTransition('done', 'backlog')).toBe(false)
    expect(isValidStatusTransition('done', 'ready')).toBe(false)
    expect(isValidStatusTransition('done', 'in_progress')).toBe(false)
    expect(isValidStatusTransition('done', 'review')).toBe(false)
    expect(isValidStatusTransition('done', 'blocked')).toBe(false)
  })

  it('allows same-status transition (no-op)', () => {
    expect(isValidStatusTransition('ready', 'ready')).toBe(true)
  })
})

describe('mapStatusToColumn', () => {
  const columns = [
    { _id: 'col-backlog', name: 'Backlog', order: 0, boardId: 'b1', createdAt: 0 },
    { _id: 'col-ready', name: 'Ready', order: 1, boardId: 'b1', createdAt: 0 },
    { _id: 'col-in-progress', name: 'In Progress', order: 2, boardId: 'b1', createdAt: 0 },
    { _id: 'col-review', name: 'Review', order: 3, boardId: 'b1', createdAt: 0 },
    { _id: 'col-done', name: 'Done', order: 4, boardId: 'b1', createdAt: 0 },
    { _id: 'col-blocked', name: 'Blocked', order: 5, boardId: 'b1', createdAt: 0 },
  ]

  it('maps backlog status to Backlog column', () => {
    expect(mapStatusToColumn('backlog', columns)).toBe('col-backlog')
  })

  it('maps ready status to Ready column', () => {
    expect(mapStatusToColumn('ready', columns)).toBe('col-ready')
  })

  it('maps in_progress status to In Progress column', () => {
    expect(mapStatusToColumn('in_progress', columns)).toBe('col-in-progress')
  })

  it('maps blocked status to Blocked column', () => {
    expect(mapStatusToColumn('blocked', columns)).toBe('col-blocked')
  })

  it('maps done status to Done column', () => {
    expect(mapStatusToColumn('done', columns)).toBe('col-done')
  })

  it('returns null for unknown status', () => {
    expect(mapStatusToColumn('unknown', columns)).toBeNull()
  })
})

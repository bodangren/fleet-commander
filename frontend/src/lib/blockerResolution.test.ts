/**
 * Phase 5 Red gate — pure logic for blocker resolution notifications.
 *
 * When a task is completed (`status: 'done'`), the dashboard must surface
 * which downstream tasks became unblocked as a result. The pure helper
 * `getNewlyUnblockedTasks(previousTasks, completedTaskKey)` lives in
 * `frontend/src/lib/blockerResolution.ts` and is consumed by the
 * `useBlockerResolutionToast` hook and any notification stream.
 *
 * The module does not exist yet (Red gate: module resolution fails).
 * See plan.md Phase 5 task 5 and test-strategy.md §3 item 8
 * (optimistic state, rollback path).
 */
import { describe, expect, it } from 'vitest'

import { getNewlyUnblockedTasks } from './blockerResolution'

type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'

type Task = {
  taskKey: string
  title: string
  status: TaskStatus
  dependencies: string[]
  storyPoints: number
  updatedAt: number
}

const baseTime = 1_700_000_000_000

function task(
  key: string,
  status: TaskStatus,
  dependencies: string[] = [],
): Task {
  return {
    taskKey: key,
    title: `Task ${key}`,
    status,
    dependencies,
    storyPoints: 3,
    updatedAt: baseTime,
  }
}

describe('getNewlyUnblockedTasks (Phase 5 Red gate — module resolution)', () => {
  it('imports without throwing (Red gate: module must exist)', () => {
    expect(getNewlyUnblockedTasks).toBeDefined()
  })

  it('returns the single downstream task that loses its only blocker', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'blocked', ['A']),
      task('C', 'ready'),
    ]
    const result = getNewlyUnblockedTasks(previous, 'A')
    expect(result.map(t => t.taskKey)).toEqual(['B'])
  })

  it('returns an empty array when the completed task has no downstream blockers', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'ready', ['A']),
      task('C', 'ready'),
    ]
    const result = getNewlyUnblockedTasks(previous, 'A')
    expect(result).toEqual([])
  })

  it('does not unblock a task whose remaining blockers are still incomplete', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'in_progress'),
      task('C', 'blocked', ['A', 'B']),
    ]
    const result = getNewlyUnblockedTasks(previous, 'A')
    expect(result).toEqual([])
  })

  it('unblocks a task whose last remaining blocker was just completed', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'in_progress'),
      task('C', 'blocked', ['A', 'B']),
    ]
    const result = getNewlyUnblockedTasks(previous, 'B')
    expect(result.map(t => t.taskKey)).toEqual(['C'])
  })

  it('returns multiple downstream tasks in stable, sorted-by-taskKey order', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'blocked', ['A']),
      task('C', 'blocked', ['A']),
      task('D', 'blocked', ['A']),
    ]
    const result = getNewlyUnblockedTasks(previous, 'A')
    expect(result.map(t => t.taskKey)).toEqual(['B', 'C', 'D'])
  })

  it('ignores tasks that were not blocked before completion', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'ready', ['A']),
      task('C', 'in_progress', ['A']),
    ]
    const result = getNewlyUnblockedTasks(previous, 'A')
    expect(result).toEqual([])
  })

  it('handles a transitive chain: completing A unblocks B, which (in a 2nd call) would unblock C', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'blocked', ['A']),
      task('C', 'blocked', ['B']),
    ]
    const first = getNewlyUnblockedTasks(previous, 'A')
    expect(first.map(t => t.taskKey)).toEqual(['B'])
    // The function is single-step by design: it does not cascade. C
    // remains blocked because B is still blocked at the moment the
    // caller observes the result. The toast hook is expected to call
    // the function again after B is patched to `ready`.
    const afterBFlipped = previous.map(t =>
      t.taskKey === 'B' ? { ...t, status: 'ready' as TaskStatus } : t,
    )
    const second = getNewlyUnblockedTasks(afterBFlipped, 'B')
    expect(second.map(t => t.taskKey)).toEqual(['C'])
  })

  it('returns an empty array when the completed task key does not exist', () => {
    const previous = [
      task('A', 'done'),
      task('B', 'blocked', ['A']),
    ]
    const result = getNewlyUnblockedTasks(previous, 'GHOST')
    expect(result).toEqual([])
  })

  it('returns an empty array when the completed task is NOT actually done in the snapshot', () => {
    const previous = [
      task('A', 'in_progress'),
      task('B', 'blocked', ['A']),
    ]
    // Per spec: only count newly unblocked tasks when the completed
    // task's current status is `done`. The function must check that
    // the snapshot reflects the completion.
    const result = getNewlyUnblockedTasks(previous, 'A')
    expect(result).toEqual([])
  })
})

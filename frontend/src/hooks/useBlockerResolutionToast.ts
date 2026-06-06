import { useEffect, useRef } from 'react'

import { useToast } from '@/lib/toast'
import type { Task } from '@/lib/kanban'
import { getNewlyUnblockedTasks } from '@/lib/blockerResolution'

type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'

type UseBlockerResolutionToastOptions = {
  tasks: Task[]
  showToast?: (type: 'success' | 'error', message: string) => void
}

/**
 * Shows a toast notification whenever a completed task unblocks downstream tasks.
 *
 * Uses `getNewlyUnblockedTasks` to detect newly-unblocked dependents and
 * emits one `showToast('success', ...)` per unblock. The hook is a no-op
 * when no `showToast` is passed (falls back to `useToast()` from the
 * toast provider).
 *
 * @param tasks - current snapshot of all tasks
 * @param showToast - optional toast function override (for testing)
 */
export function useBlockerResolutionToast({
  tasks,
  showToast: showToastOverride,
}: UseBlockerResolutionToastOptions): void {
  const ctx = useToast()
  const showToast = showToastOverride ?? ctx.showToast
  const prevUnblockedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const keyToId = new Map<string, string>()
    for (const t of tasks) {
      const bare = t._id.replace(/^id-/, '')
      keyToId.set(bare, t._id)
      keyToId.set(t._id, t._id)
    }

    const mappedTasks = tasks.map(t => ({
      taskKey: t._id,
      title: t.title,
      status: t.status as TaskStatus,
      dependencies: ((t as { dependencies?: string[] }).dependencies ?? []).map(
        (k: string) => keyToId.get(k) ?? k,
      ),
      storyPoints: 0,
      updatedAt: t.updatedAt,
    }))

    const doneTasks = mappedTasks.filter(t => t.status === 'done')
    const allUnblocked = new Set<string>()

    for (const doneTask of doneTasks) {
      const unblocked = getNewlyUnblockedTasks(mappedTasks, doneTask.taskKey)
      for (const t of unblocked) {
        allUnblocked.add(t.taskKey)
      }
    }

    for (const taskKey of allUnblocked) {
      if (!prevUnblockedRef.current.has(taskKey)) {
        showToast('success', `Unblocked ${taskKey}`)
      }
    }

    prevUnblockedRef.current = allUnblocked
  }, [tasks, showToast])
}

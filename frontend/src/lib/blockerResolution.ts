type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'

type BlockerTask = {
  taskKey: string
  title: string
  status: TaskStatus
  dependencies: string[]
  storyPoints: number
  updatedAt: number
}

/**
 * Returns downstream tasks that become unblocked when a task is completed.
 *
 * Single-step: only checks direct dependents of the completed task.
 * Does not cascade — the caller re-invokes after flipping intermediate
 * tasks to `ready`.
 *
 * @param previousTasks - snapshot of all tasks before the status change
 * @param completedTaskKey - key of the task that was just completed
 * @returns tasks whose last blocker was the completed task, sorted by taskKey
 */
export function getNewlyUnblockedTasks(
  previousTasks: BlockerTask[],
  completedTaskKey: string,
): BlockerTask[] {
  const completed = previousTasks.find(t => t.taskKey === completedTaskKey)
  if (!completed) return []
  if (completed.status !== 'done') return []

  const taskMap = new Map(previousTasks.map(t => [t.taskKey, t]))

  const newlyUnblocked: BlockerTask[] = []

  for (const task of previousTasks) {
    if (task.status !== 'blocked') continue
    if (!task.dependencies.includes(completedTaskKey)) continue

    const allOtherDepsDone = task.dependencies.every(depKey => {
      if (depKey === completedTaskKey) return true
      const dep = taskMap.get(depKey)
      return dep?.status === 'done'
    })

    if (allOtherDepsDone) {
      newlyUnblocked.push(task)
    }
  }

  return newlyUnblocked.sort((a, b) => a.taskKey.localeCompare(b.taskKey))
}

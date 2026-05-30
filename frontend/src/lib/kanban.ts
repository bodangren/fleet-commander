export type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'

export type Column = {
  _id: string
  name: string
  order: number
  boardId: string
  createdAt: number
}

export type Task = {
  _id: string
  title: string
  description?: string
  status: TaskStatus | string
  priority: 'low' | 'medium' | 'high'
  projectId: string
  columnId?: string
  assignee?: string
  createdAt: number
  updatedAt: number
}

/**
 * Processes data collection
 * @param tasks - Array of tasks to group
 * @param columns - Array of columns to group tasks by
 * @returns Map of column ID to tasks belonging to that column
 */
export function groupTasksByColumn(tasks: Task[], columns: Column[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()

  if (tasks.length === 0) return map

  for (const col of columns) {
    map.set(col._id, [])
  }
  map.set('unmapped', [])

  for (const task of tasks) {
    if (!task.columnId) {
      map.get('unmapped')!.push(task)
    } else if (map.has(task.columnId)) {
      map.get(task.columnId)!.push(task)
    } else {
      map.get('unmapped')!.push(task)
    }
  }

  return map
}

const PIPELINE_ORDER: TaskStatus[] = ['backlog', 'ready', 'in_progress', 'review', 'done']

/**
 * Check if valid status transition
 * @param from - Current status
 * @param to - Target status
 * @returns Whether the transition is allowed
 */
export function isValidStatusTransition(from: string, to: string): boolean {
  if (from === to) return true

  if (to === 'blocked') {
    return from !== 'done' && from !== 'blocked'
  }

  if (from === 'blocked' && to === 'ready') return true

  if (from === 'done') return false

  const fromIdx = PIPELINE_ORDER.indexOf(from as TaskStatus)
  const toIdx = PIPELINE_ORDER.indexOf(to as TaskStatus)

  if (fromIdx === -1 || toIdx === -1) return true

  return toIdx <= fromIdx + 1
}

/**
 * map: status to column
 * @param status - The task status to map
 * @param columns - Array of columns to search
 * @returns The column ID matching the status, or null if not found
 */
export function mapStatusToColumn(status: string, columns: Column[]): string | null {
  const normalized = status.toLowerCase().replace(' ', '_')

  const nameToColumn: Record<string, string> = {
    backlog: 'backlog',
    ready: 'ready',
    in_progress: 'in progress',
    inprogress: 'in progress',
    review: 'review',
    done: 'done',
    blocked: 'blocked',
  }

  const target = nameToColumn[normalized]
  if (!target) return null

  const col = columns.find(c => c.name.toLowerCase() === target)
  return col?._id ?? null
}

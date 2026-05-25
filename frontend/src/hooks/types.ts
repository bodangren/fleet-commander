/**
 * Shared hook return types used across multiple components.
 *
 * Types defined here are imported by more than one component or page.
 * Hook-specific return types that are only consumed by a single page
 * should remain co-located with their hook.
 */

export type KanbanTask = {
  _id: string
  projectId: string
  sprintId?: string
  title: string
  description: string
  storyPoints: number
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high'
  costEstimate: number
  actualCost?: number
  assigneeId?: string
  reviewerId?: string
  mergerId?: string
  assigneeName?: string
  assigneeRole?: string
  createdAt: number
  updatedAt: number
}

export type Sprint = {
  _id: string
  projectId: string
  name: string
  status: string
  budget: number
  actualCost: number
  pointsDelivered: number
  taskCount: number
  completedCount: number
  createdAt: number
  startedAt?: number
  closedAt?: number
}

export type BoardAgent = {
  _id: string
  name: string
  role: string
  status: string
}

export type SprintBoard = {
  sprint: Sprint
  tasks: KanbanTask[]
  agents: BoardAgent[]
}

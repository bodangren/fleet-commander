export interface SprintHistoryItem {
  _id: string
  name: string
  status: 'planned' | 'active' | 'closed'
  startDate: number
  endDate: number
  budget: number
  actualCost: number
  pointsDelivered: number
  pointsEstimated: number
  taskCount: number
  completedCount: number
  velocity: number
}

export interface AgentHistoryItem {
  _id: string
  name: string
  displayName: string
  model: string
  tasksCompleted: number
  totalCost: number
  avgLatencyMs: number
  reliability: number
  periodStart: number
  periodEnd: number
}

export interface TaskHistoryItem {
  _id: string
  title: string
  status: string
  agent: string
  projectSlug: string
  sprintId: string
  cost: number
  storyPoints: number
  createdAt: number
  completedAt?: number
}

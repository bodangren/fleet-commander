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

const BASE_TIME = Date.now()

export const mockSprintHistory: SprintHistoryItem[] = [
  {
    _id: 'sprint-3',
    name: 'Sprint 3',
    status: 'active',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 7,
    endDate: BASE_TIME + 1000 * 60 * 60 * 24 * 7,
    budget: 600,
    actualCost: 245.5,
    pointsDelivered: 12,
    pointsEstimated: 35,
    taskCount: 8,
    completedCount: 3,
    velocity: 1.71,
  },
  {
    _id: 'sprint-2',
    name: 'Sprint 2',
    status: 'closed',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 21,
    endDate: BASE_TIME - 1000 * 60 * 60 * 24 * 7,
    budget: 550,
    actualCost: 523.75,
    pointsDelivered: 28,
    pointsEstimated: 30,
    taskCount: 14,
    completedCount: 13,
    velocity: 2.0,
  },
  {
    _id: 'sprint-1',
    name: 'Sprint 1',
    status: 'closed',
    startDate: BASE_TIME - 1000 * 60 * 60 * 24 * 35,
    endDate: BASE_TIME - 1000 * 60 * 60 * 24 * 21,
    budget: 500,
    actualCost: 487.33,
    pointsDelivered: 24,
    pointsEstimated: 28,
    taskCount: 12,
    completedCount: 10,
    velocity: 1.71,
  },
]

export const mockAgentHistory: AgentHistoryItem[] = [
  {
    _id: 'agent-history-1',
    name: 'alice',
    displayName: 'Alice',
    model: 'claude-opus',
    tasksCompleted: 42,
    totalCost: 1250.5,
    avgLatencyMs: 3400,
    reliability: 0.95,
    periodStart: BASE_TIME - 1000 * 60 * 60 * 24 * 30,
    periodEnd: BASE_TIME,
  },
  {
    _id: 'agent-history-2',
    name: 'bob',
    displayName: 'Bob',
    model: 'claude-sonnet',
    tasksCompleted: 38,
    totalCost: 890.25,
    avgLatencyMs: 2100,
    reliability: 0.92,
    periodStart: BASE_TIME - 1000 * 60 * 60 * 24 * 30,
    periodEnd: BASE_TIME,
  },
]

export const mockTaskHistory: TaskHistoryItem[] = [
  {
    _id: 'task-history-1',
    title: 'Fix auth bug',
    status: 'done',
    agent: 'alice',
    projectSlug: 'foundation',
    sprintId: 'sprint-1',
    cost: 12.5,
    storyPoints: 3,
    createdAt: BASE_TIME - 1000 * 60 * 60 * 24 * 28,
    completedAt: BASE_TIME - 1000 * 60 * 60 * 24 * 26,
  },
  {
    _id: 'task-history-2',
    title: 'Add dashboard chart',
    status: 'done',
    agent: 'bob',
    projectSlug: 'foundation',
    sprintId: 'sprint-2',
    cost: 18.75,
    storyPoints: 5,
    createdAt: BASE_TIME - 1000 * 60 * 60 * 24 * 18,
    completedAt: BASE_TIME - 1000 * 60 * 60 * 24 * 15,
  },
  {
    _id: 'task-history-3',
    title: 'Optimize queries',
    status: 'in_progress',
    agent: 'alice',
    projectSlug: 'foundation',
    sprintId: 'sprint-3',
    cost: 8.0,
    storyPoints: 3,
    createdAt: BASE_TIME - 1000 * 60 * 60 * 24 * 4,
  },
]

export interface MockSprint {
  name: string
  status: string
  budget: number
  actualCost: number
  pointsDelivered: number
  taskCount: number
  completedCount: number
  burnRate: number
  projectedExhaustionMs: number | null
  atRisk: boolean
  forecastConfidence: number
}

export const mockSprint = {
  name: 'Sprint 42',
  status: 'active',
  budget: 500,
  actualCost: 450.5,
  pointsDelivered: 24,
  taskCount: 12,
  completedCount: 8,
  burnRate: 3.5,
  projectedExhaustionMs: Date.now() + 86400000,
  atRisk: false,
  forecastConfidence: 0.8,
} satisfies MockSprint

export interface MockAgent {
  name: string
  displayName: string
  status: 'Active' | 'Idle' | 'Blocked'
  currentTask: string
}

export const mockAgents = [
  { name: 'architect', displayName: 'Architect', status: 'Active', currentTask: 'Plan dashboard' },
  { name: 'executor', displayName: 'Executor', status: 'Idle', currentTask: '' },
  { name: 'reviewer', displayName: 'Reviewer', status: 'Blocked', currentTask: 'Review PR #1' },
] satisfies MockAgent[]

export interface MockActivityItem {
  type: 'merge' | 'dispatch' | 'blocked'
  agent: string
  task: string
  cost: number
  timestamp: number
}

export const mockActivity = [
  {
    type: 'merge',
    agent: 'executor',
    task: 'Fix auth bug',
    cost: 12.5,
    timestamp: Date.now() - 1000 * 60 * 5,
  },
  {
    type: 'dispatch',
    agent: 'architect',
    task: 'Plan dashboard',
    cost: 8.0,
    timestamp: Date.now() - 1000 * 60 * 30,
  },
  {
    type: 'blocked',
    agent: 'reviewer',
    task: 'Review PR #1',
    cost: 0,
    timestamp: Date.now() - 1000 * 60 * 60,
  },
] satisfies MockActivityItem[]

export interface MockAlert {
  type: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  resolved: boolean
}

export const mockAlerts = [
  {
    type: 'budget_breach',
    severity: 'critical',
    message: 'Budget exceeded by 20%',
    resolved: false,
  },
  { type: 'stall_detected', severity: 'warning', message: 'Agent idle for 30min', resolved: false },
  { type: 'circuit_open', severity: 'info', message: 'Circuit breaker opened', resolved: true },
] satisfies MockAlert[]

export interface MockKeyMetrics {
  deliveryRate: number
  successRate: number
  pipelineTime: number
  rejectionRate: number
}

export const mockKeyMetrics = {
  deliveryRate: 0.56,
  successRate: 92,
  pipelineTime: 512,
  rejectionRate: 8,
} satisfies MockKeyMetrics

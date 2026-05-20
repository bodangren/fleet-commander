import { useConvexQuery } from '@/lib/useConvexData'

export interface DashboardSprint {
  _id: string
  name: string
  status: string
  budget: number
  actualCost: number
  pointsDelivered: number
  taskCount: number
  completedCount: number
}

export interface DashboardTask {
  _id: string
  title: string
  status: string
  storyPoints: number
  actualCost?: number
  assigneeId?: string
  priority: string
}

export interface DashboardAgent {
  _id: string
  name: string
  role: string
  status: string
  workload: number
  maxWorkload: number
}

export interface DashboardPipelineRun {
  _id: string
  taskId: string
  stage: string
  agentId?: string
  startTime: number
  endTime?: number
  cost?: number
  status: string
}

export interface DashboardAlert {
  _id: string
  type: string
  severity: string
  message: string
  createdAt: number
}

export interface DashboardMetrics {
  deliveryRate: number
  successRate: number
  avgPipelineTime: number
  rejectionRate: number
}

export interface DashboardData {
  sprint: DashboardSprint | null
  tasks: DashboardTask[]
  agents: DashboardAgent[]
  pipelineRuns: DashboardPipelineRun[]
  alerts: DashboardAlert[]
  metrics: DashboardMetrics
}

export function useDashboardData(projectId?: string): DashboardData | undefined {
  return useConvexQuery<DashboardData>(
    'dashboard:getDashboardDataHandler',
    projectId ? { projectId } : {},
    true,
  )
}

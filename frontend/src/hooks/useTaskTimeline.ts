import { useConvexQuery } from '@/lib/useConvexData'

export interface PipelineRun {
  _id: string
  taskId: string
  stage: string
  agentId?: string
  startTime: number
  endTime?: number
  cost?: number
  status: string
  createdAt: number
}

export interface TimelineAgent {
  _id: string
  name: string
  role: string
  skills: string[]
  model: string
  costPerPoint: number
  reliability: number
  status: string
  workload: number
  maxWorkload: number
  createdAt: number
}

export interface TimelineSprint {
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

export interface TimelineProject {
  _id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface TimelineTask {
  _id: string
  projectId: string
  sprintId?: string
  title: string
  description: string
  storyPoints: number
  status: string
  priority: string
  costEstimate: number
  actualCost?: number
  assigneeId?: string
  reviewerId?: string
  mergerId?: string
  createdAt: number
  updatedAt: number
}

export interface TaskTimelineData {
  task: TimelineTask | null
  pipelineRuns: PipelineRun[]
  agents: TimelineAgent[]
  sprint: TimelineSprint | null
  project: TimelineProject | null
}

export interface UseTaskTimelineReturn {
  data: TaskTimelineData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useTaskTimeline(taskId: string | undefined): UseTaskTimelineReturn {
  const enabled = Boolean(taskId && taskId.trim() !== '')
  const data = useConvexQuery<TaskTimelineData>(
    'taskTimeline:getTaskTimelineHandler',
    enabled ? { taskId: taskId! } : {},
    enabled,
  )

  if (!enabled) {
    return { data: null, loading: false, error: null, refresh: () => {} }
  }

  if (data === undefined) {
    return { data: null, loading: true, error: null, refresh: () => {} }
  }

  return { data, loading: false, error: null, refresh: () => {} }
}

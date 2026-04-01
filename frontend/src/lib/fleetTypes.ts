export type ViewKey = 'dashboard' | 'agents' | 'harnesses'

export type ApiStatus = {
  status: string
  message: string
}

export type ProjectTrackSummary = {
  name: string
  status: string
}

export type ProjectSummary = {
  id: string
  name: string
  path: string
  tracks: ProjectTrackSummary[]
  lastUpdated: number
}

export type ProjectTask = {
  id: string
  description: string
  status: 'todo' | 'active' | 'blocked' | 'done' | string
  agentTag?: string
  phase: string
}

export type ProjectPhase = {
  name: string
  tasks: ProjectTask[]
}

export type ProjectTrack = {
  id: string
  name: string
  type: string
  description: string
  status: string
  planPath: string
  phases: ProjectPhase[]
}

export type ProjectDetail = Omit<ProjectSummary, 'tracks'> & {
  tracks: ProjectTrack[]
}

export type AgentRecord = {
  layer: string
  definition: {
    name: string
    description: string
    mode: string
    model: string
    temperature: number
    tools: Record<string, boolean>
    body: string
  }
}

export type HarnessRecord = {
  layer: string
  binaryFound: boolean
  definition: {
    name: string
    binary: string
    discovery: {
      command: string
      parseStrategy: string
      pattern: string
    }
    invocation: {
      template: string
      flags: Record<string, string>
    }
  }
}

export type AgentTestResult = {
  name: string
  status: string
  latencyMs: number
  output: string
  error?: string
}

export type HarnessDiscoveryResult = {
  name: string
  models: string[]
  error?: string
}

export type IssueType = 'blocker' | 'delegation' | 'clarification' | 'feature-request'
export type IssueStatus = 'open' | 'resolved' | 'duplicate'

export type Issue = {
  id: string
  title: string
  description?: string
  type: IssueType
  status: IssueStatus
  createdAt: string
  updatedAt?: string
  relatedTask?: string
  projectId?: string
}

export type LogType = 'dispatch' | 'scoring' | 'execution' | 'completion' | 'error'

export type LogEntry = {
  type: LogType
  projectId: string
  timestamp: string
  data?: Record<string, unknown>
}

export type LogStats = {
  totalEntries: number
  dispatchCount: number
  completionCount: number
  errorCount: number
  avgDurationMs: number
  successRate: number
  agentBreakdown: Array<{
    agent: string
    runs: number
    avgMs: number
    errors: number
  }>
}

export type ScoredCandidate = {
  id: string
  title: string
  description?: string
  type: 'task' | 'issue'
  priority?: number
  createdAt: string
  projectId?: string
  planPath?: string
  agentTag?: string
  score: number
  rationale?: string
  rank?: number
}

export type ExecutionStatus = {
  type: 'execution_status'
  projectId: string
  taskId: string
  status: 'running' | 'succeeded' | 'failed' | 'retrying'
  attempt?: number
  maxRetries?: number
  delayMs?: number
  durationMs?: number
  error?: string
  failureType?: string
}

export type ReviewCheckResult = {
  category: string
  status: 'passed' | 'failed' | 'timeout' | 'skipped'
  errors?: string[]
  warnings?: string[]
  output?: string
  durationMs: number
}

export type TaskReviewResponse = {
  taskId: string
  status: 'passed' | 'failed' | 'timeout' | 'skipped' | 'not_found'
  results?: ReviewCheckResult[]
  reviewedAt?: string
}

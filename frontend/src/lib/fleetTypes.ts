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

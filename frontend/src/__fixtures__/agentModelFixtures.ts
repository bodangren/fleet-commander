export interface AgentModelChange {
  _id: string
  agentName: string
  agentDisplayName: string
  previousModel: string
  newModel: string
  changedAt: number
}

const BASE_TIME = Date.now()

export const mockAgentModelChanges: AgentModelChange[] = [
  {
    _id: 'model-change-1',
    agentName: 'alice',
    agentDisplayName: 'Alice',
    previousModel: 'claude-sonnet',
    newModel: 'claude-opus',
    changedAt: BASE_TIME - 1000 * 60 * 60 * 24 * 14,
  },
  {
    _id: 'model-change-2',
    agentName: 'bob',
    agentDisplayName: 'Bob',
    previousModel: 'gpt-4o',
    newModel: 'claude-sonnet',
    changedAt: BASE_TIME - 1000 * 60 * 60 * 24 * 7,
  },
]

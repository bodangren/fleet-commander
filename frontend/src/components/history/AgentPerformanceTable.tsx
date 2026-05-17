import type { AgentHistoryItem } from '@/__fixtures__/historyFixtures'

export interface AgentPerformanceTableProps {
  agents: AgentHistoryItem[]
  onSelectAgent?: (agent: AgentHistoryItem) => void
}

export function AgentPerformanceTable(_props: AgentPerformanceTableProps) {
  return null
}

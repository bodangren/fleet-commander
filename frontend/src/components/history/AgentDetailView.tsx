import type { AgentHistoryItem } from '@/__fixtures__/historyFixtures'

export interface AgentDetailViewProps {
  agent: AgentHistoryItem | null
  onBack?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AgentDetailView(_props: AgentDetailViewProps) {
  return <div data-testid="agent-detail-view" />
}

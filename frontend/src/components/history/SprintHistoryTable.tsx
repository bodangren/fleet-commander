import type { SprintHistoryItem } from '@/__fixtures__/historyFixtures'

export interface SprintHistoryTableProps {
  sprints: SprintHistoryItem[]
  onSelectSprint?: (sprint: SprintHistoryItem) => void
}

export function SprintHistoryTable(_props: SprintHistoryTableProps) {
  return null
}

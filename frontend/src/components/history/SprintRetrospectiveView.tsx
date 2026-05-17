export interface SprintRetrospectiveViewProps {
  retrospective: {
    _id: string
    name: string
    status: string
    reportMarkdown?: string
    createdAt: number
    completedAt?: number
  } | null
  onBack?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SprintRetrospectiveView(_props: SprintRetrospectiveViewProps) {
  return <div data-testid="sprint-retrospective-view" />
}

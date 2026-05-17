import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

export function SprintRetrospectiveView({ retrospective, onBack }: SprintRetrospectiveViewProps) {
  if (!retrospective) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Select a sprint to view its retrospective
      </div>
    )
  }

  return (
    <Card className="border-4 border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between border-b-2 border-border bg-muted/30 p-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="icon" onClick={onBack} aria-label="Back">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Button>
          )}
          <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">
            {retrospective.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6">
        <div className="mb-4">
          <span className="inline-block px-2 py-1 text-xs font-bold uppercase tracking-wider bg-secondary text-secondary-foreground">
            {retrospective.status}
          </span>
        </div>
        {retrospective.reportMarkdown && (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: retrospective.reportMarkdown.replace(/\n/g, '<br/>'),
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}

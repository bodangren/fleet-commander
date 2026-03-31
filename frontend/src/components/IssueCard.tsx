import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Issue, IssueType, IssueStatus } from '@/lib/fleetTypes'

const issueTypeColors: Record<IssueType, string> = {
  blocker: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  delegation: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  clarification: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  'feature-request': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
}

const issueStatusColors: Record<IssueStatus, string> = {
  open: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  resolved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  duplicate: 'border-gray-400/30 bg-gray-400/10 text-gray-300',
}

export function IssueCard({
  issue,
  onClick,
}: {
  issue: Issue
  onClick?: () => void
}) {
  const card = (
    <Card
      className={cn(
        'shadow-none transition',
        onClick && 'cursor-pointer hover:border-cyan-300/60 hover:bg-cyan-500/10',
        issueTypeColors[issue.type] ?? 'border-border/60 bg-background/60',
      )}
    >
      <CardHeader className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm leading-snug">{issue.title}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                'rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em]',
                issueStatusColors[issue.status],
              )}
            >
              {issue.status}
            </span>
          </div>
        </div>
        <CardDescription className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border/60 px-2 py-1">{issue.type}</span>
          {issue.relatedTask ? (
            <span className="rounded-full border border-border/60 px-2 py-1">
              {issue.relatedTask}
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
    </Card>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {card}
      </button>
    )
  }

  return card
}

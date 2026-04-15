import type { RunContractDisplay } from '@/hooks/useRunContract'

interface ReviewerRowProps {
  contract: RunContractDisplay
  expanded: boolean
  onToggleExpand: () => void
}

const statusColors: Record<string, string> = {
  passed: 'text-green-600',
  failed: 'text-red-600',
  'needs-changes': 'text-amber-600',
}

const severityBadges: Record<string, { bg: string; text: string }> = {
  blocker: { bg: 'bg-red-100', text: 'text-red-700' },
  major: { bg: 'bg-orange-100', text: 'text-orange-700' },
  minor: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
}

export function ReviewerRow({ contract, expanded, onToggleExpand }: ReviewerRowProps) {
  const reviewer = contract.stages.reviewer

  if (!reviewer) {
    return (
      <div className="border-b border-border" data-stage="reviewer">
        <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-medium text-orange-700">
            R
          </span>
          <span className="font-medium">Reviewer</span>
          <span className="text-sm">(pending)</span>
        </div>
      </div>
    )
  }

  const statusColor = statusColors[reviewer.status] ?? 'text-muted-foreground'
  const severityBadge = reviewer.severity ? severityBadges[reviewer.severity] : null

  return (
    <div className="border-b border-border" data-stage="reviewer">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
        aria-expanded={expanded}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-medium text-orange-700">
          R
        </span>
        <span className="font-medium">Reviewer</span>
        <span className={`text-sm ${statusColor}`}>{reviewer.status}</span>
        {reviewer.issueClass && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{reviewer.issueClass}</span>
        )}
        {severityBadge && (
          <span
            className={`rounded px-1.5 py-0.5 text-xs ${severityBadge.bg} ${severityBadge.text}`}
          >
            {reviewer.severity}
          </span>
        )}
        <span className="ml-auto text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Summary</h4>
            <p className="mt-1 text-sm">{reviewer.summary}</p>
          </div>

          {reviewer.issueClass && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Issue Class</h4>
              <p className="mt-1 text-sm capitalize">{reviewer.issueClass.replace('_', ' ')}</p>
            </div>
          )}

          {reviewer.severity && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Severity</h4>
              <p className="mt-1 text-sm capitalize">{reviewer.severity}</p>
            </div>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Raw JSON
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs">
              {JSON.stringify(reviewer, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

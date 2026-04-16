import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface ReconciliationProposalEntry {
  _id: string
  projectSlug: string
  artifactType: string
  artifactId: string
  patchJson: string
  sourceSide: string
  reason: string
  status: string
  createdAt: number
}

interface ReconcilePanelProps {
  proposals?: ReconciliationProposalEntry[]
  loading?: boolean
  onApply?: (id: string) => void
  onReject?: (id: string) => void
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function parsePatch(patchJson: string): Record<string, unknown> {
  try {
    return JSON.parse(patchJson)
  } catch {
    return {}
  }
}

export function ReconcilePanel({ proposals, loading, onApply, onReject }: ReconcilePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading || proposals === undefined) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">
            Loading reconciliation proposals...
          </p>
        </CardContent>
      </Card>
    )
  }

  const pending = proposals.filter(p => p.status === 'pending')

  return (
    <div className="space-y-4" data-testid="reconcile-panel">
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Pending Proposals</CardTitle>
          <CardDescription>{pending.length} proposal(s) awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending reconciliation proposals</p>
          ) : (
            <ul className="space-y-3">
              {pending.map(proposal => {
                const isExpanded = expandedId === proposal._id
                const patch = parsePatch(proposal.patchJson)
                return (
                  <li
                    key={proposal._id}
                    className="rounded-xl border border-border/40 bg-black/20 p-4"
                    data-testid={`proposal-${proposal._id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                            {proposal.artifactType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(proposal.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{proposal.artifactId}</p>
                        <p className="text-xs text-muted-foreground">{proposal.reason}</p>
                        <p className="mt-1 text-xs text-cyan-300">Source: {proposal.sourceSide}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onApply?.(proposal._id)}
                          data-testid={`apply-${proposal._id}`}
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReject?.(proposal._id)}
                          data-testid={`reject-${proposal._id}`}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(isExpanded ? null : proposal._id)}
                          data-testid={`toggle-${proposal._id}`}
                        >
                          {isExpanded ? 'Hide' : 'Diff'}
                        </Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 rounded-lg border border-border/40 bg-black/30 p-3">
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                          {JSON.stringify(patch, null, 2)}
                        </pre>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReconcilePage() {
  return (
    <div className="space-y-4">
      <ReconcilePanel proposals={[]} loading={false} />
    </div>
  )
}

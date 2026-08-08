import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/formatTimestamp'
import type { ReconciliationProposalEntry } from '@/lib/useConvexData'

interface ReconcilePanelProps {
  proposals?: ReconciliationProposalEntry[]
  loading?: boolean
  error?: string | null
  onApply?: (id: string) => void
  onReject?: (id: string) => void
}

/**
 * Safely parses a JSON patch string, returning empty object on failure
 * @param patchJson - JSON patch string to parse
 * @returns Parsed object or empty object on parse failure
 */
function parsePatch(patchJson: string): Record<string, unknown> {
  try {
    return JSON.parse(patchJson)
  } catch {
    return {}
  }
}

/**
 * Panel for viewing and applying or rejecting reconciliation proposals
 * @param proposals - Array of reconciliation proposals
 * @param loading - Loading state flag
 * @param error - Read error, when the proposals query failed
 * @param onApply - Callback when proposal is applied
 * @param onReject - Callback when proposal is rejected
 */
export function ReconcilePanel({
  proposals,
  loading,
  error,
  onApply,
  onReject,
}: ReconcilePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (error) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardContent className="py-8">
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        </CardContent>
      </Card>
    )
  }

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
                            {formatRelativeTime(proposal.createdAt)}
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

/**
 * Displays and manages data reconciliation proposals
 */
export default function ReconcilePage() {
  const [proposals, setProposals] = useState<ReconciliationProposalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/reconciliation/proposals')
      .then(res => res.json())
      .then(data => {
        setProposals(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setProposals([])
        setLoading(false)
        setError('Failed to load reconciliation proposals')
      })
  }, [])

  const handleApply = async (id: string) => {
    try {
      const response = await fetch(`/api/reconciliation/proposals/${id}/apply`, { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to apply proposal')
      }
      setProposals(prev => prev.filter(p => p._id !== id))
      setActionError(null)
    } catch (error) {
      console.error('Error applying proposal:', error)
      setActionError('Failed to apply proposal')
    }
  }

  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/reconciliation/proposals/${id}/reject`, { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to reject proposal')
      }
      setProposals(prev => prev.filter(p => p._id !== id))
      setActionError(null)
    } catch (error) {
      console.error('Error rejecting proposal:', error)
      setActionError('Failed to reject proposal')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          data-testid="reconcile-error"
          className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          data-testid="reconcile-action-error"
          className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400"
        >
          {actionError}
        </div>
      )}
      <ReconcilePanel
        proposals={proposals}
        loading={loading}
        onApply={handleApply}
        onReject={handleReject}
      />
    </div>
  )
}

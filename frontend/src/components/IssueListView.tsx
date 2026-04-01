import { useCallback, useEffect, useMemo, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IssueCard } from '@/components/IssueCard'
import type { Issue, IssueStatus, IssueType } from '@/lib/fleetTypes'

const issueTypeColumns: Array<{ key: IssueType; label: string }> = [
  { key: 'blocker', label: 'Blockers' },
  { key: 'delegation', label: 'Delegations' },
  { key: 'clarification', label: 'Clarifications' },
  { key: 'feature-request', label: 'Feature Requests' },
]

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'duplicate', label: 'Duplicate' },
]

export function IssueListView({
  projectId,
  onIssueSelect,
  onCreateClick,
}: {
  projectId: string
  onIssueSelect?: (issue: Issue) => void
  onCreateClick?: () => void
}) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) {
        params.set('status', statusFilter)
      }
      const url = `/api/projects/${encodeURIComponent(projectId)}/issues${params.toString() ? `?${params}` : ''}`
      const response = await fetch(url)
      const payload = (await response.json()) as { issues?: Issue[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load issues')
      }
      setIssues(payload.issues ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId, statusFilter])

  useEffect(() => {
    void fetchIssues()
  }, [fetchIssues])

  const filteredIssues = useMemo(() => {
    if (!typeFilter) {
      return issues
    }
    return issues.filter(issue => issue.type === typeFilter)
  }, [issues, typeFilter])

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        issueTypeColumns.map(col => [
          col.key,
          filteredIssues.filter(issue => issue.type === col.key),
        ]),
      ) as Record<IssueType, Issue[]>,
    [filteredIssues],
  )

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle className="text-base">Issues</CardTitle>
          <CardDescription>
            Broker issues reported by agents — blockers, delegations, and clarifications.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
          >
            <option value="">All types</option>
            {issueTypeColumns.map(col => (
              <option key={col.key} value={col.key}>
                {col.label}
              </option>
            ))}
          </select>
          {onCreateClick ? (
            <Button type="button" size="sm" onClick={onCreateClick}>
              New Issue
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading issues...</p>
        ) : error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </p>
        ) : filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
            No issues found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {issueTypeColumns.map(col => (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {col.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">{grouped[col.key].length}</span>
                </div>
                {grouped[col.key].length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-xs text-muted-foreground">
                    None
                  </div>
                ) : (
                  grouped[col.key].map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onClick={onIssueSelect ? () => onIssueSelect(issue) : undefined}
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

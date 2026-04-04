import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Issue, IssueStatus } from '@/lib/fleetTypes'

const statusOptions: Array<{ value: IssueStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'duplicate', label: 'Duplicate' },
]

export function IssueDetailView({
  issue,
  projectId,
  onClose,
  onStatusChange,
}: {
  issue: Issue
  projectId: string
  onClose: () => void
  onStatusChange?: (issueId: string, status: IssueStatus) => void
}) {
  const [status, setStatus] = useState<IssueStatus>(issue.status)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSaveStatus = async () => {
    if (status === issue.status) {
      return
    }

    setSaving(true)
    setSaveMessage(null)
    setSaveError(null)

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/issues/${encodeURIComponent(issue.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      )
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to update status')
      }
      setSaveMessage(`Status updated to ${status}.`)
      onStatusChange?.(issue.id, status)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-cyan-400/20 bg-cyan-400/5 shadow-2xl shadow-cyan-950/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle className="text-base">{issue.title}</CardTitle>
          <CardDescription>
            <span className="rounded-full border border-border/60 px-2 py-1 text-xs">
              {issue.type}
            </span>
            {issue.relatedTask ? (
              <span className="ml-2 rounded-full border border-border/60 px-2 py-1 text-xs">
                Task: {issue.relatedTask}
              </span>
            ) : null}
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {issue.description ? (
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4 text-sm whitespace-pre-wrap break-words">
            {issue.description}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Status:</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as IssueStatus)}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSaveStatus()}
            disabled={saving || status === issue.status}
          >
            {saving ? 'Saving...' : 'Update Status'}
          </Button>
        </div>

        {saveMessage ? <p className="text-xs text-emerald-300">{saveMessage}</p> : null}
        {saveError ? <p className="text-xs text-red-300">{saveError}</p> : null}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/60 bg-background/70 px-2 py-1">
            ID: {issue.id}
          </span>
          <span className="rounded-full border border-border/60 bg-background/70 px-2 py-1">
            Created: {new Date(issue.createdAt).toLocaleString()}
          </span>
          {issue.updatedAt ? (
            <span className="rounded-full border border-border/60 bg-background/70 px-2 py-1">
              Updated: {new Date(issue.updatedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

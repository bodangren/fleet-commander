import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Issue, IssueType } from '@/lib/fleetTypes'

const issueTypeOptions: Array<{ value: IssueType; label: string }> = [
  { value: 'blocker', label: 'Blocker' },
  { value: 'delegation', label: 'Delegation' },
  { value: 'clarification', label: 'Clarification' },
  { value: 'feature-request', label: 'Feature Request' },
]

export function IssueCreateModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string
  onClose: () => void
  onCreated?: (issue: Issue) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<IssueType>('blocker')
  const [relatedTask, setRelatedTask] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const body: Record<string, string> = {
        title: title.trim(),
        type,
      }
      if (description.trim()) {
        body.description = description.trim()
      }
      if (relatedTask.trim()) {
        body.relatedTask = relatedTask.trim()
      }

      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as Issue & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to create issue')
      }
      onCreated?.(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-lg border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Create Issue</CardTitle>
          <CardDescription>
            Report a blocker, delegation, or clarification for the agent fleet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detailed description of the issue..."
                rows={4}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as IssueType)}
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
                >
                  {issueTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Related Task (optional)</label>
                <input
                  type="text"
                  value={relatedTask}
                  onChange={e => setRelatedTask(e.target.value)}
                  placeholder="e.g. phase-1-1"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Issue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

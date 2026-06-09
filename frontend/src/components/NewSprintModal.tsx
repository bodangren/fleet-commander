import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

export interface NewSprintModalSubmit {
  title: string
  goal: string
}

/**
 * Modal for creating a new sprint (track) for the current project.
 * @param saving - Whether the create operation is in progress
 * @param error - Error message to display
 * @param onClose - Callback when the modal is cancelled
 * @param onSubmit - Callback when the form is submitted with title and goal
 */
export function NewSprintModal({
  saving,
  error,
  onClose,
  onSubmit,
}: {
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (payload: NewSprintModalSubmit) => void | Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')

  const trimmedTitle = title.trim()
  const trimmedGoal = goal.trim()
  const canSubmit = trimmedTitle.length > 0 && trimmedGoal.length > 0 && !saving

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    void onSubmit({ title: trimmedTitle, goal: trimmedGoal })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="new-sprint-title"
    >
      <Card className="mx-4 w-full max-w-lg border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-2">
          <h2 id="new-sprint-title" className="text-lg font-semibold">
            New Sprint
          </h2>
          <CardDescription>
            Create a new sprint (track) for this project. You can generate stories from the goal
            later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="new-sprint-title-input" className="text-xs text-muted-foreground">
                Sprint Title
              </label>
              <input
                id="new-sprint-title-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                aria-label="Sprint title"
                placeholder="e.g. Checkout Polish"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="new-sprint-goal-input" className="text-xs text-muted-foreground">
                Goal
              </label>
              <textarea
                id="new-sprint-goal-input"
                rows={3}
                value={goal}
                onChange={e => setGoal(e.target.value)}
                aria-label="Sprint goal"
                placeholder="One sentence describing the outcome users should see."
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {error && (
              <p className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-100">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {saving ? 'Creating...' : 'Create Sprint'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

export interface GeneratedStoryPreview {
  title: string
  asA: string
  iWant: string
  soThat: string
  acceptanceCriteria: string[]
  estimate: 'S' | 'M' | 'L' | 'XL'
  priority: 'Must' | 'Should' | 'Could'
}

/**
 * Modal that drives the AI story generation flow: generate → preview → commit.
 * @param trackId - Track identifier the stories will be committed to
 * @param generating - Whether the initial generation request is in-flight
 * @param committing - Whether the commit request is in-flight
 * @param error - Error message to display (generation or commit failure)
 * @param stories - Preview list returned from the generate endpoint
 * @param onGenerate - Callback to trigger generation with an optional goal override
 * @param onCommit - Callback to commit the (possibly edited) preview
 * @param onClose - Callback to dismiss the modal
 */
export function GenerateStoriesModal({
  trackId,
  generating,
  committing,
  error,
  stories,
  onGenerate,
  onCommit,
  onClose,
}: {
  trackId: string
  generating: boolean
  committing: boolean
  error: string | null
  stories: GeneratedStoryPreview[] | null
  onGenerate: (goal: string) => void | Promise<void>
  onCommit: (stories: GeneratedStoryPreview[]) => void | Promise<void>
  onClose: () => void
}) {
  const [goal, setGoal] = useState('')
  const [editable, setEditable] = useState<GeneratedStoryPreview[] | null>(stories)

  if (stories && editable === null) {
    setEditable(stories)
  }

  const hasPreview = editable !== null && editable.length > 0

  function updateTitle(index: number, value: string) {
    if (!editable) return
    setEditable(editable.map((s, i) => (i === index ? { ...s, title: value } : s)))
  }

  function removeStory(index: number) {
    if (!editable) return
    setEditable(editable.filter((_, i) => i !== index))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="generate-stories-title"
    >
      <Card className="mx-4 w-full max-w-2xl border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-2">
          <h2 id="generate-stories-title" className="text-lg font-semibold">
            Generate Stories
          </h2>
          <CardDescription>
            Use the AI harness to draft stories for sprint <code>{trackId}</code>. Review the
            preview and commit when ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPreview ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="generate-goal" className="text-xs text-muted-foreground">
                  Goal (optional override)
                </label>
                <textarea
                  id="generate-goal"
                  rows={2}
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  aria-label="Goal override"
                  placeholder="Leave blank to use the spec's ## Goal section."
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
                <Button
                  type="button"
                  disabled={generating}
                  onClick={() => void onGenerate(goal.trim())}
                >
                  {generating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {editable!.length} story{editable!.length === 1 ? '' : 'ies'} ready to commit.
              </div>
              <ul className="space-y-3 max-h-96 overflow-y-auto" aria-label="Story preview list">
                {editable!.map((story, index) => (
                  <li
                    key={index}
                    className="rounded-md border border-border/60 bg-black/20 p-3 space-y-2"
                  >
                    <input
                      type="text"
                      value={story.title}
                      onChange={e => updateTitle(index, e.target.value)}
                      aria-label={`Story ${index + 1} title`}
                      className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm font-medium"
                    />
                    <p className="text-xs text-muted-foreground">
                      As a {story.asA}; I want {story.iWant}; so that {story.soThat}.
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded bg-cyan-400/10 px-2 py-0.5 uppercase tracking-wider text-cyan-200">
                        {story.estimate}
                      </span>
                      <span className="rounded bg-amber-400/10 px-2 py-0.5 uppercase tracking-wider text-amber-200">
                        {story.priority}
                      </span>
                      <span className="rounded bg-border/40 px-2 py-0.5 uppercase tracking-wider text-muted-foreground">
                        {story.acceptanceCriteria.length} AC
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeStory(index)}
                      aria-label={`Remove story ${index + 1}`}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>

              {error && (
                <p className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-100">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={committing || (editable?.length ?? 0) === 0}
                  onClick={() => editable && void onCommit(editable)}
                >
                  {committing ? 'Committing...' : 'Commit'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

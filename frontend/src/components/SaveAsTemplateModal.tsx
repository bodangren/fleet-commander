import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

export interface SaveAsTemplateSource {
  project: {
    _id: string
    name: string
    description: string
  }
  tasks: Array<{
    _id: string
    title: string
    storyPoints: number
    priority: 'low' | 'medium' | 'high'
    status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
    description?: string
    assigneeId?: string
    sessionId?: string
    actualCost?: number
    reviewerId?: string
    mergerId?: string
    dependencies?: string[]
  }>
  agents: Array<{
    _id: string
    name: string
    role: 'architect' | 'executor' | 'reviewer' | 'merger'
    model: string
    skills: string[]
    costPerPoint: number
  }>
}

export interface SaveAsTemplatePayload {
  name: string
  description: string
  category: string
  tasks: Array<{
    title: string
    storyPoints: number
    priority: 'low' | 'medium' | 'high'
    status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
    dependencies?: string[]
  }>
  defaultAgents: Array<{
    role: 'architect' | 'executor' | 'reviewer' | 'merger'
    model: string
    skills: string[]
    costPerPoint: number
  }>
  estimatedBudget: number
}

const CATEGORY_OPTIONS = ['Web App', 'API Service', 'CLI', 'Documentation', 'Other']

/**
 * Modal for saving the current project as a reusable template
 * @param source - Project, tasks, and agents to derive the template from
 * @param saving - Whether a save operation is in progress
 * @param error - Error message to display
 * @param onClose - Callback when the modal is closed
 * @param onSave - Callback when the Save button is clicked with the stripped template payload
 */
export function SaveAsTemplateModal({
  source,
  saving,
  error,
  onClose,
  onSave,
}: {
  source: SaveAsTemplateSource
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (payload: SaveAsTemplatePayload) => void | Promise<void>
}) {
  const [name, setName] = useState(source.project.name)
  const [description, setDescription] = useState(source.project.description)
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0])

  const stripped = useMemo(() => {
    const tasks = source.tasks.map(t => ({
      title: t.title,
      storyPoints: t.storyPoints,
      priority: t.priority,
      status: t.status,
      ...(t.dependencies ? { dependencies: [...t.dependencies] } : {}),
    }))

    const defaultAgents = source.agents.map(a => ({
      role: a.role,
      model: a.model,
      skills: [...a.skills],
      costPerPoint: a.costPerPoint,
    }))

    let estimatedBudget = 0
    if (defaultAgents.length > 0 && tasks.length > 0) {
      const totalPoints = tasks.reduce((sum, t) => sum + t.storyPoints, 0)
      const avgCost =
        defaultAgents.reduce((sum, a) => sum + a.costPerPoint, 0) / defaultAgents.length
      estimatedBudget = Math.round(totalPoints * avgCost * 100) / 100
    }

    return { tasks, defaultAgents, estimatedBudget }
  }, [source])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({
      name: trimmed,
      description,
      category,
      tasks: stripped.tasks,
      defaultAgents: stripped.defaultAgents,
      estimatedBudget: stripped.estimatedBudget,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-lg border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-2">
          <h2 className="text-lg font-semibold">Save as Template</h2>
          <CardDescription>Derive a reusable template from this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="template-name" className="text-xs text-muted-foreground">
                Template Name
              </label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                aria-label="Template name"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="template-desc" className="text-xs text-muted-foreground">
                Description
              </label>
              <input
                id="template-desc"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                aria-label="Description"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="template-category" className="text-xs text-muted-foreground">
                Category
              </label>
              <select
                id="template-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                aria-label="Category"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-muted-foreground">
              {source.tasks.length} {source.tasks.length === 1 ? 'task' : 'tasks'} &middot;{' '}
              {source.agents.length} {source.agents.length === 1 ? 'agent' : 'agents'}
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
              <Button type="submit" disabled={!name.trim() || saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

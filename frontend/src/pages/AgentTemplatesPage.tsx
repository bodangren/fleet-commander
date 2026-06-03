import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type AgentTemplate = {
  _id: string
  name: string
  role: string
  model: string
  temperature: number
  systemPrompt: string
  skills: string[]
  estimatedCostPer1kTokens: number
  createdAt: number
  updatedAt: number
}

const roleColors: Record<string, string> = {
  architect: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  executor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  reviewer: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  merger: 'bg-green-500/20 text-green-300 border-green-500/30',
}

/**
 * Renders a page component
 * @returns {JSX.Element} The agent templates listing page
 */
export function AgentTemplatesPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-templates')
      if (!res.ok) throw new Error('Failed to load templates')
      const data = (await res.json()) as AgentTemplate[]
      setTemplates(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const handleClone = async (id: string, name: string) => {
    const newName = window.prompt('Clone name:', `${name}-clone`)
    if (!newName) return
    try {
      const res = await fetch(`/api/agent-templates/${id}/clone`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newName }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Clone failed')
      }
      await fetchTemplates()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Clone failed')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/agent-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Delete failed')
      }
      await fetchTemplates()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSeedDefaults = async () => {
    try {
      const res = await fetch('/api/agent-templates/seed-defaults', { method: 'POST' })
      if (!res.ok) throw new Error('Seed failed')
      showToast('success', 'Default templates seeded')
      await fetchTemplates()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Seed failed'
      setError(msg)
      showToast('error', msg)
    }
  }

  if (loading) {
    return <EmptyState text="Loading agent templates..." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Agent Templates</h3>
          <p className="text-sm text-muted-foreground">
            {templates.length} templates. Define reusable agent personas with model, skills, and
            cost profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void handleSeedDefaults()}>
            Seed Defaults
          </Button>
          <Button asChild>
            <Link to="/agent-templates/new/edit">New Template</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {!error && templates.length === 0 ? (
        <EmptyState text="No agent templates yet. Create one or seed the defaults." />
      ) : templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map(tmpl => (
            <Card
              key={tmpl._id}
              className="border-border/60 bg-background/75 backdrop-blur hover:border-cyan-500/40 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                    <span
                      className={cn(
                        'mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium',
                        roleColors[tmpl.role] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {tmpl.role}
                    </span>
                  </div>
                  <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {tmpl.model}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {tmpl.systemPrompt || 'No system prompt'}
                </p>

                {tmpl.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tmpl.skills.map(skill => (
                      <span
                        key={skill}
                        className="rounded-md bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>${tmpl.estimatedCostPer1kTokens.toFixed(3)}/1k tokens</span>
                  <span>temp: {tmpl.temperature}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/agent-templates/${tmpl._id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleClone(tmpl._id, tmpl.name)}
                  >
                    Clone
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(tmpl._id, tmpl.name)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}

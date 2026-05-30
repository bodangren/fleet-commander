import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type TemplateForm = {
  name: string
  role: string
  model: string
  temperature: string
  systemPrompt: string
  skills: string
  estimatedCostPer1kTokens: string
}

/**
 * Returns default form values for agent template
 * @returns {TemplateForm} Default template form values
 */
const defaultForm = (): TemplateForm => ({
  name: '',
  role: 'executor',
  model: 'claude-sonnet',
  temperature: '0.3',
  systemPrompt: '',
  skills: '',
  estimatedCostPer1kTokens: '0.003',
})

const SUPPORTED_MODELS = [
  'claude-opus',
  'claude-sonnet',
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-pro',
  'gemini-2.5-pro',
]

const ROLES = ['architect', 'executor', 'reviewer', 'merger']

/**
 * Renders a page component
 * @returns {JSX.Element} The agent template editor page
 */
export function AgentTemplateEditorPage() {
  const { id = 'new' } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState<TemplateForm>(defaultForm)
  const [loading, setLoading] = useState(id !== 'new')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = id !== 'new'

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/agent-templates/${id}`)
        if (!res.ok) throw new Error('Template not found')
        const tmpl = (await res.json()) as {
          name: string
          role: string
          model: string
          temperature: number
          systemPrompt: string
          skills: string[]
          estimatedCostPer1kTokens: number
        }
        if (!cancelled) {
          setForm({
            name: tmpl.name,
            role: tmpl.role,
            model: tmpl.model,
            temperature: String(tmpl.temperature),
            systemPrompt: tmpl.systemPrompt,
            skills: tmpl.skills.join(', '),
            estimatedCostPer1kTokens: String(tmpl.estimatedCostPer1kTokens),
          })
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim().toLowerCase(),
        role: form.role,
        model: form.model,
        temperature: Number(form.temperature),
        systemPrompt: form.systemPrompt,
        skills: form.skills
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        estimatedCostPer1kTokens: Number(form.estimatedCostPer1kTokens),
      }

      if (!payload.name) {
        setError('Name is required')
        return
      }

      const url = isEdit ? `/api/agent-templates/${id}` : '/api/agent-templates'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Save failed')
      }

      navigate('/agent-templates')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [form, id, isEdit, navigate])

  const handleDelete = useCallback(async () => {
    if (!isEdit) return
    if (!window.confirm(`Delete template "${form.name}"?`)) return
    try {
      const res = await fetch(`/api/agent-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Delete failed')
      }
      navigate('/agent-templates')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [form.name, id, isEdit, navigate])

  if (loading) {
    return <EmptyState text="Loading template..." />
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-background/75 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">
                {isEdit ? `Edit Template: ${form.name}` : 'New Agent Template'}
              </CardTitle>
              <CardDescription>
                Define a reusable agent persona with model, skills, and cost profile.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEdit && (
                <Button variant="destructive" onClick={() => void handleDelete()}>
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/agent-templates')}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Identity
                </h3>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Name</span>
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="alice"
                    aria-label="Name"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Role</span>
                    <select
                      className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      aria-label="Role"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Model</span>
                    <select
                      className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                      value={form.model}
                      onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                      aria-label="Model"
                    >
                      {SUPPORTED_MODELS.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Temperature</span>
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={Number(form.temperature)}
                        onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))}
                        className="w-full"
                        aria-label="Temperature"
                      />
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Precise 0.1', value: '0.1' },
                          { label: 'Balanced 0.5', value: '0.5' },
                          { label: 'Creative 0.9', value: '0.9' },
                        ].map(preset => (
                          <Button
                            key={preset.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setForm(f => ({ ...f, temperature: preset.value }))}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Est. Cost per 1k Tokens ($)</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                      value={form.estimatedCostPer1kTokens}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          estimatedCostPer1kTokens: e.target.value,
                        }))
                      }
                      aria-label="Estimated cost per 1k tokens"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Skills
                </h3>
                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Comma-separated skills</span>
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.skills}
                    onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="react, typescript, node"
                    aria-label="Skills"
                  />
                </label>
              </section>
            </div>

            <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                System Prompt
              </h3>
              <textarea
                className="h-[400px] w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 resize-none"
                value={form.systemPrompt}
                onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="Write the agent system prompt..."
                aria-label="System Prompt"
              />
            </section>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/agent-templates')}>
              Back to list
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

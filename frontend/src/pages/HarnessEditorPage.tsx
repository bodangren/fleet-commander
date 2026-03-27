import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { HarnessRecord } from '@/lib/fleetTypes'
import { cn } from '@/lib/utils'

type HarnessFormState = {
  name: string
  binary: string
  discoveryCommand: string
  parseStrategy: 'regex' | 'json' | 'line-per-model'
  pattern: string
  invocationTemplate: string
  flagsText: string
}

const defaultHarnessForm = (): HarnessFormState => ({
  name: '',
  binary: '',
  discoveryCommand: '',
  parseStrategy: 'line-per-model',
  pattern: '',
  invocationTemplate: '',
  flagsText: '{}',
})

function joinQuery(project: string) {
  return project ? `?project=${encodeURIComponent(project)}` : ''
}

function stringifyFlags(flags: Record<string, string> | undefined) {
  return JSON.stringify(flags ?? {}, null, 2)
}

function parseFlags(text: string) {
  if (!text.trim()) {
    return {}
  }
  const parsed = JSON.parse(text)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Harness flags must be a JSON object')
  }
  return parsed as Record<string, string>
}

function toHarnessPayload(form: HarnessFormState) {
  return {
    name: form.name,
    binary: form.binary,
    discovery: {
      command: form.discoveryCommand,
      parse_strategy: form.parseStrategy,
      pattern: form.pattern,
    },
    invocation: {
      template: form.invocationTemplate,
      flags: parseFlags(form.flagsText),
    },
  }
}

export function HarnessEditorPage() {
  const { name = 'new' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const project = searchParams.get('project') ?? ''

  const [form, setForm] = useState<HarnessFormState>(() => defaultHarnessForm())
  const [loading, setLoading] = useState(name !== 'new')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [discoveryResult, setDiscoveryResult] = useState<string[]>([])
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [scopeLayer, setScopeLayer] = useState<string>('new')

  const projectQuery = useMemo(() => joinQuery(project), [project])

  useEffect(() => {
    let cancelled = false

    async function loadHarness() {
      if (name === 'new') {
        setLoading(false)
        setScopeLayer('new')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/harnesses/${encodeURIComponent(name)}${projectQuery}`)
        const payload = (await response.json()) as {
          layer?: string
          definition?: HarnessRecord['definition']
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load harness')
        }

        if (cancelled) {
          return
        }

        const definition = payload.definition
        if (!definition) {
          throw new Error('Harness payload missing definition')
        }

        setForm({
          name: definition.name || name,
          binary: definition.binary ?? '',
          discoveryCommand: definition.discovery?.command ?? '',
          parseStrategy:
            definition.discovery?.parseStrategy === 'regex'
              ? 'regex'
              : definition.discovery?.parseStrategy === 'json'
                ? 'json'
                : 'line-per-model',
          pattern: definition.discovery?.pattern ?? '',
          invocationTemplate: definition.invocation?.template ?? '',
          flagsText: stringifyFlags(definition.invocation?.flags),
        })
        setScopeLayer(payload.layer ?? 'user')
      } catch (loadError) {
        if (cancelled) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load harness')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadHarness()

    return () => {
      cancelled = true
    }
  }, [name, projectQuery])

  async function handleSave() {
    const targetName = name === 'new' ? form.name.trim() : name
    if (!targetName) {
      setError('Harness name is required before saving.')
      return
    }
    if (!form.binary.trim()) {
      setError('Harness binary is required')
      return
    }
    if (!form.discoveryCommand.trim()) {
      setError('Discovery command is required')
      return
    }
    if (!form.invocationTemplate.trim()) {
      setError('Invocation template is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/harnesses/${encodeURIComponent(targetName)}${projectQuery}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(toHarnessPayload(form)),
        },
      )
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save harness')
      }

      if (name === 'new' || targetName !== name) {
        navigate(`/harnesses/${encodeURIComponent(targetName)}/edit${projectQuery}`)
      } else {
        setForm(prev => ({ ...prev, name: targetName }))
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save harness')
    } finally {
      setSaving(false)
    }
  }

  async function handleDiscovery() {
    const targetName = name === 'new' ? form.name.trim() : name
    if (!targetName) {
      setDiscoveryError('Save or name the harness before testing discovery')
      return
    }

    setDiscoveryLoading(true)
    setDiscoveryError(null)

    try {
      const response = await fetch(
        `/api/harnesses/${encodeURIComponent(targetName)}/models${projectQuery}`,
      )
      const payload = (await response.json()) as { models?: string[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to test discovery')
      }
      setDiscoveryResult(payload.models ?? [])
    } catch (discoveryLoadError) {
      setDiscoveryResult([])
      setDiscoveryError(
        discoveryLoadError instanceof Error
          ? discoveryLoadError.message
          : 'Failed to test discovery',
      )
    } finally {
      setDiscoveryLoading(false)
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(`Reset ${name} to the bundled default?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(
        `/api/harnesses/${encodeURIComponent(name)}${projectQuery}/reset`,
        {
          method: 'POST',
        },
      )
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to reset harness')
      }
      navigate(`/harnesses${projectQuery}`)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset harness')
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete ${name}?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/harnesses/${encodeURIComponent(name)}${projectQuery}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete harness')
      }
      navigate(`/harnesses${projectQuery}`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete harness')
    }
  }

  if (loading) {
    return <EmptyState text="Loading harness editor..." />
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-background/75 backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">
                {name === 'new' ? 'New Harness' : `Edit Harness: ${name}`}
              </CardTitle>
              <CardDescription>
                {scopeLayer === 'project'
                  ? 'Project override'
                  : scopeLayer === 'user'
                    ? 'User override'
                    : scopeLayer === 'bundled'
                      ? 'Bundled default'
                      : 'Create a new harness definition'}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {name === 'new' ? null : (
                <>
                  {scopeLayer === 'bundled' ? (
                    <Button variant="destructive" onClick={() => void handleReset()}>
                      Reset to Default
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => void handleDelete()}>
                      Delete
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="outline"
                onClick={() => void handleDiscovery()}
                disabled={discoveryLoading}
              >
                {discoveryLoading ? 'Testing...' : 'Test Discovery'}
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Harness'}
              </Button>
            </div>
          </div>

          {project ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1">
                Project: {project}
              </span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Identity
                </h3>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Name</span>
                  <input
                    className={cn(
                      'w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400',
                      name !== 'new' && 'opacity-70',
                    )}
                    value={form.name}
                    disabled={name !== 'new'}
                    onChange={event => {
                      setForm(prev => ({ ...prev, name: event.target.value }))
                    }}
                    placeholder="claude-code"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Binary</span>
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.binary}
                    onChange={event => {
                      setForm(prev => ({ ...prev, binary: event.target.value }))
                    }}
                    placeholder="claude"
                  />
                </label>
              </section>

              <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Discovery
                </h3>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Discovery command</span>
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.discoveryCommand}
                    onChange={event => {
                      setForm(prev => ({ ...prev, discoveryCommand: event.target.value }))
                    }}
                    placeholder="claude --help"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Parse Strategy</span>
                  <select
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.parseStrategy}
                    onChange={event => {
                      setForm(prev => ({
                        ...prev,
                        parseStrategy: event.target.value as HarnessFormState['parseStrategy'],
                      }))
                    }}
                  >
                    <option value="regex">regex</option>
                    <option value="json">json</option>
                    <option value="line-per-model">line-per-model</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Pattern</span>
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.pattern}
                    onChange={event => {
                      setForm(prev => ({ ...prev, pattern: event.target.value }))
                    }}
                    placeholder="claude-(\\S+)"
                  />
                </label>
              </section>
            </div>

            <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Invocation
                </h3>
                <span className="text-xs text-muted-foreground">YAML payload</span>
              </div>

              <label className="space-y-2 text-sm">
                <span className="block text-muted-foreground">Invocation template</span>
                <textarea
                  className="min-h-32 w-full rounded-3xl border border-border/60 bg-background/90 p-4 font-mono text-sm leading-6 outline-none transition focus:border-cyan-400"
                  value={form.invocationTemplate}
                  onChange={event => {
                    setForm(prev => ({ ...prev, invocationTemplate: event.target.value }))
                  }}
                  placeholder="claude --model {model} --prompt {prompt}"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="block text-muted-foreground">Flags JSON</span>
                <textarea
                  className="min-h-40 w-full rounded-3xl border border-border/60 bg-background/90 p-4 font-mono text-sm leading-6 outline-none transition focus:border-cyan-400"
                  value={form.flagsText}
                  onChange={event => {
                    setForm(prev => ({ ...prev, flagsText: event.target.value }))
                  }}
                  placeholder='{"dangerously_skip_permissions":"--dangerously-skip-permissions"}'
                />
              </label>

              <div className="rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                <pre className="whitespace-pre-wrap break-words">
                  {`Name: ${form.name || 'unset'}\nBinary: ${form.binary || 'unset'}\nDiscovery: ${form.discoveryCommand || 'unset'}`}
                </pre>
              </div>

              {discoveryError ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {discoveryError}
                </div>
              ) : null}

              {discoveryResult.length > 0 ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <div className="mb-2 font-medium">Discovered models</div>
                  <ul className="space-y-1">
                    {discoveryResult.map(model => (
                      <li key={model}>{model}</li>
                    ))}
                  </ul>
                </div>
              ) : discoveryLoading ? (
                <div className="rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                  Discovering models...
                </div>
              ) : null}
            </section>
          </div>

          {name !== 'new' ? (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  navigate(`/harnesses${projectQuery}`)
                }}
              >
                Back to list
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

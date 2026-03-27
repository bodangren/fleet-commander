import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { ResultPanel } from '@/components/ResultPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AgentRecord, AgentTestResult, HarnessRecord } from '@/lib/fleetTypes'
import { cn } from '@/lib/utils'

type AgentFormState = {
  name: string
  description: string
  mode: 'agent' | 'subagent'
  harness: string
  model: string
  temperature: string
  tools: {
    write: boolean
    edit: boolean
    bash: boolean
  }
  body: string
}

const defaultAgentForm = (): AgentFormState => ({
  name: '',
  description: '',
  mode: 'agent',
  harness: '',
  model: '',
  temperature: '0.2',
  tools: {
    write: true,
    edit: true,
    bash: true,
  },
  body: '',
})

function splitModel(value: string) {
  const slashIndex = value.indexOf('/')
  if (slashIndex === -1) {
    return { harness: '', model: value }
  }
  return {
    harness: value.slice(0, slashIndex),
    model: value.slice(slashIndex + 1),
  }
}

function joinQuery(project: string) {
  return project ? `?project=${encodeURIComponent(project)}` : ''
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeAgentPayload(form: AgentFormState) {
  return {
    description: form.description,
    mode: form.mode,
    model: `${form.harness}/${form.model}`.replace(/^\/|\/$/g, ''),
    temperature: Number(form.temperature),
    tools: form.tools,
    body: form.body,
  }
}

export function AgentEditorPage() {
  const { name = 'new' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const project = searchParams.get('project') ?? ''

  const [form, setForm] = useState<AgentFormState>(() => defaultAgentForm())
  const [loading, setLoading] = useState(name !== 'new')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [harnesses, setHarnesses] = useState<HarnessRecord[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [scopeLayer, setScopeLayer] = useState<string>('new')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<AgentTestResult | null>(null)

  const projectQuery = useMemo(() => joinQuery(project), [project])
  const editorName = form.name || name
  const currentModel = useMemo(
    () => (form.harness && form.model ? `${form.harness}/${form.model}` : form.model),
    [form.harness, form.model],
  )

  useEffect(() => {
    let cancelled = false

    async function loadAgent() {
      if (name === 'new') {
        setLoading(false)
        setScopeLayer('new')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/agents/${encodeURIComponent(name)}${projectQuery}`)
        const payload = (await response.json()) as {
          layer?: string
          definition?: AgentRecord['definition']
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load agent')
        }

        if (cancelled) {
          return
        }

        const definition = payload.definition
        if (!definition) {
          throw new Error('Agent payload missing definition')
        }

        const split = splitModel(definition.model)
        setForm({
          name: definition.name || name,
          description: definition.description ?? '',
          mode: definition.mode === 'subagent' ? 'subagent' : 'agent',
          harness: split.harness,
          model: split.model,
          temperature: String(definition.temperature ?? 0.2),
          tools: {
            write: Boolean(definition.tools?.write),
            edit: Boolean(definition.tools?.edit),
            bash: Boolean(definition.tools?.bash),
          },
          body: definition.body ?? '',
        })
        setScopeLayer(payload.layer ?? 'user')
      } catch (loadError) {
        if (cancelled) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load agent')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAgent()

    return () => {
      cancelled = true
    }
  }, [name, projectQuery])

  useEffect(() => {
    let cancelled = false

    async function loadHarnesses() {
      try {
        const response = await fetch(`/api/harnesses${projectQuery}`)
        const payload = (await response.json()) as HarnessRecord[] | { error?: string }
        if (!response.ok) {
          const message =
            !Array.isArray(payload) && payload.error ? payload.error : 'Failed to load harnesses'
          throw new Error(message)
        }

        if (!cancelled) {
          setHarnesses(Array.isArray(payload) ? payload : [])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load harnesses')
        }
      }
    }

    void loadHarnesses()

    return () => {
      cancelled = true
    }
  }, [projectQuery])

  useEffect(() => {
    let cancelled = false

    async function loadModels() {
      if (!form.harness) {
        setAvailableModels([])
        setModelError(null)
        setModelLoading(false)
        return
      }

      setModelLoading(true)
      setModelError(null)

      try {
        const response = await fetch(
          `/api/harnesses/${encodeURIComponent(form.harness)}/models${projectQuery}`,
        )
        const payload = (await response.json()) as { models?: string[]; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to discover models')
        }

        if (!cancelled) {
          const models = payload.models ?? []
          setAvailableModels(models)
          if (models.length > 0) {
            setForm(prev => {
              if (prev.model && models.includes(prev.model)) {
                return prev
              }
              return { ...prev, model: models[0] }
            })
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setAvailableModels([])
          setModelError(
            loadError instanceof Error ? loadError.message : 'Failed to discover models',
          )
        }
      } finally {
        if (!cancelled) {
          setModelLoading(false)
        }
      }
    }

    void loadModels()

    return () => {
      cancelled = true
    }
  }, [form.harness, projectQuery])

  const harnessNames = useMemo(() => {
    const names = new Set<string>()
    for (const harness of harnesses) {
      if (harness.definition.name) {
        names.add(harness.definition.name)
      }
    }
    if (form.harness) {
      names.add(form.harness)
    }
    return Array.from(names).sort((left, right) => left.localeCompare(right))
  }, [harnesses, form.harness])

  const modelOptions = useMemo(() => {
    const options = new Set<string>(availableModels)
    if (form.model) {
      options.add(form.model)
    }
    return Array.from(options)
  }, [availableModels, form.model])

  async function handleSave() {
    const rawName = form.name.trim()
    const targetName = name === 'new' ? normalizeName(rawName) || rawName : rawName || name
    if (!targetName) {
      setError('Agent name is required before saving.')
      return
    }
    if (!form.description.trim()) {
      setError('Agent description is required')
      return
    }
    if (!form.harness) {
      setError('Select a harness before saving')
      return
    }
    if (!form.model.trim()) {
      setError('Select a model before saving')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(targetName)}${projectQuery}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makeAgentPayload(form)),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save agent')
      }

      if (name === 'new' || targetName !== name) {
        navigate(`/agents/${encodeURIComponent(targetName)}/edit${projectQuery}`)
      } else {
        setForm(prev => ({ ...prev, name: targetName }))
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save agent')
    } finally {
      setSaving(false)
    }
  }

  async function handleClone() {
    const nextName = window.prompt('Clone as:', `${form.name || name}-copy`)
    if (!nextName) {
      return
    }

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(name)}/clone${projectQuery}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nextName }),
      })
      const payload = (await response.json()) as { error?: string; name?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to clone agent')
      }
      navigate(`/agents/${encodeURIComponent(payload.name ?? nextName)}/edit${projectQuery}`)
    } catch (cloneError) {
      setError(cloneError instanceof Error ? cloneError.message : 'Failed to clone agent')
    }
  }

  async function handleTestAgent() {
    const targetName = name === 'new' ? form.name.trim() : name
    if (!targetName) {
      setError('Save the agent before running a test.')
      return
    }

    setTesting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/agents/${encodeURIComponent(targetName)}/test${projectQuery}`,
        {
          method: 'POST',
        },
      )
      const payload = (await response.json()) as AgentTestResult & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to run agent test')
      }

      setTestResult({
        name: payload.name || targetName,
        status: payload.status,
        latencyMs: payload.latencyMs,
        output: payload.output,
        error: payload.error,
      })
    } catch (testError) {
      setTestResult({
        name: targetName,
        status: 'failed',
        latencyMs: 0,
        output: '',
        error: testError instanceof Error ? testError.message : 'Failed to run agent test',
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(`Reset ${name} to the bundled default?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(name)}/reset${projectQuery}`, {
        method: 'POST',
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to reset agent')
      }
      navigate(`/agents${projectQuery}`)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset agent')
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete ${name}?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(name)}${projectQuery}`, {
        method: 'DELETE',
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete agent')
      }
      navigate(`/agents${projectQuery}`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete agent')
    }
  }

  if (loading) {
    return <EmptyState text="Loading agent editor..." />
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-background/75 backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">
                {name === 'new' ? 'New Agent' : `Edit Agent: ${editorName}`}
              </CardTitle>
              <CardDescription>
                {scopeLayer === 'project'
                  ? 'Project override'
                  : scopeLayer === 'user'
                    ? 'User override'
                    : scopeLayer === 'bundled'
                      ? 'Bundled default'
                      : 'Create a new agent definition'}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {name === 'new' ? null : (
                <>
                  <Button variant="outline" onClick={() => void handleClone()}>
                    Clone
                  </Button>
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
              <Button variant="outline" onClick={() => void handleTestAgent()} disabled={testing}>
                {testing ? 'Testing...' : 'Test Agent'}
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Agent'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1">
              {currentModel || 'No model selected'}
            </span>
            {project ? (
              <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1">
                Project: {project}
              </span>
            ) : null}
          </div>
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
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                    Identity
                  </h3>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Name</span>
                  <input
                    className={cn(
                      'w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400',
                    )}
                    value={form.name}
                    onChange={event => {
                      setForm(prev => ({ ...prev, name: event.target.value }))
                    }}
                    placeholder="architect"
                    aria-label="Name"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Description</span>
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.description}
                    onChange={event => {
                      setForm(prev => ({ ...prev, description: event.target.value }))
                    }}
                    placeholder="Decomposes specs into implementation plans"
                    aria-label="Description"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Mode</span>
                    <select
                      className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                      value={form.mode}
                      onChange={event => {
                        setForm(prev => ({
                          ...prev,
                          mode: event.target.value === 'subagent' ? 'subagent' : 'agent',
                        }))
                      }}
                      aria-label="Mode"
                    >
                      <option value="agent">agent</option>
                      <option value="subagent">subagent</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Temperature</span>
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={Number(form.temperature)}
                        onChange={event => {
                          setForm(prev => ({ ...prev, temperature: event.target.value }))
                        }}
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
                            onClick={() => {
                              setForm(prev => ({ ...prev, temperature: preset.value }))
                            }}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Harness
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Harness</span>
                    <select
                      className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                      value={form.harness}
                      onChange={event => {
                        const nextHarness = event.target.value
                        setAvailableModels([])
                        setModelError(null)
                        setForm(prev => ({
                          ...prev,
                          harness: nextHarness,
                          model: '',
                        }))
                      }}
                      aria-label="Harness"
                    >
                      <option value="">Select a harness</option>
                      {harnessNames.map(harnessName => (
                        <option key={harnessName} value={harnessName}>
                          {harnessName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="block text-muted-foreground">Model</span>
                    <select
                      className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                      value={form.model}
                      onChange={event => {
                        setForm(prev => ({ ...prev, model: event.target.value }))
                      }}
                      disabled={!form.harness}
                      aria-label="Model"
                    >
                      <option value="">
                        {modelLoading ? 'Loading models...' : 'Select a model'}
                      </option>
                      {modelOptions.map(model => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {modelError ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    {modelError}
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Choose a discovered model from the dropdown. The list refreshes when the harness
                  changes.
                </p>
              </section>

              <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  Tool Permissions
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['write', 'edit', 'bash'] as const).map(tool => (
                    <label
                      key={tool}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm"
                    >
                      <span className="capitalize">{tool}</span>
                      <input
                        type="checkbox"
                        checked={form.tools[tool]}
                        onChange={event => {
                          setForm(prev => ({
                            ...prev,
                            tools: {
                              ...prev.tools,
                              [tool]: event.target.checked,
                            },
                          }))
                        }}
                        aria-label={`${tool} tool`}
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <MarkdownEditor
              label="System Prompt"
              value={form.body}
              onChange={value => {
                setForm(prev => ({ ...prev, body: value }))
              }}
              placeholder="Write the agent system prompt in Markdown."
            />
          </div>

          {name !== 'new' ? (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  navigate(`/agents${projectQuery}`)
                }}
              >
                Back to list
              </Button>
            </div>
          ) : null}

          {testResult ? (
            <ResultPanel
              title={`Agent Dry Run: ${testResult.name}`}
              status={testResult.status === 'success' ? 'success' : 'failed'}
              subtitle={`${testResult.latencyMs} ms`}
              output={testResult.output}
              error={testResult.error}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

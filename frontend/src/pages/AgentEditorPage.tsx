import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { ResultPanel } from '@/components/ResultPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useAgentActions,
  useAgentLoader,
  useHarnessList,
  useModelDiscovery,
} from '@/hooks/useAgentForm'
import { cn } from '@/lib/utils'

function joinQuery(project: string) {
  return project ? `?project=${encodeURIComponent(project)}` : ''
}

export function AgentEditorPage() {
  const { name = 'new' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const project = searchParams.get('project') ?? ''

  const projectQuery = useMemo(() => joinQuery(project), [project])

  const {
    form,
    scopeLayer,
    loading,
    error: loaderError,
    setName,
    setDescription,
    setMode,
    setHarness: setHarnessForm,
    setModel,
    setTemperature,
    toggleTool,
    setBody,
  } = useAgentLoader(name, projectQuery)

  const { harnessNames, error: harnessError } = useHarnessList(projectQuery)

  const currentModel = useMemo(
    () => (form.harness && form.model ? `${form.harness}/${form.model}` : form.model),
    [form.harness, form.model],
  )

  const { availableModels, modelOptions, modelLoading, modelError } = useModelDiscovery(
    form.harness,
    projectQuery,
    form.model,
    setModel,
  )

  const {
    saving,
    testing,
    testResult,
    error: actionError,
    handleSave,
    handleClone,
    handleTestAgent,
    handleReset,
    handleDelete,
  } = useAgentActions(form, name, projectQuery, navigate, setName)

  const editorName = form.name || name

  const handleHarnessChange = (nextHarness: string) => {
    setHarnessForm(nextHarness)
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
          {loaderError || actionError || harnessError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {loaderError || actionError || harnessError}
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
                      setName(event.target.value)
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
                      setDescription(event.target.value)
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
                        setMode(event.target.value === 'subagent' ? 'subagent' : 'agent')
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
                          setTemperature(event.target.value)
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
                              setTemperature(preset.value)
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
                        handleHarnessChange(event.target.value)
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
                        setModel(event.target.value)
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
                          toggleTool(tool, event.target.checked)
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
                setBody(value)
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

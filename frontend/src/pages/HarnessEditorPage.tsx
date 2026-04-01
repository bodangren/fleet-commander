import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useHarnessActions, useHarnessLoader } from '@/hooks/useHarnessForm'
import { cn } from '@/lib/utils'

function joinQuery(project: string) {
  return project ? `?project=${encodeURIComponent(project)}` : ''
}

export function HarnessEditorPage() {
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
    setBinary,
    setDiscoveryCommand,
    setParseStrategy,
    setPattern,
    setInvocationTemplate,
    setFlagsText,
  } = useHarnessLoader(name, projectQuery)

  const {
    saving,
    discoveryLoading,
    discoveryResult,
    discoveryError,
    error: actionError,
    handleSave,
    handleDiscovery,
    handleReset,
    handleDelete,
  } = useHarnessActions(form, name, projectQuery, navigate, setName)

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
          {loaderError || actionError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {loaderError || actionError}
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
                      setName(event.target.value)
                    }}
                    placeholder="opencode"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block text-muted-foreground">Binary</span>
                  <input
                    className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                    value={form.binary}
                    onChange={event => {
                      setBinary(event.target.value)
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
                      setDiscoveryCommand(event.target.value)
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
                      setParseStrategy(event.target.value as 'regex' | 'json' | 'line-per-model')
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
                      setPattern(event.target.value)
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
                    setInvocationTemplate(event.target.value)
                  }}
                  placeholder='opencode -m {model} run "{prompt}"'
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="block text-muted-foreground">Flags JSON</span>
                <textarea
                  className="min-h-40 w-full rounded-3xl border border-border/60 bg-background/90 p-4 font-mono text-sm leading-6 outline-none transition focus:border-cyan-400"
                  value={form.flagsText}
                  onChange={event => {
                    setFlagsText(event.target.value)
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

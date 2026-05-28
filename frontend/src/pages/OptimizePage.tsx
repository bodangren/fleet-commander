import { useState } from 'react'
import { useAbTests, usePolicyWeights, useExperimentResults } from '@/lib/useConvexData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-400/10 text-gray-300',
  running: 'bg-emerald-400/10 text-emerald-300',
  completed: 'bg-blue-400/10 text-blue-300',
}

function MetricBar({
  label,
  controlValue,
  treatmentValue,
  controlLabel,
  treatmentLabel,
  lowerIsBetter = false,
}: {
  label: string
  controlValue: number
  treatmentValue: number
  controlLabel: string
  treatmentLabel: string
  lowerIsBetter?: boolean
}) {
  const max = Math.max(controlValue, treatmentValue, 1)
  const controlPct = (controlValue / max) * 100
  const treatmentPct = (treatmentValue / max) * 100
  const controlWins = lowerIsBetter
    ? controlValue <= treatmentValue
    : controlValue >= treatmentValue

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[10px] text-muted-foreground">{controlLabel}</span>
          <div className="flex-1 h-4 rounded bg-black/30 overflow-hidden">
            <div
              className={`h-full rounded transition-all ${controlWins ? 'bg-emerald-500/70' : 'bg-gray-500/50'}`}
              style={{ width: `${controlPct}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs tabular-nums">{controlValue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[10px] text-muted-foreground">{treatmentLabel}</span>
          <div className="flex-1 h-4 rounded bg-black/30 overflow-hidden">
            <div
              className={`h-full rounded transition-all ${!controlWins ? 'bg-blue-500/70' : 'bg-gray-500/50'}`}
              style={{ width: `${treatmentPct}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs tabular-nums">{treatmentValue}</span>
        </div>
      </div>
    </div>
  )
}

function ExperimentResultsView({
  experimentId,
  onBack,
}: {
  experimentId: string
  onBack: () => void
}) {
  const results = useExperimentResults(experimentId)
  const [taskDesc, setTaskDesc] = useState('')
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    if (!taskDesc.trim()) return
    setRunning(true)
    try {
      await fetch(`/api/ab-tests/${experimentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDescription: taskDesc }),
      })
      setTaskDesc('')
      window.location.reload()
    } catch {
      // ignore
    } finally {
      setRunning(false)
    }
  }

  const handleComplete = async () => {
    await fetch(`/api/ab-tests/${experimentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    window.location.reload()
  }

  if (!results) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Back to experiments
        </Button>
        <p className="text-sm text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  const { experiment, runs, summary } = results

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Back to experiments
        </Button>
        {experiment?.status === 'running' && (
          <Button variant="outline" size="sm" onClick={handleComplete}>
            Mark Completed
          </Button>
        )}
      </div>

      {experiment && (
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${statusColors[experiment.status] ?? 'bg-gray-400/10 text-gray-300'}`}
              >
                {experiment.status}
              </span>
              <CardTitle className="text-base">{experiment.name}</CardTitle>
            </div>
            <CardDescription>
              {experiment.controlModel} vs {experiment.treatmentModel} &middot;{' '}
              {experiment.agentRole} &middot; {experiment.splitRatio}% split
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Run form */}
            {(experiment.status === 'draft' || experiment.status === 'running') && (
              <div className="flex gap-2">
                <Input
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="Enter a task description to benchmark..."
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleRun()}
                />
                <Button size="sm" onClick={handleRun} disabled={running || !taskDesc.trim()}>
                  {running ? 'Running...' : 'Run'}
                </Button>
              </div>
            )}

            {/* Summary metrics */}
            {summary.controlRuns > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricBar
                  label="Avg Cost ($)"
                  controlValue={summary.controlAvgCost}
                  treatmentValue={summary.treatmentAvgCost}
                  controlLabel={experiment.controlModel}
                  treatmentLabel={experiment.treatmentModel}
                  lowerIsBetter
                />
                <MetricBar
                  label="Avg Duration"
                  controlValue={summary.controlAvgDuration}
                  treatmentValue={summary.treatmentAvgDuration}
                  controlLabel={experiment.controlModel}
                  treatmentLabel={experiment.treatmentModel}
                  lowerIsBetter
                />
                <MetricBar
                  label="Rejection Rate"
                  controlValue={Math.round(summary.controlRejectionRate * 100)}
                  treatmentValue={Math.round(summary.treatmentRejectionRate * 100)}
                  controlLabel={experiment.controlModel}
                  treatmentLabel={experiment.treatmentModel}
                  lowerIsBetter
                />
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Output Similarity</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-4 rounded bg-black/30 overflow-hidden">
                      <div
                        className="h-full rounded bg-purple-500/70 transition-all"
                        style={{ width: `${summary.avgSimilarity * 100}%` }}
                      />
                    </div>
                    <span className="text-sm tabular-nums">
                      {Math.round(summary.avgSimilarity * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Runs table */}
            {runs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Individual Runs ({runs.length})
                </p>
                <div className="rounded-lg border border-border/30 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30 bg-black/20">
                        <th className="px-3 py-2 text-left font-medium">Variant</th>
                        <th className="px-3 py-2 text-left font-medium">Model</th>
                        <th className="px-3 py-2 text-left font-medium">Task</th>
                        <th className="px-3 py-2 text-right font-medium">Cost</th>
                        <th className="px-3 py-2 text-right font-medium">Duration</th>
                        <th className="px-3 py-2 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map(run => (
                        <tr key={run._id} className="border-b border-border/20">
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                                run.variant === 'control'
                                  ? 'bg-emerald-400/10 text-emerald-300'
                                  : 'bg-blue-400/10 text-blue-300'
                              }`}
                            >
                              {run.variant}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{run.model}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">
                            {run.taskDescription}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">${run.cost}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatDuration(run.durationMs)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {run.rejected ? (
                              <span className="text-red-400">rejected</span>
                            ) : (
                              <span className="text-emerald-400">passed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {runs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No runs yet. Enter a task description above to benchmark both configurations.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function OptimizePage() {
  const abTests = useAbTests(undefined, 50)
  const policyWeights = usePolicyWeights(50)

  const [showForm, setShowForm] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    agentRole: 'architect',
    controlModel: '',
    treatmentModel: '',
    splitRatio: 50,
  })

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setShowForm(false)
        setFormData({
          name: '',
          agentRole: 'architect',
          controlModel: '',
          treatmentModel: '',
          splitRatio: 50,
        })
        window.location.reload()
      }
    } catch {
      // ignore
    }
  }

  if (selectedExperiment) {
    return (
      <section className="space-y-4" data-testid="optimize-page">
        <ExperimentResultsView
          experimentId={selectedExperiment}
          onBack={() => setSelectedExperiment(null)}
        />
      </section>
    )
  }

  return (
    <section className="space-y-4" data-testid="optimize-page">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* A/B Tests */}
        <Card className="border-border/60 bg-background/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">A/B Tests</CardTitle>
              <CardDescription>Live experiments with control vs treatment</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'New Test'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showForm && (
              <div className="space-y-3 rounded-lg border border-border/40 bg-black/20 p-4">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Claude vs GPT-4 Executor"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Control Model</Label>
                    <Input
                      value={formData.controlModel}
                      onChange={e => setFormData({ ...formData, controlModel: e.target.value })}
                      placeholder="claude-sonnet"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Treatment Model</Label>
                    <Input
                      value={formData.treatmentModel}
                      onChange={e => setFormData({ ...formData, treatmentModel: e.target.value })}
                      placeholder="gpt-4o"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Agent Role</Label>
                    <select
                      value={formData.agentRole}
                      onChange={e => setFormData({ ...formData, agentRole: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
                    >
                      <option value="architect">Architect</option>
                      <option value="executor">Executor</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="merger">Merger</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Split Ratio (% treatment)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={90}
                      value={formData.splitRatio}
                      onChange={e =>
                        setFormData({ ...formData, splitRatio: Number(e.target.value) })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleCreate} className="w-full">
                  Create Test
                </Button>
              </div>
            )}

            {abTests === undefined ? (
              <p className="text-sm text-muted-foreground">Loading A/B tests...</p>
            ) : abTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No A/B tests yet</p>
            ) : (
              <ul className="space-y-2">
                {abTests.map(test => (
                  <li
                    key={test._id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-black/20 p-3 cursor-pointer hover:border-border/50 transition-colors"
                    onClick={() => setSelectedExperiment(test._id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${statusColors[test.status] ?? 'bg-gray-400/10 text-gray-300'}`}
                        >
                          {test.status}
                        </span>
                        <span className="text-sm font-medium">{test.name}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {test.controlModel} vs {test.treatmentModel} &middot; {test.agentRole}{' '}
                        &middot; {test.splitRatio}%
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatTimestamp(test.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Policy Parameters */}
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Policy Parameters</CardTitle>
            <CardDescription>Current dispatch and scoring weights</CardDescription>
          </CardHeader>
          <CardContent>
            {policyWeights === undefined ? (
              <p className="text-sm text-muted-foreground">Loading policy weights...</p>
            ) : policyWeights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No policy weights configured</p>
            ) : (
              <ul className="space-y-2">
                {policyWeights.map(policy => (
                  <li
                    key={policy.name}
                    className="rounded-lg border border-border/30 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{policy.name}</span>
                      <span className="text-xs text-muted-foreground">v{policy.version}</span>
                    </div>
                    <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                      {policy.weightsJson}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

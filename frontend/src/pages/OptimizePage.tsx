import { useState } from 'react'
import { useAbTests, usePolicyWeights } from '@/lib/useConvexData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString()
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-400/10 text-gray-300',
  running: 'bg-emerald-400/10 text-emerald-300',
  completed: 'bg-blue-400/10 text-blue-300',
}

export function OptimizePage() {
  const abTests = useAbTests(undefined, 50)
  const policyWeights = usePolicyWeights(50)

  const [showForm, setShowForm] = useState(false)
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
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-black/20 p-3"
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
                        {test.controlModel} vs {test.treatmentModel} · {test.agentRole} ·{' '}
                        {test.splitRatio}%
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

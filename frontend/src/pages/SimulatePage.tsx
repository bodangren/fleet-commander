import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface SimulationReport {
  totalDispatches: number
  throughputDelta: number
  costDelta: number
  passRateDelta: number
  retryRateDelta: number
  coverageRegressionDelta: number
  starvationMaxAgeDelta: number
  rejectionRate: number
  misconfigurationWarning: boolean
  divergences: Array<{
    historicalChoice: string
    simulatedChoice: string | null
    matched: boolean
    deltaImpact: number
  }>
}

interface SimulatePageProps {
  onRun?: (windowDays: number, weightsJson: string) => Promise<SimulationReport>
  initialReport?: SimulationReport
  loading?: boolean
}

/**
 * Formats a number as percentage string with +/- sign prefix
 * @param value - The decimal value to format as percentage
 * @returns Formatted percentage string with sign prefix
 */
function formatDelta(value: number): string {
  const pct = (value * 100).toFixed(1)
  if (value > 0) return `+${pct}%`
  return `${pct}%`
}

/**
 * Displays a labeled delta value with positive or negative coloring
 * @param label - Label text for the delta
 * @param value - Delta value to display
 */
function DeltaBar({
  label,
  value,
  'data-testid': testId,
}: {
  label: string
  value: number
  'data-testid'?: string
}) {
  const positive = value >= 0
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-border/40 bg-black/20 p-3"
      data-testid={testId}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {formatDelta(value)}
      </span>
    </div>
  )
}

/**
 * Simulate page component for running policy simulations with weight configuration
 * @param onRun - Callback to run simulation with window days and weights JSON
 * @param initialReport - Pre-populated simulation report
 * @param loading - Loading state flag
 */
export function SimulatePage({ onRun, initialReport, loading }: SimulatePageProps) {
  const [windowDays, setWindowDays] = useState<number>(7)
  const [weightsJson, setWeightsJson] = useState<string>(
    JSON.stringify(
      {
        priorityWeight: 1,
        unblockImpact: 0.5,
        personaFitness: 1,
        harnessReliability: 1,
        expectedCost: 0.5,
        starvationBonus: 0.3,
        regressionRisk: -1,
        retryFatigue: -0.5,
        affinity: 0.5,
      },
      null,
      2,
    ),
  )
  const [report, setReport] = useState<SimulationReport | undefined>(initialReport)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    setError(null)
    if (onRun) {
      try {
        const result = await onRun(windowDays, weightsJson)
        setReport(result)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      }
    }
  }

  return (
    <div className="space-y-4" data-testid="simulate-page">
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Policy Simulation</CardTitle>
          <CardDescription>Replay historical dispatches with alternative weights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="window-days">Window (days)</Label>
              <Input
                id="window-days"
                type="number"
                min={1}
                value={windowDays}
                onChange={e => setWindowDays(Number(e.target.value))}
                data-testid="window-days-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weights-json">Candidate Weights (JSON)</Label>
              <textarea
                id="weights-json"
                className="min-h-[160px] w-full rounded-md border border-border/60 bg-black/20 px-3 py-2 text-sm font-mono text-foreground"
                value={weightsJson}
                onChange={e => setWeightsJson(e.target.value)}
                data-testid="weights-json-input"
              />
            </div>
          </div>

          {report?.misconfigurationWarning && (
            <div
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-300"
              data-testid="misconfiguration-warning"
            >
              Warning: candidate rules would have rejected {'>'}25% of historical tasks. Review your
              configuration.
            </div>
          )}

          {error && (
            <div
              className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-300"
              data-testid="simulation-error"
            >
              {error}
            </div>
          )}

          <Button onClick={handleRun} disabled={loading} data-testid="run-simulation-button">
            {loading ? 'Running...' : 'Run Simulation'}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card className="border-border/60 bg-background/60" data-testid="simulation-report">
          <CardHeader>
            <CardTitle className="text-base">Simulation Report</CardTitle>
            <CardDescription>{report.totalDispatches} dispatches analyzed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <DeltaBar
                label="Throughput"
                value={report.throughputDelta}
                data-testid="delta-throughput"
              />
              <DeltaBar label="Cost" value={report.costDelta} data-testid="delta-cost" />
              <DeltaBar
                label="Pass Rate"
                value={report.passRateDelta}
                data-testid="delta-pass-rate"
              />
              <DeltaBar
                label="Retry Rate"
                value={report.retryRateDelta}
                data-testid="delta-retry-rate"
              />
              <DeltaBar
                label="Coverage Regression"
                value={report.coverageRegressionDelta}
                data-testid="delta-coverage"
              />
              <DeltaBar
                label="Starvation Max Age"
                value={report.starvationMaxAgeDelta}
                data-testid="delta-starvation"
              />
            </div>

            <div className="rounded-lg border border-border/40 bg-black/20 p-3">
              <p className="text-sm text-muted-foreground" data-testid="divergences-count">
                Divergences:{' '}
                <span className="font-medium text-foreground">{report.divergences.length}</span>
              </p>
              <p className="text-sm text-muted-foreground" data-testid="rejection-rate">
                Rejection Rate:{' '}
                <span className="font-medium text-foreground">
                  {(report.rejectionRate * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Wrapper component that handles API calls for policy simulation
 */
export default function SimulatePageWrapper() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<SimulationReport | undefined>(undefined)

  const handleRun = async (windowDays: number, weightsJson: string): Promise<SimulationReport> => {
    setLoading(true)
    try {
      const response = await fetch('/api/policy/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          windowDays,
          candidateWeights: JSON.parse(weightsJson),
          candidateRules: {},
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Simulation failed')
      }
      setReport(data)
      return data
    } finally {
      setLoading(false)
    }
  }

  return <SimulatePage onRun={handleRun} initialReport={report} loading={loading} />
}

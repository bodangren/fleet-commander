import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface DispatchStatEntry {
  persona: string
  taskKind: string
  repoType: string
  meanDurationMs: number
  p50Cost: number
  p90Cost: number
  reviewFailRate: number
  retryRate: number
  blockerCreationRate: number
  coverageRegressionRate: number
  sampleCount: number
  windowDays: number
  insufficientData: boolean
  lastUpdatedAt: number
}

export interface HarnessStatEntry {
  harnessName: string
  successRate7d: number
  medianLatencyMs: number
  averageTokens: number
  reviewPassRateByTaskClassJson: string
  topFailureModesJson: string
  lastUpdatedAt: number
}

export interface FleetHealthData {
  dispatchStats: DispatchStatEntry[]
  harnessStats: HarnessStatEntry[]
}

interface FleetHealthProps {
  data?: FleetHealthData
  loading?: boolean
}

type SortKey = 'persona' | 'taskKind' | 'sampleCount' | 'meanDurationMs' | 'retryRate'
type SortDir = 'asc' | 'desc'

function formatDuration(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

function formatPercent(rate: number): string {
  if (rate === 0) return '—'
  return `${Math.round(rate * 100)}%`
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentSort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
}) {
  const isActive = currentSort.key === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide ${
        isActive ? 'text-cyan-400' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      {isActive && (currentSort.dir === 'asc' ? ' ↑' : ' ↓')}
    </button>
  )
}

function DispatchTable({
  stats,
  sort,
  onSort,
}: {
  stats: DispatchStatEntry[]
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
}) {
  const sorted = [...stats].sort((a, b) => {
    const aVal = a[sort.key] ?? ''
    const bVal = b[sort.key] ?? ''
    let cmp: number
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal
    } else {
      cmp = String(aVal).localeCompare(String(bVal))
    }
    return sort.dir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left">
            <th className="pb-2 pr-4">
              <SortableHeader
                label="Persona"
                sortKey="persona"
                currentSort={sort}
                onSort={onSort}
              />
            </th>
            <th className="pb-2 pr-4">
              <SortableHeader label="Kind" sortKey="taskKind" currentSort={sort} onSort={onSort} />
            </th>
            <th className="pb-2 pr-4">Repo</th>
            <th className="pb-2 pr-4">
              <SortableHeader
                label="Samples"
                sortKey="sampleCount"
                currentSort={sort}
                onSort={onSort}
              />
            </th>
            <th className="pb-2 pr-4">
              <SortableHeader
                label="Duration"
                sortKey="meanDurationMs"
                currentSort={sort}
                onSort={onSort}
              />
            </th>
            <th className="pb-2 pr-4">p50 Cost</th>
            <th className="pb-2 pr-4">p90 Cost</th>
            <th className="pb-2 pr-4">Review Fail</th>
            <th className="pb-2">
              <SortableHeader
                label="Retry"
                sortKey="retryRate"
                currentSort={sort}
                onSort={onSort}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={`${row.persona}-${row.taskKind}-${row.repoType}`}
              data-testid={`dispatch-row-${i}`}
              className={`border-b border-border/20 ${row.insufficientData ? 'opacity-60' : ''}`}
            >
              <td className="py-2 pr-4">
                <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-xs text-cyan-300">
                  {row.persona}
                </span>
              </td>
              <td className="py-2 pr-4">{row.taskKind}</td>
              <td className="py-2 pr-4 text-muted-foreground">{row.repoType}</td>
              <td className="py-2 pr-4">
                {row.sampleCount}
                {row.insufficientData && (
                  <span className="ml-2 text-xs text-amber-400">(insufficient data)</span>
                )}
              </td>
              <td className="py-2 pr-4">{formatDuration(row.meanDurationMs)}</td>
              <td className="py-2 pr-4">{row.p50Cost.toFixed(2)}</td>
              <td className="py-2 pr-4">{row.p90Cost.toFixed(2)}</td>
              <td className="py-2 pr-4">{formatPercent(row.reviewFailRate)}</td>
              <td className="py-2">{formatPercent(row.retryRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HarnessTable({ stats }: { stats: HarnessStatEntry[] }) {
  if (stats.length === 0) {
    return <p className="text-sm text-muted-foreground">No harness data</p>
  }

  return (
    <div className="space-y-3">
      {stats.map(harness => {
        let reviewPassRates: Record<string, number> = {}
        try {
          reviewPassRates = JSON.parse(harness.reviewPassRateByTaskClassJson)
        } catch {
          // ignore parse errors
        }

        let failureModes: string[] = []
        try {
          failureModes = JSON.parse(harness.topFailureModesJson)
        } catch {
          // ignore parse errors
        }

        return (
          <div
            key={harness.harnessName}
            className="rounded-lg border border-border/40 bg-black/20 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium">{harness.harnessName}</h4>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Success Rate: </span>
                  <span
                    className={harness.successRate7d >= 0.9 ? 'text-green-400' : 'text-amber-400'}
                  >
                    {Math.round(harness.successRate7d * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Median Latency: </span>
                  <span>{formatDuration(harness.medianLatencyMs)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Tokens: </span>
                  <span>{Math.round(harness.averageTokens).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Review Pass Rate by Task Class</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(reviewPassRates).map(([taskClass, rate]) => (
                    <span key={taskClass} className="rounded bg-black/30 px-2 py-0.5 text-xs">
                      {taskClass}: {formatPercent(rate as number)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Top Failure Modes</p>
                <div className="flex flex-wrap gap-2">
                  {failureModes.length > 0 ? (
                    failureModes.map(mode => (
                      <span
                        key={mode}
                        className="rounded bg-rose-400/10 px-2 py-0.5 text-xs text-rose-300"
                      >
                        {mode}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FleetHealth({ data, loading }: FleetHealthProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'sampleCount',
    dir: 'desc',
  })

  const handleSort = (key: SortKey) => {
    if (sort.key === key) {
      setSort({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
    } else {
      setSort({ key, dir: 'desc' })
    }
  }

  if (loading || data === undefined) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">Loading fleet health...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" data-testid="fleet-health">
      <h2 className="text-lg font-semibold">Fleet Health</h2>

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Dispatch Policy Stats</CardTitle>
          <CardDescription>Persona × task kind × repo rollups over 7-day window</CardDescription>
        </CardHeader>
        <CardContent>
          {data.dispatchStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dispatch policy data</p>
          ) : (
            <DispatchTable stats={data.dispatchStats} sort={sort} onSort={handleSort} />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Harness Reliability</CardTitle>
          <CardDescription>Success rate, latency, and failure modes by harness</CardDescription>
        </CardHeader>
        <CardContent>
          <HarnessTable stats={data.harnessStats} />
        </CardContent>
      </Card>
    </div>
  )
}

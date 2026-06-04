import { useQueueHealth, useFleetHealth } from '@/lib/useConvexData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

/**
 * Displays real-time queue health and fleet status metrics.
 */
export function MonitorPage() {
  const queueHealth = useQueueHealth()
  const fleetHealth = useFleetHealth()

  const queueLoading = queueHealth === undefined
  const fleetLoading = fleetHealth === undefined

  const readyCount = queueHealth?.readyCount ?? 0
  const inProgressCount = queueHealth?.inProgressCount ?? 0
  const blockedCount = queueHealth?.blockedCount ?? 0
  const doneCount = queueHealth?.doneCount ?? 0

  return (
    <section className="space-y-4" data-testid="monitor-page">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-background/60">
          <CardHeader className="pb-2">
            <CardDescription>Ready</CardDescription>
            <CardTitle className="text-2xl">{queueLoading ? '—' : readyCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Tasks waiting</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60">
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl">{queueLoading ? '—' : inProgressCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span>Active tasks</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60">
          <CardHeader className="pb-2">
            <CardDescription>Blocked</CardDescription>
            <CardTitle className="text-2xl">{queueLoading ? '—' : blockedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Need attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60">
          <CardHeader className="pb-2">
            <CardDescription>Done</CardDescription>
            <CardTitle className="text-2xl">{queueLoading ? '—' : doneCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Completed today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Dispatch Stats</CardTitle>
            <CardDescription>Policy performance by persona and task kind</CardDescription>
          </CardHeader>
          <CardContent>
            {fleetLoading ? (
              <p className="text-sm text-muted-foreground">Loading dispatch stats...</p>
            ) : fleetHealth?.dispatchStats?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dispatch stats available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Persona</th>
                      <th className="pb-2 pr-4 font-medium">Task Kind</th>
                      <th className="pb-2 pr-4 font-medium">Samples</th>
                      <th className="pb-2 pr-4 font-medium">Retry Rate</th>
                      <th className="pb-2 font-medium">Blocker Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {fleetHealth?.dispatchStats?.map(stat => (
                      <tr key={`${stat.persona}-${stat.taskKind}`}>
                        <td className="py-2 pr-4 font-medium">{stat.persona}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{stat.taskKind}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{stat.sampleCount}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {(stat.retryRate * 100).toFixed(0)}%
                        </td>
                        <td className="py-2">{(stat.blockerCreationRate * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Harness Reliability</CardTitle>
            <CardDescription>7-day success rate and latency</CardDescription>
          </CardHeader>
          <CardContent>
            {fleetLoading ? (
              <p className="text-sm text-muted-foreground">Loading harness stats...</p>
            ) : fleetHealth?.harnessStats?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No harness stats available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Harness</th>
                      <th className="pb-2 pr-4 font-medium">Success Rate</th>
                      <th className="pb-2 pr-4 font-medium">Median Latency</th>
                      <th className="pb-2 font-medium">Avg Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {fleetHealth?.harnessStats?.map(stat => (
                      <tr key={stat.harnessName}>
                        <td className="py-2 pr-4 font-medium">{stat.harnessName}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {(stat.successRate7d * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {stat.medianLatencyMs}ms
                        </td>
                        <td className="py-2">{stat.averageTokens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Starvation Tasks</CardTitle>
            <CardDescription>Tasks idle for multiple days</CardDescription>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : queueHealth?.starvationTasks?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No starving tasks</p>
            ) : (
              <ul className="space-y-2">
                {queueHealth?.starvationTasks?.map(task => (
                  <li
                    key={task.taskKey}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-black/20 p-2"
                  >
                    <span className="text-sm">{task.title}</span>
                    <span className="text-xs text-amber-300">{task.daysIdle}d idle</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Retry Hotspots</CardTitle>
            <CardDescription>Tasks with high retry counts</CardDescription>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : queueHealth?.retryHotspots?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No retry hotspots</p>
            ) : (
              <ul className="space-y-2">
                {queueHealth?.retryHotspots?.map(task => (
                  <li
                    key={task.taskKey}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-black/20 p-2"
                  >
                    <span className="text-sm">{task.title}</span>
                    <span className="text-xs text-red-300">{task.retryCount} retries</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Open Blockers</CardTitle>
            <CardDescription>Issues blocking task progress</CardDescription>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : queueHealth?.openBlockers?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open blockers</p>
            ) : (
              <ul className="space-y-2">
                {queueHealth?.openBlockers?.map(blocker => (
                  <li
                    key={blocker.issueId}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-black/20 p-2"
                  >
                    <span className="text-sm">{blocker.title}</span>
                    <span className="text-xs text-red-300">{blocker.daysOpen}d open</span>
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

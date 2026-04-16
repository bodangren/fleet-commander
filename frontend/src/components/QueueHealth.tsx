import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface QueueHealthData {
  readyCount: number
  inProgressCount: number
  blockedCount: number
  doneCount: number
  starvationTasks: Array<{
    taskKey: string
    title: string
    status: string
    daysIdle: number
  }>
  retryHotspots: Array<{
    taskKey: string
    title: string
    retryCount: number
  }>
  openBlockers: Array<{
    issueId: string
    title: string
    daysOpen: number
  }>
}

interface QueueHealthProps {
  data?: QueueHealthData
  loading?: boolean
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader className="space-y-1 p-4">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function ListCard({
  title,
  description,
  emptyText,
  children,
}: {
  title: string
  description: string
  emptyText: string
  children: React.ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasChildren ? (
          <ul className="space-y-2">{children}</ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function QueueHealth({ data, loading }: QueueHealthProps) {
  if (loading || data === undefined) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">Loading queue health...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" data-testid="queue-health">
      <h2 className="text-lg font-semibold">Queue Health</h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <SummaryCard label="Ready" value={data.readyCount} />
        <SummaryCard label="In Progress" value={data.inProgressCount} />
        <SummaryCard label="Blocked" value={data.blockedCount} />
        <SummaryCard label="Done" value={data.doneCount} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ListCard
          title="Starvation"
          description="Tasks idle for more than 7 days"
          emptyText="No starving tasks"
        >
          {data.starvationTasks.map(task => (
            <li
              key={task.taskKey}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.taskKey} · {task.status}
                </p>
              </div>
              <span className="shrink-0 text-xs text-amber-400">{task.daysIdle} days idle</span>
            </li>
          ))}
        </ListCard>

        <ListCard
          title="Retry Hotspots"
          description="Tasks with the most retries"
          emptyText="No retry hotspots"
        >
          {data.retryHotspots.map(task => (
            <li
              key={task.taskKey}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.taskKey}</p>
              </div>
              <span className="shrink-0 text-xs text-rose-400">{task.retryCount} retries</span>
            </li>
          ))}
        </ListCard>

        <ListCard
          title="Blocker Ages"
          description="Open issues by age"
          emptyText="No open blockers"
        >
          {data.openBlockers.map(issue => (
            <li
              key={issue.issueId}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{issue.title}</p>
                <p className="text-xs text-muted-foreground">{issue.issueId}</p>
              </div>
              <span className="shrink-0 text-xs text-cyan-400">{issue.daysOpen} days open</span>
            </li>
          ))}
        </ListCard>
      </div>
    </div>
  )
}

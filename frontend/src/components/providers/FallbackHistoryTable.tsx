import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface FallbackEvent {
  _id: string
  taskKey: string
  fallbackFrom: string
  fallbackTo: string
  fallbackReason: string
  attemptNumber: number
  createdAt: number
}

interface FallbackHistoryTableProps {
  events: FallbackEvent[]
  loading?: boolean
}

/**
 * Format timestamp as short datetime
 * @param ms - Unix timestamp in ms
 * @returns Formatted datetime string
 */
function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Renders a table of recent fallback events showing provider failures and retries.
 */
export function FallbackHistoryTable({ events, loading }: FallbackHistoryTableProps) {
  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Fallback History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Fallback History</CardTitle>
          <CardDescription>No fallback events recorded yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <CardTitle className="text-base">Fallback History</CardTitle>
        <CardDescription>Recent provider failures and model fallbacks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-2 text-left font-medium text-muted-foreground">When</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Task</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">From</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">To</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Reason</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event._id} className="border-b border-border/20">
                  <td className="py-2 font-mono text-xs">{formatTimestamp(event.createdAt)}</td>
                  <td className="py-2 font-mono text-xs">{event.taskKey}</td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span className="font-mono text-xs">{event.fallbackFrom}</span>
                    </span>
                  </td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="font-mono text-xs">{event.fallbackTo}</span>
                    </span>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                    {event.fallbackReason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

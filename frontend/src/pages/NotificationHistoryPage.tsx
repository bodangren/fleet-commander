import { useState, useCallback } from 'react'
import { Check, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotifications, useUnreadCount } from '@/lib/useConvexData'

const NOTIFICATION_TYPES = [
  'task_completed',
  'task_failed',
  'budget_alert',
  'circuit_breaker_open',
  'sprint_completed',
  'retrospective_ready',
  'hook_failure',
  'session_resumed',
  'backoff_exhausted',
  'retry_cap_reached',
]

/**
 * Renders a page component
 */
export function NotificationHistoryPage() {
  const userId = 'admin:system'
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [readFilter, setReadFilter] = useState<string>('all')
  const notifications = useNotifications(userId, 200)
  const unreadCount = useUnreadCount(userId)

  const filtered = (notifications ?? []).filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (readFilter === 'read' && !n.read) return false
    if (readFilter === 'unread' && n.read) return false
    return true
  })

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      // ignore
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
    } catch {
      // ignore
    }
  }, [userId])

  const handleDeleteOld = useCallback(async () => {
    try {
      await fetch('/api/notifications/delete-old', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notification History</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {unreadCount ?? 0} unread
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {NOTIFICATION_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                value={readFilter}
                onChange={e => setReadFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="read">Read</option>
                <option value="unread">Unread</option>
              </select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleMarkAllRead()}>
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleDeleteOld()}>
                <Trash2 className="mr-1 h-3 w-3" />
                Delete old
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications match your filters.
              </p>
            ) : (
              filtered.map(n => (
                <div
                  key={n._id}
                  className={`flex items-start gap-3 rounded-lg border-2 border-border p-4 ${
                    n.read ? 'bg-background' : 'bg-primary/5'
                  }`}
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider">
                        {n.type.replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{n.channel}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground/60">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && (
                    <Button variant="ghost" size="sm" onClick={() => void handleMarkRead(n._id)}>
                      <Check className="mr-1 h-3 w-3" />
                      Mark read
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

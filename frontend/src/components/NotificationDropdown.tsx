import { useNavigate } from 'react-router-dom'
import { Check, MailOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NotificationEntry } from '@/lib/useConvexData'

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: {
  notifications: NotificationEntry[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-96 border-4 border-border bg-card shadow-[8px_8px_0px_0px_hsl(var(--primary))]">
      <div className="flex items-center justify-between border-b-2 border-border bg-muted/50 px-4 py-3">
        <span className="text-xs font-black uppercase tracking-widest">Notifications</span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              className="h-7 text-[10px] font-bold uppercase tracking-wider"
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 text-[10px] font-bold uppercase tracking-wider"
          >
            Close
          </Button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-muted-foreground">
            <MailOpen className="h-8 w-8 opacity-50" />
            <p className="text-xs font-bold uppercase tracking-wider">No notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n._id}
              className={`flex items-start gap-3 border-b border-border px-4 py-3 transition-colors ${
                n.read ? 'opacity-60' : 'bg-primary/5'
              }`}
            >
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => onMarkRead(n._id)}
                  aria-label="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t-2 border-border bg-muted/50 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-[10px] font-bold uppercase tracking-wider"
          onClick={() => {
            onClose()
            navigate('/notifications')
          }}
        >
          View all history
        </Button>
      </div>
    </div>
  )
}

import { Bell } from 'lucide-react'

export function NotificationBadge({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background text-foreground shadow-[2px_2px_0px_0px_hsl(var(--secondary))] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
      aria-label={`${count} unread notifications`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

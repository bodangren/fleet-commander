import { type ReactNode, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Boxes,
  DollarSign,
  FileText,
  LayoutDashboard,
  RefreshCcw,
  Settings,
  Users,
  GitBranch,
  Terminal,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationBadge } from '@/components/NotificationBadge'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { useNotifications, useUnreadCount } from '@/lib/useConvexData'

function SidebarLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          buttonVariants({ variant: isActive ? 'default' : 'ghost' }),
          'w-full justify-start gap-4 px-6 py-8 text-xs font-black tracking-[0.2em] italic transition-all',
          isActive &&
            'shadow-[6px_6px_0px_0px_theme(colors.secondary.DEFAULT)] -translate-x-1 -translate-y-1',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function viewTitle(pathname: string) {
  if (pathname.startsWith('/agents/') && pathname.endsWith('/edit')) return 'Agent Editor'
  if (pathname === '/harnesses/new') return 'Harness Editor'
  if (pathname.startsWith('/harnesses/') && pathname.endsWith('/edit')) return 'Harness Editor'
  if (pathname.startsWith('/project/')) return 'Project Board'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/pipelines')) return 'Pipelines'
  if (pathname.startsWith('/analytics')) return 'Analytics'
  if (pathname.startsWith('/performance')) return 'Performance'
  if (pathname.startsWith('/ops')) return 'Ops Console'
  if (pathname.startsWith('/agents')) return 'Agents'
  if (pathname.startsWith('/harnesses')) return 'Harnesses'
  if (pathname.startsWith('/retrospectives')) return 'Retrospectives'
  if (pathname.startsWith('/notifications')) return 'Notifications'
  return 'Dashboard'
}

export function AppLayout({
  healthStatus,
  loading,
  onRefresh,
}: {
  healthStatus: string
  loading: boolean
  onRefresh: () => void
}) {
  const location = useLocation()
  const title = viewTitle(location.pathname)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const userId = 'admin:system'
  const notifications = useNotifications(userId, 20)
  const unreadCount = useUnreadCount(userId)

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <div className="grid min-h-screen lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-r-4 border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
          <div className="border-b-4 border-border p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center border-4 border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_theme(colors.secondary.DEFAULT)] italic">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-[0.4em] text-primary">
                  CONDUCTOR
                </p>
                <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                  Fleet Commander
                </h1>
              </div>
            </div>
          </div>

          <nav className="space-y-4 p-6">
            <SidebarLink to="/" icon={<LayoutDashboard className="h-5 w-5" />} label="DASHBOARD" />
            <SidebarLink to="/agents" icon={<Users className="h-5 w-5" />} label="AGENTS" />
            <SidebarLink to="/harnesses" icon={<Boxes className="h-5 w-5" />} label="HARNESSES" />
            <SidebarLink to="/settings" icon={<Settings className="h-5 w-5" />} label="SETTINGS" />
            <SidebarLink
              to="/pipelines"
              icon={<GitBranch className="h-5 w-5" />}
              label="PIPELINES"
            />
            <SidebarLink
              to="/analytics"
              icon={<BarChart3 className="h-5 w-5" />}
              label="ANALYTICS"
            />
            <SidebarLink
              to="/performance"
              icon={<Activity className="h-5 w-5" />}
              label="PERFORMANCE"
            />
            <SidebarLink to="/costs" icon={<DollarSign className="h-5 w-5" />} label="COSTS" />
            <SidebarLink to="/ops" icon={<Terminal className="h-5 w-5" />} label="OPS_CONSOLE" />
            <SidebarLink
              to="/retrospectives"
              icon={<FileText className="h-5 w-5" />}
              label="RETROSPECTIVES"
            />
          </nav>

          <div className="absolute bottom-0 w-full border-t-4 border-border p-6 bg-muted/50">
            <div className="flex items-center justify-between gap-4 border-2 border-border p-4 bg-background shadow-[4px_4px_0px_0px_hsl(var(--secondary))]">
              <span className="text-[10px] font-black uppercase tracking-widest">
                {loading ? 'SCANNING...' : 'SYSTEM_READY'}
              </span>
              <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="space-y-8 p-8 lg:p-12 overflow-y-auto">
          <header className="flex flex-col gap-8 border-4 border-border bg-card p-10 shadow-[8px_8px_0px_0px_hsl(var(--primary))] relative lg:flex-row lg:items-center lg:justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.5em] text-secondary">
                OPERATIONAL_LAYER_v1
              </p>
              <h2 className="mt-2 text-6xl font-black tracking-tighter italic uppercase leading-none">
                {title}
              </h2>
              <p className="mt-4 max-w-2xl text-base font-bold text-muted-foreground uppercase tracking-tight">
                // Manage projects, agent personas, and harness definitions from one local control
                surface.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative">
                <NotificationBadge
                  count={unreadCount ?? 0}
                  onClick={() => setDropdownOpen(v => !v)}
                />
                {dropdownOpen && notifications && (
                  <NotificationDropdown
                    notifications={notifications}
                    onMarkRead={id => {
                      void fetch('/api/notifications/mark-read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id }),
                      })
                    }}
                    onMarkAllRead={() => {
                      void fetch('/api/notifications/mark-all-read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId }),
                      })
                    }}
                    onClose={() => setDropdownOpen(false)}
                  />
                )}
              </div>
              <div className="border-4 border-border bg-background px-6 py-3 text-sm font-black italic uppercase tracking-widest text-primary">
                {healthStatus}
              </div>
              <Button variant="secondary" size="lg" onClick={onRefresh} className="italic">
                SYNC_STATE
              </Button>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  )
}

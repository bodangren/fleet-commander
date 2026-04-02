import { type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Boxes, LayoutDashboard, RefreshCcw, Settings, Users, GitBranch } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function SidebarLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          buttonVariants({ variant: isActive ? 'secondary' : 'ghost' }),
          'w-full justify-start gap-3 rounded-2xl px-4 py-6 text-sm',
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
  if (pathname.startsWith('/pipelines')) return 'Pipelines'
  if (pathname.startsWith('/agents')) return 'Agents'
  if (pathname.startsWith('/harnesses')) return 'Harnesses'
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_28%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background))_45%,_hsl(222_47%_7%))] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r border-border/60 bg-black/20 backdrop-blur-xl">
          <div className="border-b border-border/60 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 shadow-lg shadow-cyan-500/10">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Conductor
                </p>
                <h1 className="text-lg font-semibold">Fleet Commander</h1>
              </div>
            </div>
          </div>

          <nav className="space-y-2 p-4">
            <SidebarLink to="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
            <SidebarLink to="/agents" icon={<Users className="h-4 w-4" />} label="Agents" />
            <SidebarLink to="/harnesses" icon={<Boxes className="h-4 w-4" />} label="Harnesses" />
            <SidebarLink to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
            <SidebarLink to="/pipelines" icon={<GitBranch className="h-4 w-4" />} label="Pipelines" />
          </nav>

          <div className="border-t border-border/60 p-4 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 p-3">
              <span>{loading ? 'Loading workspace data...' : 'Workspace ready'}</span>
              <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="space-y-6 p-6 lg:p-8">
          <header className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-black/20 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">
                Operational Console
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Manage projects, agent personas, and harness definitions from one local control
                surface.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-2 text-sm text-muted-foreground">
                {healthStatus}
              </div>
              <Button variant="outline" onClick={onRefresh}>
                Refresh
              </Button>
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Cpu,
  DollarSign,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  Monitor,
  MessageSquare,
  RefreshCcw,
  Settings,
  Stethoscope,
  Terminal,
  TrendingUp,
  Users,
  UserCog,
  Workflow,
  LayoutGrid,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarSection {
  label: string
  items: { to: string; icon: ReactNode; label: string }[]
}

const sidebarSections: SidebarSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard' },
      { to: '/portfolio', icon: <Briefcase className="h-4 w-4" />, label: 'Portfolio' },
      { to: '/blockers', icon: <AlertTriangle className="h-4 w-4" />, label: 'Blockers' },
      { to: '/alerts', icon: <Bell className="h-4 w-4" />, label: 'Alerts' },
      { to: '/notifications', icon: <MessageSquare className="h-4 w-4" />, label: 'Notifications' },
    ],
  },
  {
    label: 'Team',
    items: [
      { to: '/agents', icon: <Users className="h-4 w-4" />, label: 'Agents' },
      { to: '/agents/leaderboard', icon: <Award className="h-4 w-4" />, label: 'Leaderboard' },
      { to: '/agent-templates', icon: <UserCog className="h-4 w-4" />, label: 'Templates' },
      { to: '/providers', icon: <Cpu className="h-4 w-4" />, label: 'Providers' },
    ],
  },
  {
    label: 'Work',
    items: [
      {
        to: '/board',
        icon: <GitBranch className="h-4 w-4" />,
        label: 'Project Board',
      },
      { to: '/sprint-planning', icon: <Activity className="h-4 w-4" />, label: 'Sprint Planning' },
      { to: '/pipelines', icon: <Terminal className="h-4 w-4" />, label: 'Pipelines' },
      { to: '/templates', icon: <LayoutGrid className="h-4 w-4" />, label: 'Templates' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
      { to: '/performance', icon: <Activity className="h-4 w-4" />, label: 'Performance' },
      { to: '/costs', icon: <DollarSign className="h-4 w-4" />, label: 'Costs' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/ops/monitor', icon: <Monitor className="h-4 w-4" />, label: 'Monitor' },
      { to: '/ops/diagnose', icon: <Stethoscope className="h-4 w-4" />, label: 'Diagnose' },
      { to: '/ops/optimize', icon: <TrendingUp className="h-4 w-4" />, label: 'Optimize' },
      { to: '/ops/reconcile', icon: <Workflow className="h-4 w-4" />, label: 'Reconcile' },
      { to: '/ops/simulate', icon: <Activity className="h-4 w-4" />, label: 'Simulate' },
      { to: '/ops', icon: <Terminal className="h-4 w-4" />, label: 'Ops Console' },
    ],
  },
  {
    label: 'History',
    items: [
      { to: '/history/sprints', icon: <History className="h-4 w-4" />, label: 'Sprints' },
      { to: '/history/agents', icon: <Users className="h-4 w-4" />, label: 'Agents' },
      { to: '/history/tasks', icon: <FileText className="h-4 w-4" />, label: 'Tasks' },
      {
        to: '/retrospectives',
        icon: <MessageSquare className="h-4 w-4" />,
        label: 'Retrospectives',
      },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/settings', icon: <Settings className="h-4 w-4" />, label: 'Settings' }],
  },
]

/**
 * NavLink wrapper component rendering styled sidebar navigation item
 */
function SidebarLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          'flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md transition-colors',
          isActive
            ? 'bg-[#0f1011] text-[#f7f8f8]'
            : 'text-[#d0d6e0] hover:bg-[#0f1011] hover:text-[#f7f8f8]',
        )
      }
    >
      <span className={cn('opacity-60', 'text-[#5e6ad2]')}>{icon}</span>
      {label}
    </NavLink>
  )
}

/**
 * Pure function computing page title string from pathname route
 */
function viewTitle(pathname: string) {
  if (pathname.startsWith('/agents/') && pathname.endsWith('/edit')) return 'Agent Editor'
  if (pathname.startsWith('/agents/leaderboard')) return 'Leaderboard'
  if (pathname.startsWith('/agent-templates/') && pathname.endsWith('/edit'))
    return 'Template Editor'
  if (pathname.startsWith('/agent-templates')) return 'Agent Templates'
  if (pathname.startsWith('/portfolio')) return 'Portfolio'
  if (pathname.startsWith('/board')) return 'Project Board'
  if (pathname.startsWith('/project/')) return 'Project Board'
  if (pathname.startsWith('/sprint-planning')) return 'Sprint Planning'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/templates')) return 'Project Templates'
  if (pathname.startsWith('/pipelines')) return 'Pipelines'
  if (pathname.startsWith('/analytics')) return 'Analytics'
  if (pathname.startsWith('/performance')) return 'Performance'
  if (pathname.startsWith('/costs')) return 'Costs'
  if (pathname.startsWith('/ops/monitor')) return 'Monitor'
  if (pathname.startsWith('/ops/diagnose')) return 'Diagnose'
  if (pathname.startsWith('/ops/optimize')) return 'Optimize'
  if (pathname.startsWith('/ops/reconcile')) return 'Reconcile'
  if (pathname.startsWith('/ops/simulate')) return 'Simulate'
  if (pathname.startsWith('/ops')) return 'Ops Console'
  if (pathname.startsWith('/agents')) return 'Agents'
  if (pathname.startsWith('/providers')) return 'Providers'
  if (pathname.startsWith('/retrospectives')) return 'Retrospectives'
  if (pathname.startsWith('/notifications')) return 'Notifications'
  if (pathname.startsWith('/blockers')) return 'Blockers'
  if (pathname.startsWith('/alerts')) return 'Alerts'
  if (pathname.startsWith('/history/sprints')) return 'Sprint History'
  if (pathname.startsWith('/history/agents')) return 'Agent History'
  if (pathname.startsWith('/history/tasks')) return 'Task History'
  if (pathname.startsWith('/tasks/')) return 'Task Timeline'
  return 'Dashboard'
}

/**
 * Main layout component with sidebar navigation and content outlet rendering
 */
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
  const navigate = useNavigate()
  const title = viewTitle(location.pathname)

  return (
    <div className="flex h-screen bg-[#010102] text-[#f7f8f8] font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-[240px] min-w-[240px] bg-[#010102] border-r border-[#23252a] flex flex-col overflow-y-auto">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-[#23252a] flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#5e6ad2]" />
          <span className="text-[15px] font-semibold tracking-[-0.3px]">Fleet Commander</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3">
          {sidebarSections.map((section, idx) => (
            <div key={section.label} className={cn(idx > 0 && 'mt-2')}>
              <div className="px-5 py-2">
                <span className="text-[11px] font-medium text-[#62666d] uppercase tracking-[0.5px]">
                  {section.label}
                </span>
              </div>
              <div className="px-3 space-y-0.5">
                {section.items.map(item => (
                  <SidebarLink key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Status */}
        <div className="border-t border-[#23252a] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#62666d] uppercase tracking-wider">
              {loading ? 'Syncing...' : healthStatus}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              aria-label="Refresh"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 min-h-14 bg-[#010102] border-b border-[#23252a] flex items-center justify-between px-6">
          <span className="text-sm font-medium">{title}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#27a644]" />
              <span className="text-xs text-[#8a8f98]">{healthStatus}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Sync
            </Button>
            <Button size="sm" onClick={() => navigate('/settings')}>
              New Project
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

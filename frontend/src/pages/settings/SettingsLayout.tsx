import { NavLink, Outlet } from 'react-router-dom'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-400/30'
      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
  }`

/**
 * Sidebar-based layout for the Settings area. Hosts an Outlet for sub-pages
 * (`/settings/app`, `/settings/notifications`).
 */
export function SettingsLayout() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav
        aria-label="Settings sections"
        className="md:w-56 md:shrink-0 space-y-1 rounded-xl border border-border/60 bg-background/40 p-3"
      >
        <NavLink to="/settings/app" className={navLinkClass}>
          Application
        </NavLink>
        <NavLink to="/settings/notifications" className={navLinkClass}>
          Notifications
        </NavLink>
      </nav>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

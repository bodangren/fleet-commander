import {
  Navigate,
  createBrowserRouter,
  useNavigate,
  useOutletContext,
  useRouteError,
} from 'react-router-dom'

import { AppLayout } from './layout/AppLayout'
import { PortfolioRedirect } from './components/PortfolioRedirect'
import { PortfolioPage } from './pages/PortfolioPage'
import { useFleetData } from './lib/useFleetData'
import type { RouteObject } from 'react-router-dom'

/**
 * Layout route that fetches fleet data and provides it to AppLayout and
 * child routes via outlet context.
 */
function FleetLayout() {
  const fleet = useFleetData()
  const navigate = useNavigate()
  return (
    <AppLayout
      healthStatus={fleet.healthStatus}
      healthLoading={fleet.healthLoading}
      healthError={fleet.healthError}
      loading={fleet.loading}
      onRefresh={fleet.refresh}
      onRefreshHealth={fleet.refreshHealth}
      onNewProject={() => navigate('/portfolio?new=true')}
      context={fleet}
    />
  )
}

/**
 * Renders the finite initial state while a matched lazy route module loads.
 */
function RouteLoadFallback() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6" role="status">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Loading page...
      </p>
    </main>
  )
}

/**
 * Renders a finite, accessible state when a route module cannot be loaded.
 *
 * React Router renders this boundary for a rejected route-level lazy import,
 * so an unavailable optional chunk cannot leave the application in a pending
 * state without feedback.
 */
function RouteLoadError() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : 'The page module could not be loaded.'

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
      <div className="max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Unable to load this page</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </main>
  )
}

/**
 * Data-router route tree for React Router 7.
 *
 * Replaces the v6 React Router component-based API with a
 * `createBrowserRouter` configuration. FleetLayout is the layout
 * route; all application pages are children.
 */
export const routes: RouteObject[] = [
  {
    element: <FleetLayout />,
    hydrateFallbackElement: <RouteLoadFallback />,
    errorElement: <RouteLoadError />,
    children: [
      { index: true, element: <PortfolioRedirect /> },
      {
        path: 'dashboard',
        lazy: async () => {
          const { DashboardPage } = await import('./pages/DashboardPage')
          return { Component: DashboardPage }
        },
      },
      { path: 'portfolio', element: <PortfolioPage /> },
      {
        path: 'project/:id',
        lazy: async () => {
          const { ProjectViewPage } = await import('./pages/ProjectViewPage')
          return { Component: ProjectViewPage }
        },
      },
      {
        path: 'agents',
        lazy: async () => {
          const { AgentsPage } = await import('./pages/AgentsPage')
          return {
            Component: function AgentsRoute() {
              const fleet = useOutletContext<Parameters<typeof AgentsPage>[0]['fleet']>()
              return <AgentsPage fleet={fleet} />
            },
          }
        },
      },
      {
        path: 'agents/:name/edit',
        lazy: async () => {
          const { AgentEditorPage } = await import('./pages/AgentEditorPage')
          return { Component: AgentEditorPage }
        },
      },
      {
        path: 'agents/leaderboard',
        lazy: async () => {
          const { LeaderboardPage } = await import('./pages/LeaderboardPage')
          return { Component: LeaderboardPage }
        },
      },
      {
        path: 'agent-templates',
        lazy: async () => {
          const { AgentTemplatesPage } = await import('./pages/AgentTemplatesPage')
          return { Component: AgentTemplatesPage }
        },
      },
      {
        path: 'agent-templates/:id/edit',
        lazy: async () => {
          const { AgentTemplateEditorPage } = await import('./pages/AgentTemplateEditorPage')
          return { Component: AgentTemplateEditorPage }
        },
      },
      {
        path: 'templates',
        lazy: async () => {
          const { ProjectTemplatesPage } = await import('./pages/ProjectTemplatesPage')
          return { Component: ProjectTemplatesPage }
        },
      },
      {
        path: 'providers',
        lazy: async () => {
          const { ProvidersPage } = await import('./pages/ProvidersPage')
          return {
            Component: function ProvidersRoute() {
              const fleet = useOutletContext<Parameters<typeof ProvidersPage>[0]['fleet']>()
              return <ProvidersPage fleet={fleet} />
            },
          }
        },
      },
      {
        path: 'tasks/:taskId/timeline',
        lazy: async () => {
          const { TaskTimelinePage } = await import('./pages/TaskTimelinePage')
          return { Component: TaskTimelinePage }
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { SettingsLayout } = await import('./pages/settings/SettingsLayout')
          return { Component: SettingsLayout }
        },
        children: [
          { index: true, element: <Navigate to="/settings/app" replace /> },
          {
            path: 'app',
            lazy: async () => {
              const { AppConfigSection } = await import('./pages/settings/AppConfigSection')
              return { Component: AppConfigSection }
            },
          },
          {
            path: 'agents',
            lazy: async () => {
              const { AgentDefaultsSection } = await import('./pages/settings/AgentDefaultsSection')
              return { Component: AgentDefaultsSection }
            },
          },
          {
            path: 'profile',
            lazy: async () => {
              const { ProfileSettingsSection } =
                await import('./pages/settings/ProfileSettingsSection')
              return { Component: ProfileSettingsSection }
            },
          },
          {
            path: 'quality',
            lazy: async () => {
              const { QualitySettingsPage } = await import('./pages/settings/QualitySettingsPage')
              return { Component: QualitySettingsPage }
            },
          },
        ],
      },
      {
        path: 'sprint-planning',
        lazy: async () => {
          const { SprintPlanningPage } = await import('./pages/SprintPlanningPage')
          return { Component: SprintPlanningPage }
        },
      },
      {
        path: 'board',
        lazy: async () => {
          const { KanbanBoardPage } = await import('./pages/KanbanBoardPage')
          return { Component: KanbanBoardPage }
        },
      },
      {
        path: 'analytics',
        lazy: async () => {
          const { AnalyticsDashboard } = await import('./pages/AnalyticsDashboard')
          return { Component: AnalyticsDashboard }
        },
      },
      {
        path: 'performance',
        lazy: async () => {
          const { PerformanceDashboard } = await import('./pages/PerformanceDashboard')
          return { Component: PerformanceDashboard }
        },
      },
      {
        path: 'costs',
        lazy: async () => {
          const { CostsPage } = await import('./pages/CostsPage')
          return { Component: CostsPage }
        },
      },
      {
        path: 'ops',
        lazy: async () => {
          const { OpsPage } = await import('./pages/OpsPage')
          return { Component: OpsPage }
        },
      },
      {
        path: 'ops/monitor',
        lazy: async () => {
          const { MonitorPage } = await import('./pages/MonitorPage')
          return { Component: MonitorPage }
        },
      },
      {
        path: 'ops/diagnose',
        lazy: async () => {
          const { DiagnosePage } = await import('./pages/DiagnosePage')
          return { Component: DiagnosePage }
        },
      },
      {
        path: 'ops/reconcile',
        lazy: async () => {
          const { default: ReconcilePage } = await import('./pages/Reconcile')
          return { Component: ReconcilePage }
        },
      },
      {
        path: 'ops/quality',
        lazy: async () => {
          const { OpsQualityPage } = await import('./pages/OpsQualityPage')
          return { Component: OpsQualityPage }
        },
      },
      {
        path: 'retrospectives',
        lazy: async () => {
          const { RetrospectivePage } = await import('./pages/RetrospectivePage')
          return { Component: RetrospectivePage }
        },
      },
      {
        path: 'blockers',
        lazy: async () => {
          const { BlockersPage } = await import('./pages/BlockersPage')
          return { Component: BlockersPage }
        },
      },
      {
        path: 'alerts',
        lazy: async () => {
          const { AlertsPage } = await import('./pages/AlertsPage')
          return { Component: AlertsPage }
        },
      },
      {
        path: 'harnesses',
        lazy: async () => {
          const { HarnessesPage } = await import('./pages/HarnessesPage')
          return {
            Component: function HarnessesRoute() {
              const fleet = useOutletContext<Parameters<typeof HarnessesPage>[0]['fleet']>()
              return <HarnessesPage fleet={fleet} />
            },
          }
        },
      },
      { path: 'harnesses/new', element: <Navigate to="/harnesses" replace /> },
      { path: 'harnesses/:name/edit', element: <Navigate to="/harnesses" replace /> },
      {
        path: 'history/sprints',
        lazy: async () => {
          const { SprintsHistoryPage } = await import('./pages/SprintsHistoryPage')
          return { Component: SprintsHistoryPage }
        },
      },
      {
        path: 'history/agents',
        lazy: async () => {
          const { AgentsHistoryPage } = await import('./pages/AgentsHistoryPage')
          return { Component: AgentsHistoryPage }
        },
      },
      {
        path: 'history/tasks',
        lazy: async () => {
          const { TasksHistoryPage } = await import('./pages/TasksHistoryPage')
          return { Component: TasksHistoryPage }
        },
      },
      {
        path: '*',
        lazy: async () => {
          const { NotFoundPage } = await import('./pages/NotFoundPage')
          return { Component: NotFoundPage }
        },
      },
    ],
  },
]

export const router = createBrowserRouter(routes)

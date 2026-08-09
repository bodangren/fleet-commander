import {
  Navigate,
  createBrowserRouter,
  useNavigate,
  useOutletContext,
  useRoutes,
} from 'react-router-dom'

import { AppLayout } from './layout/AppLayout'
import { PortfolioRedirect } from './components/PortfolioRedirect'
import { AgentsPage } from './pages/AgentsPage'
import { AgentEditorPage } from './pages/AgentEditorPage'
import { AgentTemplatesPage } from './pages/AgentTemplatesPage'
import { AgentTemplateEditorPage } from './pages/AgentTemplateEditorPage'
import { AnalyticsDashboard } from './pages/AnalyticsDashboard'
import { CostsPage } from './pages/CostsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { PerformanceDashboard } from './pages/PerformanceDashboard'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProvidersPage } from './pages/ProvidersPage'
import { ProjectViewPage } from './pages/ProjectViewPage'
import { SettingsLayout } from './pages/settings/SettingsLayout'
import { AppConfigSection } from './pages/settings/AppConfigSection'
import { AgentDefaultsSection } from './pages/settings/AgentDefaultsSection'
import { ProfileSettingsSection } from './pages/settings/ProfileSettingsSection'
import { QualitySettingsPage } from './pages/settings/QualitySettingsPage'
import { TaskTimelinePage } from './pages/TaskTimelinePage'
import { OpsQualityPage } from './pages/OpsQualityPage'
import { ProjectTemplatesPage } from './pages/ProjectTemplatesPage'
import { OpsPage } from './pages/OpsPage'
import { MonitorPage } from './pages/MonitorPage'
import { DiagnosePage } from './pages/DiagnosePage'
import { RetrospectivePage } from './pages/RetrospectivePage'
import { BlockersPage } from './pages/BlockersPage'
import { AlertsPage } from './pages/AlertsPage'
import { SprintPlanningPage } from './pages/SprintPlanningPage'
import { KanbanBoardPage } from './pages/KanbanBoardPage'
import { SprintsHistoryPage } from './pages/SprintsHistoryPage'
import { AgentsHistoryPage } from './pages/AgentsHistoryPage'
import { TasksHistoryPage } from './pages/TasksHistoryPage'
import { NotFoundPage } from './pages/NotFoundPage'
import ReconcilePage from './pages/Reconcile'
import { HarnessesPage } from './pages/HarnessesPage'
import { type FleetDataState, useFleetData } from './lib/useFleetData'

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

/** Wrapper that reads fleet data from outlet context for AgentsPage. */
function AgentsPageWrapper() {
  const fleet = useOutletContext<FleetDataState>()
  return <AgentsPage fleet={fleet} />
}

/** Wrapper that reads fleet data from outlet context for HarnessesPage. */
function HarnessesPageWrapper() {
  const fleet = useOutletContext<FleetDataState>()
  return <HarnessesPage fleet={fleet} />
}

/** Wrapper that reads fleet data from outlet context for ProvidersPage. */
function ProvidersPageWrapper() {
  const fleet = useOutletContext<FleetDataState>()
  return <ProvidersPage fleet={fleet} />
}

/**
 * Data-router route tree for React Router 7.
 *
 * Replaces the v6 React Router component-based API with a
 * `createBrowserRouter` configuration. FleetLayout is the layout
 * route; all application pages are children.
 */
export const routes = [
  {
    element: <FleetLayout />,
    children: [
      { index: true, element: <PortfolioRedirect /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'agents', element: <AgentsPageWrapper /> },
      { path: 'agents/:name/edit', element: <AgentEditorPage /> },
      { path: 'agents/leaderboard', element: <LeaderboardPage /> },
      { path: 'agent-templates', element: <AgentTemplatesPage /> },
      { path: 'agent-templates/:id/edit', element: <AgentTemplateEditorPage /> },
      { path: 'templates', element: <ProjectTemplatesPage /> },
      { path: 'providers', element: <ProvidersPageWrapper /> },
      { path: 'project/:id', element: <ProjectViewPage /> },
      { path: 'tasks/:taskId/timeline', element: <TaskTimelinePage /> },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/app" replace /> },
          { path: 'app', element: <AppConfigSection /> },
          { path: 'agents', element: <AgentDefaultsSection /> },
          { path: 'profile', element: <ProfileSettingsSection /> },
          { path: 'quality', element: <QualitySettingsPage /> },
        ],
      },
      { path: 'analytics', element: <AnalyticsDashboard /> },
      { path: 'performance', element: <PerformanceDashboard /> },
      { path: 'costs', element: <CostsPage /> },
      { path: 'ops', element: <OpsPage /> },
      { path: 'ops/monitor', element: <MonitorPage /> },
      { path: 'ops/diagnose', element: <DiagnosePage /> },
      { path: 'ops/reconcile', element: <ReconcilePage /> },
      { path: 'ops/quality', element: <OpsQualityPage /> },
      { path: 'sprint-planning', element: <SprintPlanningPage /> },
      { path: 'board', element: <KanbanBoardPage /> },
      { path: 'retrospectives', element: <RetrospectivePage /> },
      { path: 'blockers', element: <BlockersPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'harnesses', element: <HarnessesPageWrapper /> },
      { path: 'harnesses/new', element: <Navigate to="/harnesses" replace /> },
      { path: 'harnesses/:name/edit', element: <Navigate to="/harnesses" replace /> },
      { path: 'history/sprints', element: <SprintsHistoryPage /> },
      { path: 'history/agents', element: <AgentsHistoryPage /> },
      { path: 'history/tasks', element: <TasksHistoryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)

/**
 * Renders the application route tree inside an existing router context.
 *
 * @returns Matched route elements for tests and embedded router hosts.
 */
export function AppRoutes() {
  return useRoutes(routes)
}

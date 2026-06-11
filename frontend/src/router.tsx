import { Navigate, Outlet, createBrowserRouter, useOutletContext } from 'react-router-dom'

import { AppLayout } from './layout/AppLayout'
import { PortfolioRedirect } from './components/PortfolioRedirect'
import { AgentsPage } from './pages/AgentsPage'
import { AgentEditorPage } from './pages/AgentEditorPage'
import { AgentTemplatesPage } from './pages/AgentTemplatesPage'
import { AgentTemplateEditorPage } from './pages/AgentTemplateEditorPage'
import { AnalyticsDashboard } from './pages/AnalyticsDashboard'
import { CostsPage } from './pages/CostsPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { PerformanceDashboard } from './pages/PerformanceDashboard'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProvidersPage } from './pages/ProvidersPage'
import { ProjectViewPage } from './pages/ProjectViewPage'
import { SettingsLayout } from './pages/settings/SettingsLayout'
import { AppConfigSection } from './pages/settings/AppConfigSection'
import { NotificationSettingsSection } from './pages/settings/NotificationSettingsSection'
import { AgentDefaultsSection } from './pages/settings/AgentDefaultsSection'
import { ProfileSettingsSection } from './pages/settings/ProfileSettingsSection'
import { TaskTimelinePage } from './pages/TaskTimelinePage'
import { ProjectTemplatesPage } from './pages/ProjectTemplatesPage'
import { PipelinesPage } from './pages/PipelinesPage'
import { OpsPage } from './pages/OpsPage'
import { MonitorPage } from './pages/MonitorPage'
import { DiagnosePage } from './pages/DiagnosePage'
import { OptimizePage } from './pages/OptimizePage'
import { RetrospectivePage } from './pages/RetrospectivePage'
import { NotificationHistoryPage } from './pages/NotificationHistoryPage'
import { BlockersPage } from './pages/BlockersPage'
import { AlertsPage } from './pages/AlertsPage'
import { SprintPlanningPage } from './pages/SprintPlanningPage'
import { KanbanBoardPage } from './pages/KanbanBoardPage'
import { SprintsHistoryPage } from './pages/SprintsHistoryPage'
import { AgentsHistoryPage } from './pages/AgentsHistoryPage'
import { TasksHistoryPage } from './pages/TasksHistoryPage'
import ReconcilePage from './pages/Reconcile'
import SimulatePage from './pages/SimulatePage'
import { HarnessesPage } from './pages/HarnessesPage'
import { HarnessEditorPage } from './pages/HarnessEditorPage'
import { type FleetDataState, useFleetData } from './lib/useFleetData'

/**
 * Layout route that fetches fleet data and provides it to AppLayout and
 * child routes via outlet context.
 */
function FleetLayout() {
  const fleet = useFleetData()
  return (
    <AppLayout
      healthStatus={fleet.healthStatus}
      loading={fleet.loading}
      onRefresh={fleet.refresh}
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

/**
 * Data-router route tree for React Router 7.
 *
 * Replaces the v6 <BrowserRouter>/<Routes>/<Route> JSX tree in App.tsx
 * with a `createBrowserRouter` configuration. FleetLayout is the layout
 * route; all application pages are children.
 */
export const router = createBrowserRouter([
  {
    element: <FleetLayout />,
    children: [
      { index: true, element: <PortfolioRedirect /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'agents', element: <AgentsPageWrapper /> },
      { path: 'agents/:name/edit', element: <AgentEditorPage /> },
      { path: 'agents/leaderboard', element: <LeaderboardPage /> },
      { path: 'agent-templates', element: <AgentTemplatesPage /> },
      { path: 'agent-templates/:id/edit', element: <AgentTemplateEditorPage /> },
      { path: 'templates', element: <ProjectTemplatesPage /> },
      { path: 'providers', element: <ProvidersPage /> },
      { path: 'project/:id', element: <ProjectViewPage /> },
      { path: 'tasks/:taskId/timeline', element: <TaskTimelinePage /> },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/app" replace /> },
          { path: 'settings/app', element: <AppConfigSection /> },
          { path: 'settings/notifications', element: <NotificationSettingsSection /> },
          { path: 'settings/agents', element: <AgentDefaultsSection /> },
          { path: 'settings/profile', element: <ProfileSettingsSection /> },
        ],
      },
      { path: 'pipelines', element: <PipelinesPage /> },
      { path: 'analytics', element: <AnalyticsDashboard /> },
      { path: 'performance', element: <PerformanceDashboard /> },
      { path: 'costs', element: <CostsPage /> },
      { path: 'ops', element: <OpsPage /> },
      { path: 'ops/monitor', element: <MonitorPage /> },
      { path: 'ops/diagnose', element: <DiagnosePage /> },
      { path: 'ops/optimize', element: <OptimizePage /> },
      { path: 'ops/reconcile', element: <ReconcilePage /> },
      { path: 'ops/simulate', element: <SimulatePage /> },
      { path: 'sprint-planning', element: <SprintPlanningPage /> },
      { path: 'board', element: <KanbanBoardPage /> },
      { path: 'retrospectives', element: <RetrospectivePage /> },
      { path: 'notifications', element: <NotificationHistoryPage /> },
      { path: 'blockers', element: <BlockersPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'harnesses', element: <HarnessesPageWrapper /> },
      { path: 'harnesses/:name/edit', element: <HarnessEditorPage /> },
      { path: 'history/sprints', element: <SprintsHistoryPage /> },
      { path: 'history/agents', element: <AgentsHistoryPage /> },
      { path: 'history/tasks', element: <TasksHistoryPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

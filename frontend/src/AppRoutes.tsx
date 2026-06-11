import { Navigate, Route, Routes } from 'react-router-dom'

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
import { useFleetData } from './lib/useFleetData'

/**
 * Route configuration defining all application routes with AppLayout wrapper.
 *
 * Kept for backward-compat with existing characterization tests (App.test.tsx,
 * App.routes.test.tsx Phase 4) that render <AppRoutes /> inside <MemoryRouter>.
 * Production app uses the data-router configured in router.tsx.
 */
export function AppRoutes() {
  const fleet = useFleetData()

  return (
    <Routes>
      <Route
        element={
          <AppLayout
            healthStatus={fleet.healthStatus}
            loading={fleet.loading}
            onRefresh={fleet.refresh}
          />
        }
      >
        <Route index element={<PortfolioRedirect />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="agents" element={<AgentsPage fleet={fleet} />} />
        <Route path="agents/:name/edit" element={<AgentEditorPage />} />
        <Route path="agents/leaderboard" element={<LeaderboardPage />} />
        <Route path="agent-templates" element={<AgentTemplatesPage />} />
        <Route path="agent-templates/:id/edit" element={<AgentTemplateEditorPage />} />
        <Route path="templates" element={<ProjectTemplatesPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="project/:id" element={<ProjectViewPage />} />
        <Route path="tasks/:taskId/timeline" element={<TaskTimelinePage />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/app" replace />} />
          <Route path="app" element={<AppConfigSection />} />
          <Route path="notifications" element={<NotificationSettingsSection />} />
          <Route path="agents" element={<AgentDefaultsSection />} />
          <Route path="profile" element={<ProfileSettingsSection />} />
        </Route>
        <Route path="pipelines" element={<PipelinesPage />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="performance" element={<PerformanceDashboard />} />
        <Route path="costs" element={<CostsPage />} />
        <Route path="ops" element={<OpsPage />} />
        <Route path="ops/monitor" element={<MonitorPage />} />
        <Route path="ops/diagnose" element={<DiagnosePage />} />
        <Route path="ops/optimize" element={<OptimizePage />} />
        <Route path="sprint-planning" element={<SprintPlanningPage />} />
        <Route path="board" element={<KanbanBoardPage />} />
        <Route path="ops/reconcile" element={<ReconcilePage />} />
        <Route path="ops/simulate" element={<SimulatePage />} />
        <Route path="retrospectives" element={<RetrospectivePage />} />
        <Route path="notifications" element={<NotificationHistoryPage />} />
        <Route path="blockers" element={<BlockersPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="history/sprints" element={<SprintsHistoryPage />} />
        <Route path="history/agents" element={<AgentsHistoryPage />} />
        <Route path="history/tasks" element={<TasksHistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

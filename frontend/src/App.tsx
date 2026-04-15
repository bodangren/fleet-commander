import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from './layout/AppLayout'
import { AgentsPage } from './pages/AgentsPage'
import { AgentEditorPage } from './pages/AgentEditorPage'
import { DashboardPage } from './pages/DashboardPage'
import { HarnessEditorPage } from './pages/HarnessEditorPage'
import { HarnessesPage } from './pages/HarnessesPage'
import { ProjectViewPage } from './pages/ProjectViewPage'
import { SettingsPage } from './pages/SettingsPage'
import { TaskTimelinePage } from './pages/TaskTimelinePage'
import { PipelinesPage } from './pages/PipelinesPage'
import { ConvexProvider } from './lib/ConvexProvider'
import { useFleetData } from './lib/useFleetData'
import { useLogStream } from './lib/useLogStream'

export function AppRoutes() {
  const fleet = useFleetData()
  const { lines, connected } = useLogStream(fleet.projects[0]?.id ?? '')

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
        <Route
          index
          element={<DashboardPage fleet={fleet} lines={lines} connected={connected} />}
        />
        <Route path="agents" element={<AgentsPage fleet={fleet} />} />
        <Route path="agents/:name/edit" element={<AgentEditorPage />} />
        <Route path="harnesses" element={<HarnessesPage fleet={fleet} />} />
        <Route path="harnesses/new" element={<HarnessEditorPage />} />
        <Route path="harnesses/:name/edit" element={<HarnessEditorPage />} />
        <Route path="project/:id" element={<ProjectViewPage />} />
        <Route path="tasks/:taskId/timeline" element={<TaskTimelinePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="pipelines" element={<PipelinesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ConvexProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </ConvexProvider>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  LayoutDashboard,
  Settings,
  ListTodo,
  Terminal as TerminalIcon,
  Activity,
  Database as DatabaseIcon,
  Server,
} from 'lucide-react'
import type { ProjectLoadResponse } from '../shared/board-data'

interface SystemStatus {
  platform: string
  arch: string
  version: string
  uptime: number
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
  }
}

interface DBLog {
  id: number
  event: string
  timestamp: string
}

function App() {
  const [count, setCount] = useState(0)
  const [systemTime, setSystemTime] = useState<string>('Initializing...')
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [logs, setLogs] = useState<DBLog[]>([])
  const [projectPathInput, setProjectPathInput] = useState('')
  const [diagnosticLabel, setDiagnosticLabel] = useState('Diagnostics Output')
  const [diagnosticOutput, setDiagnosticOutput] = useState('')
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null)

  const recordDiagnostics = (label: string, payload: unknown) => {
    setDiagnosticLabel(label)
    setDiagnosticOutput(JSON.stringify(payload, null, 2))
  }

  const fetchStatus = useCallback(async () => {
    try {
      const data = await window.ipcRenderer.invoke('get-system-status')
      setStatus(data as SystemStatus)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const data = await window.ipcRenderer.invoke('get-db-logs')
      setLogs(data as DBLog[])
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }, [])

  const handleSelectProject = useCallback(async () => {
    setDiagnosticError(null)
    try {
      const response = await window.projectApi.selectProject()
      recordDiagnostics('Select Project', response)
      if (response.ok) {
        setProjectPathInput(response.data.projectPath)
      }
    } catch (err) {
      setDiagnosticError('Failed to select project.')
      console.error('Failed to select project:', err)
    }
  }, [])

  const handleGetLastProject = useCallback(async () => {
    setDiagnosticError(null)
    try {
      const projectPath = await window.projectApi.getLastProjectPath()
      recordDiagnostics('Get Last Project', { projectPath })
      if (projectPath) {
        setProjectPathInput(projectPath)
      }
    } catch (err) {
      setDiagnosticError('Failed to read last project path.')
      console.error('Failed to read last project path:', err)
    }
  }, [])

  const handleLoadProject = useCallback(async () => {
    setDiagnosticError(null)
    const projectPath = projectPathInput.trim()
    if (projectPath.length === 0) {
      setDiagnosticError('Project path is required.')
      return
    }
    try {
      const response: ProjectLoadResponse = await window.projectApi.loadProject(projectPath)
      recordDiagnostics('Load Project', response)
    } catch (err) {
      setDiagnosticError('Failed to load project.')
      console.error('Failed to load project:', err)
    }
  }, [projectPathInput])

  const handleRefreshBoard = useCallback(async () => {
    setDiagnosticError(null)
    const projectPath = projectPathInput.trim()
    if (projectPath.length === 0) {
      setDiagnosticError('Project path is required.')
      return
    }
    try {
      const response: ProjectLoadResponse = await window.projectApi.refreshBoard(projectPath)
      recordDiagnostics('Refresh Board', response)
    } catch (err) {
      setDiagnosticError('Failed to refresh board.')
      console.error('Failed to refresh board:', err)
    }
  }, [projectPathInput])

  useEffect(() => {
    // Listen for messages from the main process
    const handleMessage = (_event: Electron.IpcRendererEvent, message: unknown) => {
      setSystemTime(message as string)
    }

    window.ipcRenderer.on('main-process-message', handleMessage)

    // Initial fetch
    fetchStatus()
    fetchLogs()

    // Refresh status every 5 seconds
    const statusInterval = setInterval(fetchStatus, 5000)

    return () => {
      window.ipcRenderer.off('main-process-message', handleMessage)
      clearInterval(statusInterval)
    }
  }, [fetchStatus, fetchLogs])

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-primary w-5 h-5" />
            Conductor
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Board
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <ListTodo className="w-4 h-4" />
            Tracks
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <TerminalIcon className="w-4 h-4" />
            Terminal
          </Button>
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Command Center</h1>
            <p className="text-muted-foreground text-lg">
              Walking Skeleton successfully initialized.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Status Card */}
            <Card className="shadow-lg border-2 border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  <CardDescription>Live metrics from Node.js</CardDescription>
                </div>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {status ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted p-2 rounded">
                      <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">
                        Platform
                      </p>
                      <p className="font-mono">
                        {status.platform}-{status.arch}
                      </p>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">
                        Uptime
                      </p>
                      <p className="font-mono">{Math.floor(status.uptime)}s</p>
                    </div>
                    <div className="bg-muted p-2 rounded col-span-2">
                      <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">
                        Memory (RSS)
                      </p>
                      <p className="font-mono">
                        {(status.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading status...</p>
                )}

                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">IPC Test</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-mono">
                      {systemTime}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setCount(c => c + 1)}>
                    Hits: {count}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Database Logs Card */}
            <Card className="shadow-lg border-2 border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">Database Logs</CardTitle>
                  <CardDescription>Recent events from SQLite</CardDescription>
                </div>
                <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-[160px] overflow-auto pr-2">
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <div
                        key={log.id}
                        className="text-[10px] flex justify-between items-center p-2 bg-muted/50 rounded border border-border/50"
                      >
                        <span className="font-medium text-foreground">{log.event}</span>
                        <span className="text-muted-foreground font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No logs found.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={fetchLogs}>
                  Refresh Logs
                </Button>
              </CardFooter>
            </Card>

            {/* Diagnostics Card */}
            <Card className="shadow-lg border-2 border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">Diagnostics</CardTitle>
                  <CardDescription>Project IPC utilities</CardDescription>
                </div>
                <TerminalIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="project-path">
                    Project Path
                  </label>
                  <input
                    id="project-path"
                    value={projectPathInput}
                    onChange={event => setProjectPathInput(event.target.value)}
                    placeholder="Select or paste a project path"
                    className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={handleSelectProject}>
                    Select Project
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleGetLastProject}>
                    Get Last Project
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLoadProject}>
                    Load Project
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRefreshBoard}>
                    Refresh Board
                  </Button>
                </div>
                {diagnosticError ? (
                  <div className="text-xs text-destructive">{diagnosticError}</div>
                ) : null}
                <div className="rounded border border-border bg-muted/50 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">{diagnosticLabel}</p>
                  <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-foreground whitespace-pre-wrap">
                    {diagnosticOutput || 'Run a diagnostics action to see output.'}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

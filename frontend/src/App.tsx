import { useState, useEffect } from 'react'
import { Activity, LayoutDashboard, Terminal as TerminalIcon, Settings } from 'lucide-react'
import { Button } from './components/ui/button'

function App() {
  const [activeTab, setActiveTab] = useState<'board' | 'terminal' | 'settings'>('board')
  const [healthStatus, setHealthStatus] = useState<string>('Checking...')

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthStatus(`Backend Status: ${data.message}`))
      .catch(err => setHealthStatus(`Backend Error: ${err.message}`))
  }, [])

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-primary w-5 h-5" />
            Fleet Commander
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={activeTab === 'board' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('board')}
          >
            <LayoutDashboard className="w-4 h-4" />
            Global Dashboard
          </Button>

          <Button
            variant={activeTab === 'terminal' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('terminal')}
          >
            <TerminalIcon className="w-4 h-4" />
            Terminals
          </Button>

          <Button
            variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex items-center justify-between pb-4 border-b">
            <h1 className="text-2xl font-semibold capitalize">{activeTab}</h1>
            <div className="text-sm font-mono bg-muted px-3 py-1 rounded text-muted-foreground">
              {healthStatus}
            </div>
          </header>

          <section className="space-y-4">
            <p className="text-muted-foreground">
              Welcome to the Conductor Fleet Commander. This UI is now being served by the Go
              daemon.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App

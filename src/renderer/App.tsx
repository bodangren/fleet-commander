import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LayoutDashboard, Settings, ListTodo, Terminal as TerminalIcon, Activity } from "lucide-react"

function App() {
  const [count, setCount] = useState(0)
  const [systemTime, setSystemTime] = useState<string>("Initializing...")

  useEffect(() => {
    // Listen for messages from the main process
    const removeListener = window.ipcRenderer.on('main-process-message', (_event, message) => {
      setSystemTime(message as string)
    })

    return () => {
      if (removeListener) removeListener()
    }
  }, [])

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
      <main className="flex-1 overflow-auto flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Command Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Walking Skeleton successfully initialized.
            </p>
          </div>
          
          <Card className="shadow-lg border-2 border-primary/10">
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>
                Real-time connection status and metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">IPC Message</span>
                  <span className="text-sm font-mono font-medium truncate w-full">{systemTime}</span>
                </div>
                <div className="bg-muted p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Interactions</span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Interactive Demo</p>
                  <p className="text-xs text-muted-foreground italic">Testing React state and Tailwind responsiveness.</p>
                </div>
                <Button 
                  onClick={() => setCount((c) => c + 1)}
                  className="shadow-md"
                >
                  Click Me
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground bg-muted/50 px-6 py-3 rounded-b-lg border-t">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Backend Connected
              </span>
              <span>v1.0.0-skeleton</span>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default App

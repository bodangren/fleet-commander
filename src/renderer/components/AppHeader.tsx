import { useState, useCallback } from 'react'
import { Settings, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AppHeaderProps = {
  projectPath: string
  onSettingsClick: () => void
}

export function AppHeader({ projectPath, onSettingsClick }: AppHeaderProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCopyPath = useCallback(async () => {
    if (!projectPath) return

    try {
      await navigator.clipboard.writeText(projectPath)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      console.error('Failed to copy path to clipboard')
    }
  }, [projectPath])

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Command Center</h1>
        {projectPath ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/50"
            data-testid="project-path-display"
          >
            <span
              className="text-sm text-muted-foreground truncate max-w-[300px]"
              data-testid="project-path-text"
              title={projectPath}
            >
              {projectPath}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopyPath}
              aria-label={copySuccess ? 'Copied!' : 'Copy project path'}
            >
              {copySuccess ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ) : null}
      </div>
      <Button variant="ghost" size="icon" onClick={onSettingsClick} aria-label="Settings">
        <Settings className="h-5 w-5" />
      </Button>
    </header>
  )
}

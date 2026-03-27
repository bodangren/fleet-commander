import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ScanResponse = {
  paths?: string[]
  error?: string
}

type ImportResponse = {
  error?: string
}

export function WorkspaceScanner({ onImported }: { onImported?: () => Promise<void> | void }) {
  const [rootDir, setRootDir] = useState('')
  const [discoveredPaths, setDiscoveredPaths] = useState<string[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | 'scan' | 'import'>(null)

  const selectedCount = useMemo(
    () => Object.values(selectedPaths).filter(Boolean).length,
    [selectedPaths],
  )

  const scanWorkspace = async () => {
    const trimmedRoot = rootDir.trim()
    if (!trimmedRoot) {
      setError('Workspace root is required.')
      return
    }

    setBusy('scan')
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/projects/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rootDir: trimmedRoot }),
      })
      const payload = (await response.json()) as ScanResponse
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to scan workspace')
      }

      const paths = payload.paths ?? []
      setDiscoveredPaths(paths)
      setSelectedPaths(Object.fromEntries(paths.map(path => [path, true])))
      setStatus(
        paths.length === 0 ? 'No conductor projects were discovered.' : 'Workspace scanned.',
      )
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : 'Unknown error'
      setError(message)
      setDiscoveredPaths([])
      setSelectedPaths({})
    } finally {
      setBusy(null)
    }
  }

  const importSelected = async () => {
    const paths = discoveredPaths.filter(path => selectedPaths[path])
    if (paths.length === 0) {
      setError('Select at least one project to import.')
      return
    }

    setBusy('import')
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths }),
      })
      const payload = (await response.json()) as ImportResponse
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to import projects')
      }

      await onImported?.()
      setStatus(`Imported ${paths.length} project${paths.length === 1 ? '' : 's'}.`)
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : 'Unknown error'
      setError(message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="border-cyan-400/20 bg-background/70 shadow-2xl shadow-cyan-950/10 backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Scan a workspace</CardTitle>
            <CardDescription>
              Point the daemon at a root directory and import every discovered Conductor project.
            </CardDescription>
          </div>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
            Local only
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="workspace-root">
            Workspace Root
          </label>
          <input
            id="workspace-root"
            value={rootDir}
            onChange={event => setRootDir(event.target.value)}
            placeholder="/home/daniel-bo/Desktop"
            className="w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={scanWorkspace} disabled={busy === 'scan'}>
            {busy === 'scan' ? 'Scanning...' : 'Scan workspace'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={importSelected}
            disabled={busy === 'import' || selectedCount === 0}
          >
            {busy === 'import' ? 'Importing...' : `Import selected (${selectedCount})`}
          </Button>
        </div>

        {status || error ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-500/30 bg-red-500/10 text-red-100'
                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
            }`}
          >
            {error ?? status}
          </div>
        ) : null}

        {discoveredPaths.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <span>Discovered projects</span>
              <span>{selectedCount} selected</span>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {discoveredPaths.map(path => {
                const isSelected = selectedPaths[path] ?? false
                return (
                  <label
                    key={path}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 text-sm text-foreground transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border/60"
                      checked={isSelected}
                      onChange={event =>
                        setSelectedPaths(prev => ({
                          ...prev,
                          [path]: event.target.checked,
                        }))
                      }
                    />
                    <span className="break-all text-muted-foreground">{path}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 px-4 py-5 text-sm text-muted-foreground">
            Scan a root directory to reveal registered projects and import them into Fleet
            Commander.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

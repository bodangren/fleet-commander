import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type AppConfig = {
  general: {
    defaultAgent: string
    orchestratorInterval: number
    logRetentionDays: number
  }
  harness: {
    cacheTTL: number
    defaultHarness: string
  }
  websocket: {
    reconnectInterval: number
  }
}

const inputClass =
  'w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'

function FieldGroup({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </div>
  )
}

export function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch('/api/settings', { signal: controller.signal })
        const payload = (await res.json()) as AppConfig & { error?: string }
        if (!res.ok) throw new Error(payload.error ?? 'Failed to load settings')
        setConfig(payload)
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Unknown error')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [])

  const handleSave = useCallback(async () => {
    if (!config) return
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const payload = (await res.json()) as AppConfig & { error?: string }
      if (!res.ok) throw new Error(payload.error ?? 'Failed to save')
      setConfig(payload)
      setToast({ type: 'success', message: 'Settings saved successfully.' })
    } catch (e) {
      setToast({
        type: 'error',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setSaving(false)
    }
  }, [config])

  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Loading settings...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error || !config) {
    return (
      <Card className="border-red-500/30 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-100">Failed to load settings</CardTitle>
          <CardDescription className="text-red-200">{error ?? 'Unknown error'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <Card
          className={
            toast.type === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10'
              : 'border-red-500/30 bg-red-500/10'
          }
        >
          <CardHeader className="py-3">
            <CardDescription
              className={toast.type === 'success' ? 'text-emerald-100' : 'text-red-100'}
            >
              {toast.message}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Core orchestration and agent settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Default Agent"
            description="Agent tag used when a task has no agent assigned."
          >
            <input
              className={inputClass}
              value={config.general.defaultAgent}
              placeholder="e.g. senior-frontend"
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? { ...prev, general: { ...prev.general, defaultAgent: e.target.value } }
                    : prev,
                )
              }
            />
          </FieldGroup>
          <FieldGroup
            label="Orchestrator Interval (seconds)"
            description="Seconds between automatic orchestrator runs."
          >
            <input
              className={inputClass}
              type="number"
              min={0}
              value={config.general.orchestratorInterval}
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? {
                        ...prev,
                        general: {
                          ...prev.general,
                          orchestratorInterval: parseInt(e.target.value, 10) || 0,
                        },
                      }
                    : prev,
                )
              }
            />
          </FieldGroup>
          <FieldGroup
            label="Log Retention (days)"
            description="Number of days to keep execution logs."
          >
            <input
              className={inputClass}
              type="number"
              min={0}
              value={config.general.logRetentionDays}
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? {
                        ...prev,
                        general: {
                          ...prev.general,
                          logRetentionDays: parseInt(e.target.value, 10) || 0,
                        },
                      }
                    : prev,
                )
              }
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Harness</CardTitle>
          <CardDescription>Harness discovery and caching settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Discovery Cache TTL (seconds)"
            description="How long to cache harness model discovery results."
          >
            <input
              className={inputClass}
              type="number"
              min={0}
              value={config.harness.cacheTTL}
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? {
                        ...prev,
                        harness: { ...prev.harness, cacheTTL: parseInt(e.target.value, 10) || 0 },
                      }
                    : prev,
                )
              }
            />
          </FieldGroup>
          <FieldGroup label="Default Harness" description="Harness used when none is specified.">
            <input
              className={inputClass}
              value={config.harness.defaultHarness}
              placeholder="e.g. claude"
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? { ...prev, harness: { ...prev.harness, defaultHarness: e.target.value } }
                    : prev,
                )
              }
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>WebSocket</CardTitle>
          <CardDescription>Real-time connection settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Reconnect Interval (ms)"
            description="Milliseconds to wait before reconnecting a dropped WebSocket."
          >
            <input
              className={inputClass}
              type="number"
              min={0}
              value={config.websocket.reconnectInterval}
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? {
                        ...prev,
                        websocket: {
                          ...prev.websocket,
                          reconnectInterval: parseInt(e.target.value, 10) || 0,
                        },
                      }
                    : prev,
                )
              }
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

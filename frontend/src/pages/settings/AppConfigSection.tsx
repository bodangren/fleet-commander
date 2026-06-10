import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/lib/toast'

type AppConfig = {
  general: {
    defaultAgent: string
    orchestratorInterval: number
    logRetentionDays: number
  }
  providers: {
    cacheTTL: number
  }
  websocket: {
    reconnectInterval: number
  }
}

type AgentOption = {
  name: string
  displayName: string
}

const inputClass =
  'w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'

const selectClass =
  'w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground appearance-none focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'

/**
 * Wrapper for a labeled form field with optional description.
 */
function FieldGroup({
  label,
  description,
  controlId,
  children,
}: {
  label: string
  description?: string
  controlId: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={controlId}>
        {label}
      </label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </div>
  )
}

/**
 * Application configuration section — General, Providers, and WebSocket.
 * Loads from and writes to `/api/settings`.
 */
export function AppConfigSection() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentOption[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const [settingsRes, agentsRes] = await Promise.all([
          fetch('/api/settings', { signal: controller.signal }),
          fetch('/api/agents', { signal: controller.signal }),
        ])
        const payload = (await settingsRes.json()) as AppConfig & { error?: string }
        if (!settingsRes.ok) throw new Error(payload.error ?? 'Failed to load settings')
        setConfig(payload)

        if (agentsRes.ok) {
          const agentsData = (await agentsRes.json()) as Array<{
            definition: { name: string; description: string }
          }>
          if (Array.isArray(agentsData)) {
            setAgents(
              agentsData
                .filter(a => a.definition?.name)
                .map(a => ({
                  name: a.definition.name,
                  displayName: a.definition.description || a.definition.name,
                })),
            )
          }
        }
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
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const payload = (await res.json()) as AppConfig & { error?: string }
      if (!res.ok) throw new Error(payload.error ?? 'Failed to save')
      showToast('success', 'Settings saved successfully.')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }, [config, showToast])

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
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Core orchestration and agent settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Default Agent"
            description="Agent tag used when a task has no agent assigned."
            controlId="app-default-agent"
          >
            <select
              id="app-default-agent"
              className={selectClass}
              value={config.general.defaultAgent}
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? { ...prev, general: { ...prev.general, defaultAgent: e.target.value } }
                    : prev,
                )
              }
            >
              <option value="">None</option>
              {agents.map(agent => (
                <option key={agent.name} value={agent.name}>
                  {agent.displayName}
                </option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup
            label="Orchestrator Interval (seconds)"
            description="Seconds between automatic orchestrator runs."
            controlId="orchestrator-interval"
          >
            <input
              id="orchestrator-interval"
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
            controlId="log-retention-days"
          >
            <input
              id="log-retention-days"
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
          <CardTitle>Providers</CardTitle>
          <CardDescription>LLM provider discovery and caching settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Discovery Cache TTL (seconds)"
            description="How long to cache provider model discovery results."
            controlId="discovery-cache-ttl"
          >
            <input
              id="discovery-cache-ttl"
              className={inputClass}
              type="number"
              min={0}
              value={config.providers.cacheTTL}
              onChange={e =>
                setConfig(prev =>
                  prev
                    ? {
                        ...prev,
                        providers: {
                          ...prev.providers,
                          cacheTTL: parseInt(e.target.value, 10) || 0,
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
          <CardTitle>WebSocket</CardTitle>
          <CardDescription>Real-time connection settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Reconnect Interval (ms)"
            description="Milliseconds to wait before reconnecting a dropped WebSocket."
            controlId="reconnect-interval"
          >
            <input
              id="reconnect-interval"
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

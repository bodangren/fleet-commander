import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotificationPreferences } from '@/lib/useConvexData'

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
 * Wrapper component for form field label and description
 * @param label - Field label text
 * @param description - Optional field description
 * @param children - Field input elements
 */
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

/**
 * App configuration form for general, providers, websocket, and notification settings
 */
export function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [agents, setAgents] = useState<AgentOption[]>([])

  const notificationUserId = 'admin:system'
  const preferences = useNotificationPreferences(notificationUserId)
  const [prefState, setPrefState] = useState({
    muteAll: false,
    inAppEnabled: true,
    webhookEnabled: false,
    webhookUrl: '',
    emailEnabled: false,
    email: '',
  })
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    if (preferences) {
      setPrefState({
        muteAll: preferences.muteAll,
        inAppEnabled: preferences.inAppEnabled,
        webhookEnabled: preferences.webhookEnabled,
        webhookUrl: preferences.webhookUrl ?? '',
        emailEnabled: preferences.emailEnabled,
        email: preferences.email ?? '',
      })
    }
  }, [preferences])

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
    setToast(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const payload = (await res.json()) as AppConfig & { error?: string }
      if (!res.ok) throw new Error(payload.error ?? 'Failed to save')
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

  const handleSavePrefs = useCallback(async () => {
    setSavingPrefs(true)
    setToast(null)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: notificationUserId,
          muteAll: prefState.muteAll,
          inAppEnabled: prefState.inAppEnabled,
          webhookEnabled: prefState.webhookEnabled,
          webhookUrl: prefState.webhookUrl || undefined,
          emailEnabled: prefState.emailEnabled,
          email: prefState.email || undefined,
        }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(payload.error ?? 'Failed to save preferences')
      setToast({ type: 'success', message: 'Notification preferences saved.' })
    } catch (e) {
      setToast({
        type: 'error',
        message: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setSavingPrefs(false)
    }
  }, [prefState])

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
            <select
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
          <CardTitle>Providers</CardTitle>
          <CardDescription>LLM provider discovery and caching settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Discovery Cache TTL (seconds)"
            description="How long to cache provider model discovery results."
          >
            <input
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

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Channel preferences and delivery settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup label="Mute All" description="Temporarily disable all notifications.">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefState.muteAll}
                onChange={e => setPrefState(prev => ({ ...prev, muteAll: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-xs">Mute all notifications</span>
            </label>
          </FieldGroup>

          <FieldGroup
            label="In-App"
            description="Show notifications inside the Fleet Commander UI."
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefState.inAppEnabled}
                onChange={e => setPrefState(prev => ({ ...prev, inAppEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-xs">Enable in-app notifications</span>
            </label>
          </FieldGroup>

          <FieldGroup
            label="Webhook"
            description="POST JSON payload to a configured URL on each event."
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefState.webhookEnabled}
                onChange={e =>
                  setPrefState(prev => ({ ...prev, webhookEnabled: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-xs">Enable webhook delivery</span>
            </label>
            {prefState.webhookEnabled && (
              <input
                className={inputClass}
                value={prefState.webhookUrl}
                placeholder="https://example.com/webhook"
                onChange={e => setPrefState(prev => ({ ...prev, webhookUrl: e.target.value }))}
              />
            )}
          </FieldGroup>

          <FieldGroup label="Email" description="SMTP delivery for critical alerts.">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefState.emailEnabled}
                onChange={e => setPrefState(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-xs">Enable email delivery</span>
            </label>
            {prefState.emailEnabled && (
              <input
                className={inputClass}
                value={prefState.email}
                placeholder="admin@example.com"
                onChange={e => setPrefState(prev => ({ ...prev, email: e.target.value }))}
              />
            )}
          </FieldGroup>

          <div className="flex justify-end">
            <Button onClick={() => void handleSavePrefs()} disabled={savingPrefs}>
              {savingPrefs ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
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

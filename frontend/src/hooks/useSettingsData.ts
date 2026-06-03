import { useCallback, useEffect, useState } from 'react'

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

/**
 * Loads app config and agent list from the pivot API.
 * Returns config state, loading/error flags, agents, and a save callback.
 */
export function useSettingsData() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [agents, setAgents] = useState<AgentOption[]>([])

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

  const updateConfig = useCallback((updater: (prev: AppConfig | null) => AppConfig | null) => {
    setConfig(updater)
  }, [])

  return {
    config,
    loading,
    saving,
    error,
    toast,
    agents,
    handleSave,
    updateConfig,
    setToast,
  }
}

export type { AppConfig, AgentOption }

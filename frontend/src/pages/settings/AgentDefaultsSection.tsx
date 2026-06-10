import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useToast } from '@/lib/toast'

type AgentOption = {
  name: string
  displayName: string
}

const selectClass =
  'w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground appearance-none focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'

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
 * Agent defaults section — loads the default agent from `/api/settings` and
 * the agent registry from `/api/agents`, lets the user pick a default, and
 * persists the choice via PUT to `/api/settings`.
 */
export function AgentDefaultsSection() {
  const [defaultAgent, setDefaultAgent] = useState<string>('')
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const [settingsRes, agentsRes] = await Promise.all([
          fetch('/api/settings', { signal: controller.signal }),
          fetch('/api/agents', { signal: controller.signal }),
        ])
        const payload = (await settingsRes.json()) as {
          general?: { defaultAgent?: string }
          error?: string
        }
        if (!settingsRes.ok) throw new Error(payload.error ?? 'Failed to load settings')
        setDefaultAgent(payload.general?.defaultAgent ?? '')

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
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ general: { defaultAgent } }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(payload.error ?? 'Failed to save')
      showToast('success', 'Default agent saved.')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }, [defaultAgent, showToast])

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <h3 className="font-semibold leading-none tracking-tight">Agent Defaults</h3>
        <CardDescription>Default agent and orchestration preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading agent defaults...</p>
        ) : error ? (
          <p className="text-xs text-red-200">{error}</p>
        ) : (
          <>
            <FieldGroup
              label="Default Agent"
              description="Agent tag used when a task has no agent assigned."
              controlId="default-agent"
            >
              <select
                id="default-agent"
                className={selectClass}
                value={defaultAgent}
                onChange={e => setDefaultAgent(e.target.value)}
              >
                <option value="">None</option>
                {agents.map(agent => (
                  <option key={agent.name} value={agent.name}>
                    {agent.displayName}
                  </option>
                ))}
              </select>
            </FieldGroup>
            <div className="flex justify-end">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

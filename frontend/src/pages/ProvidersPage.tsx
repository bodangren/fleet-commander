import { useEffect, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ProviderInfo = {
  name: string
  models: string[]
}

type AgentInfo = {
  name: string
  displayName: string
  model: string
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [agentsRes, providersRes] = await Promise.all([
          fetch('/api/agents', { signal: controller.signal }),
          fetch('/api/harnesses', { signal: controller.signal }),
        ])

        const agentsData = (await agentsRes.json()) as AgentInfo[]
        setAgents(Array.isArray(agentsData) ? agentsData : [])

        if (providersRes.ok) {
          const providersData = (await providersRes.json()) as ProviderInfo[]
          setProviders(Array.isArray(providersData) ? providersData : [])
        } else {
          setProviders([])
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Unknown error')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    })()
    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Loading providers...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-100">Failed to load providers</CardTitle>
          <CardDescription className="text-red-200">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">LLM Providers</h3>
        <p className="text-sm text-muted-foreground">
          Connected model providers and their available models.
        </p>
      </div>

      {providers.length === 0 ? (
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle>No providers synced</CardTitle>
            <CardDescription>
              Sync providers from your OpenCode configuration to populate this page.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map(provider => (
            <Card key={provider.name} className="border-border/60 bg-background/60">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">{provider.name}</CardTitle>
                <CardDescription>
                  {provider.models.length} model{provider.models.length === 1 ? '' : 's'} available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {provider.models.map(model => (
                    <li key={model} className="text-sm font-mono text-muted-foreground">
                      {provider.name}/{model}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {agents.length > 0 && (
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle>Agent-Model Assignments</CardTitle>
            <CardDescription>Which agents use which providers and models.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agents.map(agent => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between border-b border-border/40 py-2"
                >
                  <span className="text-sm font-medium">{agent.displayName || agent.name}</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {agent.model || 'unassigned'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProvidersData } from '@/hooks/useProvidersData'
import { useState } from 'react'

/**
 * Lists LLM providers and agent-model assignments
 */
export function ProvidersPage() {
  const { providers, agents, loading, error, refresh } = useProvidersData()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await refresh()
    } finally {
      setSyncing(false)
    }
  }

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
            <div className="pt-2">
              <Button size="sm" onClick={() => void handleSync()} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync Providers'}
              </Button>
            </div>
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

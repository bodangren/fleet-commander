import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProvidersData } from '@/hooks/useProvidersData'
import { useProviderHealth } from '@/hooks/useProviderHealth'
import { useToast } from '@/lib/toast'
import { ProviderCard } from '@/components/providers/ProviderCard'
import { FallbackHistoryTable } from '@/components/providers/FallbackHistoryTable'
import { ProviderLatencyChart } from '@/components/providers/ProviderLatencyChart'
import { useEffect, useRef, useState } from 'react'

/**
 * Lists LLM providers with health status, latency charts, and fallback history.
 */
export function ProvidersPage() {
  const { providers, agents, loading, error, refresh } = useProvidersData()
  const {
    providers: healthProviders,
    fallbackEvents,
    loading: healthLoading,
    refresh: refreshHealth,
  } = useProviderHealth()
  const { showToast } = useToast()
  const unhealthyNotified = useRef<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    for (const p of healthProviders) {
      const health = p.healthStatus ?? p.status
      if (health === 'unhealthy' && !unhealthyNotified.current.has(p.name)) {
        unhealthyNotified.current.add(p.name)
        showToast('error', `${p.name} is unhealthy`)
      }
    }
  }, [healthProviders, showToast])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.all([refresh(), refreshHealth()])
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

  // Merge basic provider data with health data
  const mergedProviders = providers.map(p => {
    const health = healthProviders.find(h => h.name === p.name)
    return {
      ...p,
      status: health?.status ?? 'idle',
      healthStatus: health?.healthStatus,
      avgLatencyMs: health?.avgLatencyMs,
      failureCount: health?.failureCount,
      lastCheckedAt: health?.lastCheckedAt,
      lastSuccessAt: health?.lastSuccessAt,
    }
  })

  // Count unhealthy providers for summary — prefer healthStatus over status
  const unhealthyCount = mergedProviders.filter(
    p => (p.healthStatus ?? p.status) === 'unhealthy',
  ).length
  const degradedCount = mergedProviders.filter(
    p => (p.healthStatus ?? p.status) === 'degraded',
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">LLM Providers</h3>
          <p className="text-sm text-muted-foreground">
            Connected model providers with health status and fallback history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(unhealthyCount > 0 || degradedCount > 0) && (
            <div className="flex items-center gap-2 text-sm">
              {unhealthyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-red-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {unhealthyCount} unhealthy
                </span>
              )}
              {degradedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-yellow-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                  {degradedCount} degraded
                </span>
              )}
            </div>
          )}
          <Button size="sm" onClick={() => void handleSync()} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Providers'}
          </Button>
        </div>
      </div>

      {mergedProviders.length === 0 ? (
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
          {mergedProviders.map(provider => (
            <ProviderCard
              key={provider.name}
              provider={{
                name: provider.name,
                models: provider.models,
                status: provider.status,
                healthStatus: provider.healthStatus,
                avgLatencyMs: provider.avgLatencyMs,
                failureCount: provider.failureCount,
                lastCheckedAt: provider.lastCheckedAt,
                lastSuccessAt: provider.lastSuccessAt,
              }}
            />
          ))}
        </div>
      )}

      {/* Latency Sparklines */}
      {healthProviders.length > 0 && (
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-base">Provider Latency</CardTitle>
            <CardDescription>Average latency over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {healthProviders.map(provider => (
                <div key={provider.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{provider.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {provider.avgLatencyMs ? `${Math.round(provider.avgLatencyMs)}ms` : '—'}
                    </span>
                    <ProviderLatencyChart
                      data={provider.avgLatencyMs ? [provider.avgLatencyMs] : []}
                      width={80}
                      height={24}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback History */}
      <FallbackHistoryTable events={fallbackEvents} loading={healthLoading} />

      {/* Agent-Model Assignments */}
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

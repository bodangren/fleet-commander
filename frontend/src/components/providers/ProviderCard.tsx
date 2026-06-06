import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { providerHealthStatusDisplay, providerStatusDisplay } from '../../../../convex/lib/validators'

export interface ProviderHealthData {
  name: string
  models: string[]
  status: string
  healthStatus?: string
  avgLatencyMs?: number
  failureCount?: number
  lastCheckedAt?: number
  lastSuccessAt?: number
}

interface ProviderCardProps {
  provider: ProviderHealthData
}

const statusColors: Record<string, string> = { ...providerStatusDisplay, ...providerHealthStatusDisplay }

const statusLabels: Record<string, string> = {
  healthy: 'Healthy',
  active: 'Active',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
  rate_limited: 'Rate Limited',
  idle: 'Idle',
}

/**
 * Format latency as a readable string
 * @param ms - Latency in milliseconds
 * @returns Formatted latency string
 */
function formatLatency(ms: number | undefined): string {
  if (!ms || ms === 0) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Format relative time since last check
 * @param timestamp - Unix timestamp in ms
 * @returns Relative time string
 */
function formatTimeSince(timestamp: number | undefined): string {
  if (!timestamp) return 'Never'
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * Renders a provider status card with health badge, latency, and model count.
 */
export function ProviderCard({ provider }: ProviderCardProps) {
  const displayStatus = provider.healthStatus ?? provider.status
  const color = statusColors[displayStatus] ?? 'bg-gray-400'
  const label = statusLabels[displayStatus] ?? displayStatus

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{provider.name}</CardTitle>
          <span className="inline-flex items-center gap-1.5" title={label}>
            <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </span>
        </div>
        <CardDescription>
          {provider.models.length} model{provider.models.length === 1 ? '' : 's'} available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Avg Latency</span>
            <p className="font-mono">{formatLatency(provider.avgLatencyMs)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Failures</span>
            <p className="font-mono">{provider.failureCount ?? 0}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Checked</span>
            <p className="font-mono">{formatTimeSince(provider.lastCheckedAt)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Success</span>
            <p className="font-mono">{formatTimeSince(provider.lastSuccessAt)}</p>
          </div>
        </div>
        <ul className="space-y-1 border-t border-border/40 pt-2">
          {provider.models.map(model => (
            <li key={model} className="text-sm font-mono text-muted-foreground">
              {provider.name}/{model}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

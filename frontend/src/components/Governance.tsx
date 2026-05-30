import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  GovernanceEventEntry,
  ReconciliationEventEntry,
  PolicyWeightsEntry,
} from '@/lib/useConvexData'

export interface GovernanceData {
  governanceEvents: GovernanceEventEntry[]
  reconciliationEvents: ReconciliationEventEntry[]
  policyWeights: PolicyWeightsEntry[]
}

interface GovernanceProps {
  data?: GovernanceData
  loading?: boolean
}

/**
 * Reusable card wrapper for governance dashboard sections
 * @param title - Card title
 * @param description - Card description text
 * @param children - Card content
 */
function GovernanceCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * Formats timestamp as relative time (just now/m/h/d ago)
 * @param ts - Unix timestamp in milliseconds
 * @returns Relative time string
 */
function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Safely parses JSON governance event payloads
 * @param json - JSON string to parse
 * @returns Parsed object or empty object on error
 */
function parsePayload(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

/**
 * Displays drift events, budget breaches, and policy versions
 * @param data - Governance data with events and policies
 * @param loading - Whether data is loading
 */
export function Governance({ data, loading }: GovernanceProps) {
  if (loading || data === undefined) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">Loading governance data...</p>
        </CardContent>
      </Card>
    )
  }

  const { governanceEvents, reconciliationEvents, policyWeights } = data

  const budgetBreaches = governanceEvents.filter(e => e.eventType === 'budget_breach')
  const recentDivergences = reconciliationEvents.slice(0, 20)
  const recentPolicyChanges = policyWeights.slice(0, 10)

  return (
    <div className="space-y-4" data-testid="governance">
      <div className="grid gap-4 md:grid-cols-3">
        <GovernanceCard
          title="Drift Events"
          description={`${reconciliationEvents.length} divergence(s) detected`}
        >
          {recentDivergences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drift events</p>
          ) : (
            <ul className="space-y-2">
              {recentDivergences.map((event, i) => (
                <li
                  key={`${event.artifactType}-${event.artifactId}-${i}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/40 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {event.artifactType}: {event.artifactId}
                    </p>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-amber-400">{event.divergenceType}</span>
                </li>
              ))}
            </ul>
          )}
        </GovernanceCard>

        <GovernanceCard
          title="Budget Breaches"
          description={`${budgetBreaches.length} breach(s) this period`}
        >
          {budgetBreaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No budget breaches</p>
          ) : (
            <ul className="space-y-2">
              {budgetBreaches.map((event, i) => {
                const payload = parsePayload(event.payloadJson)
                const taskKey = payload.taskKey as string | undefined
                const overage = payload.overage as number | undefined
                return (
                  <li
                    key={`breach-${event.scope}-${i}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/40 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.scope}</p>
                      {taskKey && <p className="text-xs text-muted-foreground">Task: {taskKey}</p>}
                      {overage !== undefined && (
                        <p className="text-xs text-rose-400">+{overage.toFixed(2)} over budget</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-rose-400">
                      {formatTimestamp(event.createdAt)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </GovernanceCard>

        <GovernanceCard
          title="Policy Versions"
          description={`${policyWeights.length} version(s) tracked`}
        >
          {recentPolicyChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No policy changes</p>
          ) : (
            <ul className="space-y-2">
              {recentPolicyChanges.map((policy, i) => {
                let weights: Record<string, number> = {}
                try {
                  weights = JSON.parse(policy.weightsJson)
                } catch {
                  // ignore parse errors
                }
                const weightCount = Object.keys(weights).length
                return (
                  <li
                    key={`${policy.name}-${policy.version}-${i}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/40 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{policy.name}</p>
                      <p className="text-xs text-muted-foreground">
                        v{policy.version} · {weightCount} weight(s)
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-cyan-400">
                      {formatTimestamp(policy.createdAt)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </GovernanceCard>
      </div>
    </div>
  )
}

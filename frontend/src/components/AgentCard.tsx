import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Row } from '@/components/Row'
import type { AgentRecord } from '@/lib/fleetTypes'
import type { AgentWorkload } from '@/lib/useFleetApi'
import { cn } from '@/lib/utils'

const AGENT_CATEGORIES: Record<string, string> = {
  'cto-principal-engineer': 'Leadership',
  'engineering-manager': 'Leadership',
  'product-marketing-manager': 'Leadership',
  architect: 'Leadership',
  'backend-lead': 'Engineering',
  'frontend-lead': 'Engineering',
  'data-engineer': 'Engineering',
  'security-engineer': 'Engineering',
  'junior-developer': 'Engineering',
  intern: 'Engineering',
  executor: 'Engineering',
  'staff-engineer-reviewer': 'Quality',
  'qa-test-engineer': 'Quality',
  reviewer: 'Quality',
  'devops-sre': 'Operations',
  recovery: 'Operations',
  'technical-writer': 'Documentation',
  retrospective: 'Documentation',
}

/**
 * Get agent category
 * @param agent - Agent record to categorize
 * @returns Category name (Leadership, Engineering, Quality, Operations, Documentation, or Other)
 */
function getAgentCategory(agent: AgentRecord): string {
  return AGENT_CATEGORIES[agent.definition.name] || 'Other'
}

/**
 * Renders a bar chart showing success rate percentage
 * @param rate - Success rate as decimal (0-1)
 */
function SuccessBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted overflow-hidden border border-border">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono tabular-nums">{pct}%</span>
    </div>
  )
}

/**
 * Renders a card container for displaying agent details, workload, and test controls
 * @param agent - Agent record to display
 * @param busy - Whether an operation is in progress
 * @param onTest - Callback when readiness is checked
 * @param workload - Optional workload metrics for the agent
 */
export function AgentCard({
  agent,
  busy,
  onTest,
  workload,
}: {
  agent: AgentRecord
  busy: boolean
  onTest: () => void
  workload?: AgentWorkload
}) {
  const enabledTools = Object.entries(agent.definition.tools ?? {})
    .filter(([, enabled]) => enabled)
    .map(([tool]) => tool)
    .join(', ')

  const [provider, modelName] = agent.definition.model.split('/')

  const circuitLabel = workload?.circuitState
  const circuitColor =
    workload?.circuitState === 'open'
      ? 'bg-destructive text-destructive-foreground'
      : workload?.circuitState === 'half-open'
        ? 'bg-secondary text-secondary-foreground'
        : undefined

  return (
    <Card className="border-border/60 bg-background/60 border-4">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">
              {agent.definition.description || agent.definition.name}
            </CardTitle>
            <CardDescription className="text-xs font-mono text-muted-foreground/70">
              @{agent.definition.name}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground shrink-0">
              {agent.definition.mode}
            </span>
            {circuitLabel && circuitColor && (
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-black uppercase tracking-widest',
                  circuitColor,
                )}
              >
                {circuitLabel.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {workload?.currentTask && (
          <div className="border-2 border-primary bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">RUNNING</p>
            <p className="text-xs font-bold truncate">{workload.currentTask.title}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {workload.currentTask.projectName ?? workload.currentTask.projectSlug}
            </p>
          </div>
        )}

        {workload && (
          <>
            <Row label="7D Success" value="" />
            <SuccessBar rate={workload.successRate7d} />

            {workload.medianLatencyMs > 0 && (
              <Row label="Latency" value={`${workload.medianLatencyMs}ms`} />
            )}

            {workload.queueDepth > 0 && <Row label="Queue" value={`${workload.queueDepth}`} />}
          </>
        )}

        <Row label="Provider" value={provider || 'default'} />
        <Row label="Model" value={modelName || agent.definition.model} />
        <Row label="Temp" value={agent.definition.temperature.toFixed(1)} />
        <Row label="Tools" value={enabledTools || 'none'} />

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={`/agents/${encodeURIComponent(agent.definition.name)}/edit`}>Edit</Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full" disabled={busy} onClick={onTest}>
            {busy ? 'Checking...' : 'Check Readiness'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { AGENT_CATEGORIES, getAgentCategory }

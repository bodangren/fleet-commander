import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Row } from '@/components/Row'
import type { AgentRecord } from '@/lib/fleetTypes'

export function AgentCard({
  agent,
  busy,
  onTest,
}: {
  agent: AgentRecord
  busy: boolean
  onTest: () => void
}) {
  const enabledTools = Object.entries(agent.definition.tools ?? {})
    .filter(([, enabled]) => enabled)
    .map(([tool]) => tool)
    .join(', ')

  const [provider, modelName] = agent.definition.model.split('/')

  return (
    <Card className="border-border/60 bg-background/60">
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
          <span className="rounded-full border border-border/60 px-2 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground shrink-0">
            {agent.definition.mode}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Provider" value={provider || 'default'} />
        <Row label="Model" value={modelName || agent.definition.model} />
        <Row label="Temp" value={agent.definition.temperature.toFixed(1)} />
        <Row label="Tools" value={enabledTools || 'none'} />
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={`/agents/${encodeURIComponent(agent.definition.name)}/edit`}>Edit</Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full" disabled={busy} onClick={onTest}>
            {busy ? 'Testing...' : 'Test Agent'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

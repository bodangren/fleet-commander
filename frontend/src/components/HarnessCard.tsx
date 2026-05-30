import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Row } from '@/components/Row'
import type { HarnessRecord } from '@/lib/fleetTypes'

/**
 * Card displaying harness definition, binary availability, and test button
 * @param harness - Harness record to display
 * @param busy - Whether discovery test is in progress
 * @param onTestDiscovery - Callback when Test Discovery button is clicked
 */
export function HarnessCard({
  harness,
  busy,
  onTestDiscovery,
}: {
  harness: HarnessRecord
  busy: boolean
  onTestDiscovery: () => void
}) {
  const statusLabel = harness.binaryFound ? 'available' : 'missing'
  const statusClasses = harness.binaryFound
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
    : 'border-red-500/30 bg-red-500/10 text-red-200'

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{harness.definition.name}</CardTitle>
            <CardDescription>{harness.definition.binary}</CardDescription>
          </div>
          <span
            className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.2em] ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Parse" value={harness.definition.discovery.parseStrategy} />
        <Row label="Command" value={harness.definition.discovery.command} />
        <Row label="Template" value={harness.definition.invocation.template} />
        <Row label="Layer" value={harness.layer} />
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to={`/harnesses/${encodeURIComponent(harness.definition.name)}/edit`}>Edit</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={onTestDiscovery}
          >
            {busy ? 'Testing...' : 'Test Discovery'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

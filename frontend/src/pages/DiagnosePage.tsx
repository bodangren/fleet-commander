import { useState } from 'react'
import { ReconcilePanel } from './Reconcile'
import { useReconciliationProposals, useAuditEvents } from '@/lib/useConvexData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

const auditTypeColors: Record<string, string> = {
  task: 'bg-blue-400/10 text-blue-300',
  run: 'bg-cyan-400/10 text-cyan-300',
  alert: 'bg-red-400/10 text-red-300',
  reconciliation: 'bg-amber-400/10 text-amber-300',
  pipeline: 'bg-purple-400/10 text-purple-300',
}

export function DiagnosePage() {
  const proposals = useReconciliationProposals(undefined, 50)
  const auditEvents = useAuditEvents(undefined, undefined, 100)
  const [filterType, setFilterType] = useState<string>('')

  const filteredEvents = filterType ? auditEvents?.filter(e => e.type === filterType) : auditEvents

  return (
    <section className="space-y-4" data-testid="diagnose-page">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="border-border/60 bg-background/60">
            <CardHeader>
              <CardTitle className="text-base">Reconcile</CardTitle>
              <CardDescription>Auto-detected issues with fix proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <ReconcilePanel proposals={proposals} loading={proposals === undefined} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/60 bg-background/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Audit Trail</CardTitle>
                <CardDescription>Recent system events</CardDescription>
              </div>
              <div className="flex gap-1">
                {['', 'run', 'alert', 'reconciliation', 'pipeline'].map(t => (
                  <Button
                    key={t || 'all'}
                    size="sm"
                    variant={filterType === t ? 'default' : 'ghost'}
                    onClick={() => setFilterType(t)}
                    className="h-7 text-xs"
                  >
                    {t || 'All'}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {auditEvents === undefined ? (
                <p className="text-sm text-muted-foreground">Loading audit events...</p>
              ) : filteredEvents?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events found</p>
              ) : (
                <ul className="max-h-96 space-y-2 overflow-auto">
                  {filteredEvents?.map(event => (
                    <li
                      key={event._id}
                      className="flex items-start gap-3 rounded-lg border border-border/30 bg-black/20 p-3"
                    >
                      <span
                        className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${auditTypeColors[event.type] ?? 'bg-gray-400/10 text-gray-300'}`}
                      >
                        {event.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{event.message}</p>
                        {event.agentName && (
                          <p className="text-xs text-muted-foreground">Agent: {event.agentName}</p>
                        )}
                        {event.severity && (
                          <p className="text-xs text-muted-foreground">
                            Severity: {event.severity}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTimestamp(event.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

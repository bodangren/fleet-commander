import type { RunContractDisplay } from '@/hooks/useRunContract'

interface RecoveryRowProps {
  contract: RunContractDisplay
  expanded: boolean
  onToggleExpand: () => void
}

const actionColors: Record<string, string> = {
  retry: 'text-blue-600',
  escalate: 'text-red-600',
  split: 'text-purple-600',
  replan: 'text-orange-600',
  human_review: 'text-red-600',
}

export function RecoveryRow({ contract, expanded, onToggleExpand }: RecoveryRowProps) {
  const recovery = contract.stages.recovery

  if (!recovery) {
    return (
      <div className="border-b border-border" data-stage="recovery">
        <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-700">
            !
          </span>
          <span className="font-medium">Recovery</span>
          <span className="text-sm">(none)</span>
        </div>
      </div>
    )
  }

  const actionColor = actionColors[recovery.action] ?? 'text-muted-foreground'

  return (
    <div className="border-b border-border" data-stage="recovery">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
        aria-expanded={expanded}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-700">
          !
        </span>
        <span className="font-medium">Recovery</span>
        <span className={`rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium ${actionColor}`}>
          {recovery.action.replace('_', ' ')}
        </span>
        <span className="ml-auto text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Action</h4>
            <p className="mt-1 text-sm capitalize">{recovery.action.replace('_', ' ')}</p>
          </div>

          <div className="mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Reason</h4>
            <p className="mt-1 text-sm">{recovery.reason}</p>
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Raw JSON
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs">
              {JSON.stringify(recovery, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

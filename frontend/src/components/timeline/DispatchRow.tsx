import type { RunContractDisplay } from '@/hooks/useRunContract'

interface DispatchRowProps {
  contract: RunContractDisplay
  expanded: boolean
  onToggleExpand: () => void
}

export function DispatchRow({ contract, expanded, onToggleExpand }: DispatchRowProps) {
  const rejectionCount = contract.dispatchRejections.length

  return (
    <div className="border-b border-border" data-stage="dispatch">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
        aria-expanded={expanded}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
          D
        </span>
        <span className="font-medium">Dispatch</span>
        <span className="ml-auto text-sm text-muted-foreground">
          {rejectionCount > 0 ? `${rejectionCount} rejections` : 'No rejections'}
        </span>
        <span className="text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {contract.dispatchRejections.length > 0 && (
            <div className="mb-3 rounded-md bg-muted p-3">
              <h4 className="text-sm font-medium text-muted-foreground">Rejection Reasons</h4>
              <ul className="mt-2 space-y-1">
                {contract.dispatchRejections.map((rejection, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      [{rejection.filter}]
                    </span>{' '}
                    <span>{rejection.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Raw JSON
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs">
              {JSON.stringify(contract.dispatchRejections, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

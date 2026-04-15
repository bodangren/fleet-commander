import type { RunContractDisplay } from '@/hooks/useRunContract'

interface ExecutorRowProps {
  contract: RunContractDisplay
  expanded: boolean
  onToggleExpand: () => void
}

export function ExecutorRow({ contract, expanded, onToggleExpand }: ExecutorRowProps) {
  const executor = contract.stages.executor

  if (!executor) {
    return (
      <div className="border-b border-border" data-stage="executor">
        <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
            E
          </span>
          <span className="font-medium">Executor</span>
          <span className="text-sm">(pending)</span>
        </div>
      </div>
    )
  }

  const statusColor = executor.status === 'succeeded' ? 'text-green-600' : 'text-red-600'

  return (
    <div className="border-b border-border" data-stage="executor">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
        aria-expanded={expanded}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
          E
        </span>
        <span className="font-medium">Executor</span>
        <span className={`text-sm ${statusColor}`}>{executor.status}</span>
        <span className="text-sm text-muted-foreground">{executor.changedFiles.length} files</span>
        {executor.testsRun.length > 0 && (
          <span className="text-sm text-muted-foreground">{executor.testsRun.length} tests</span>
        )}
        <span className="ml-auto text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="mb-3 grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Branch</h4>
              <p className="mt-1 font-mono text-sm">{executor.branch}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Commit</h4>
              <p className="mt-1 font-mono text-sm">{executor.commit.substring(0, 7)}</p>
            </div>
          </div>

          <div className="mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Changed Files</h4>
            <ul className="mt-1 list-disc list-inside text-sm">
              {executor.changedFiles.map((file, index) => (
                <li key={index} className="font-mono">
                  {file}
                </li>
              ))}
            </ul>
          </div>

          {executor.testsRun.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Tests Run</h4>
              <ul className="mt-1 list-disc list-inside text-sm">
                {executor.testsRun.map((test, index) => (
                  <li key={index} className="font-mono">
                    {test}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {executor.unresolvedAssumptions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Unresolved Assumptions</h4>
              <ul className="mt-1 list-disc list-inside text-sm text-amber-600">
                {executor.unresolvedAssumptions.map((assumption, index) => (
                  <li key={index}>{assumption}</li>
                ))}
              </ul>
            </div>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Raw JSON
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs">
              {JSON.stringify(executor, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

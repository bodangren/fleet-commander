import type { RunContractDisplay } from '@/hooks/useRunContract'

interface ArchitectRowProps {
  contract: RunContractDisplay
  expanded: boolean
  onToggleExpand: () => void
}

export function ArchitectRow({ contract, expanded, onToggleExpand }: ArchitectRowProps) {
  const architect = contract.stages.architect

  if (!architect) {
    return (
      <div className="border-b border-border" data-stage="architect">
        <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
            A
          </span>
          <span className="font-medium">Architect</span>
          <span className="text-sm">(pending)</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-border" data-stage="architect">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
        aria-expanded={expanded}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
          A
        </span>
        <span className="font-medium">Architect</span>
        <span className="text-sm text-muted-foreground">
          {architect.output.substring(0, 50)}
          {architect.output.length > 50 ? '...' : ''}
        </span>
        <span className="ml-auto text-sm text-green-600">
          {Math.round(architect.confidence * 100)}%
        </span>
        <span className="text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Design Output</h4>
            <p className="mt-1 text-sm">{architect.output}</p>
          </div>

          {architect.suggestedHarness && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Suggested Harness</h4>
              <p className="mt-1 text-sm font-mono">{architect.suggestedHarness}</p>
            </div>
          )}

          {architect.assumptions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Assumptions</h4>
              <ul className="mt-1 list-disc list-inside text-sm">
                {architect.assumptions.map((assumption, index) => (
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
              {JSON.stringify(architect, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

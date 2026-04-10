import type { GitStatus } from '@/lib/fleetTypes'

interface GitStatusBarProps {
  status: GitStatus | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
}

export function GitStatusBar({ status, loading, error, onRefresh }: GitStatusBarProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="animate-pulse">Checking git status...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <span>Git error: {error}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs underline hover:text-foreground"
            type="button"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>No project selected</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <GitBranchIcon />
        <span className="font-medium">{status.branch}</span>
      </div>

      {status.dirty ? (
        <div className="flex items-center gap-1 text-amber-500">
          <span title="Uncommitted changes">●</span>
          <span>Dirty</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-green-500">
          <span title="Clean">✓</span>
          <span>Clean</span>
        </div>
      )}

      {(status.ahead > 0 || status.behind > 0) && (
        <div className="flex items-center gap-1 text-muted-foreground">
          {status.ahead > 0 && (
            <span title={`${status.ahead} commits ahead`}>↑{status.ahead}</span>
          )}
          {status.behind > 0 && (
            <span title={`${status.behind} commits behind`}>↓{status.behind}</span>
          )}
        </div>
      )}

      {status.untracked > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground" title="Untracked files">
          <span>?{status.untracked}</span>
        </div>
      )}

      {status.modified > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground" title="Modified files">
          <span>~{status.modified}</span>
        </div>
      )}

      {status.staged > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground" title="Staged files">
          <span>+{status.staged}</span>
        </div>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          className="ml-1 text-xs text-muted-foreground underline hover:text-foreground"
          type="button"
        >
          Refresh
        </button>
      )}
    </div>
  )
}

function GitBranchIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="3" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 16V9M18 16v-2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4" />
    </svg>
  )
}

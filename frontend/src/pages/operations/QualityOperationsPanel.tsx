import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/toast'

interface FailedRun {
  runId: string
  projectSlug: string
  taskKey: string
  status: 'failed' | 'blocked' | 'exhausted'
  profileName: string
  profileVersion: number
  failedStageKind: string
  failedReason: string
  attemptCount: number
  createdAt: number
}

interface ConfirmDialogProps {
  title: string
  mode: 'reason' | 'profile-change'
  onConfirm: (value: string) => void
  onCancel: () => void
}

function ConfirmDialog({ title, mode, onConfirm, onCancel }: ConfirmDialogProps) {
  const [value, setValue] = useState('')
  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border/60 bg-background p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        {mode === 'profile-change' ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="confirm-profile">
              Profile
            </label>
            <select
              id="confirm-profile"
              className="w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground appearance-none focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
              value={value}
              onChange={e => setValue(e.target.value)}
            >
              <option value="">Select profile...</option>
              <option value="none">none</option>
              <option value="standard">standard</option>
              <option value="strict">strict</option>
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="confirm-reason">
              Reason
            </label>
            <input
              id="confirm-reason"
              type="text"
              className="w-full rounded-xl border border-border/60 bg-black/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter reason..."
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(value)}>Confirm</Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Operations panel for diagnosing and intervening on failed/blocked quality
 * runs. Shows failed-stage kind, reason, and authorized retry, disable, and
 * profile-change actions with confirmation dialogs and audit feedback.
 */
export function QualityOperationsPanel({ projectSlug }: { projectSlug?: string }) {
  const [runs, setRuns] = useState<FailedRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{
    type: 'retry' | 'disable' | 'change-profile'
    runId?: string
  } | null>(null)
  const { showToast } = useToast()

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/quality/runs?status=failed,blocked,exhausted')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Failed to load quality operations (${res.status})`)
      }
      setRuns((await res.json()) as FailedRun[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quality operations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRuns()
  }, [fetchRuns])

  const handleRetry = useCallback(
    async (runId: string, reason: string) => {
      const res = await fetch(`/api/quality/runs/${runId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        showToast('success', 'Retry queued')
        await fetchRuns()
      } else {
        showToast('error', 'Retry failed')
      }
    },
    [showToast, fetchRuns],
  )

  const handleDisable = useCallback(
    async (reason: string) => {
      const res = await fetch('/api/quality/profiles/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSlug: projectSlug ?? 'fleet-commander', reason }),
      })
      if (res.ok) {
        showToast('success', 'Profile disabled')
      } else {
        showToast('error', 'Disable failed')
      }
    },
    [showToast, projectSlug],
  )

  const handleChangeProfile = useCallback(
    async (profileName: string) => {
      const res = await fetch('/api/quality/projects/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSlug: projectSlug ?? 'fleet-commander', profileName }),
      })
      if (res.ok) {
        showToast('success', 'Profile changed')
      } else {
        showToast('error', 'Profile change failed')
      }
    },
    [showToast, projectSlug],
  )

  const handleConfirm = useCallback(
    async (reason: string) => {
      if (!dialog) return
      if (dialog.type === 'retry' && dialog.runId) {
        await handleRetry(dialog.runId, reason)
      } else if (dialog.type === 'disable') {
        await handleDisable(reason)
      } else if (dialog.type === 'change-profile') {
        await handleChangeProfile(reason)
      }
      setDialog(null)
    },
    [dialog, handleRetry, handleDisable, handleChangeProfile],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quality operations</h2>
        <p className="text-xs text-muted-foreground">Loading quality operations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quality operations</h2>
        <p className="text-xs text-red-200">Failed to load quality operations</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Quality operations</h2>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setDialog({ type: 'disable' })}>
          Disable profile
        </Button>
        <Button variant="outline" onClick={() => setDialog({ type: 'change-profile' })}>
          Change profile
        </Button>
      </div>

      <ol data-testid="quality-operations-runs" className="space-y-2">
        {runs.map(run => (
          <li
            key={run.runId}
            data-testid="quality-operations-run-row"
            className="flex items-start justify-between rounded-lg border border-border/60 p-3"
          >
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{run.taskKey}</span>
                <span className="text-xs text-muted-foreground">{run.failedStageKind}</span>
              </div>
              <p className="text-xs text-muted-foreground">{run.failedReason}</p>
            </div>
            <Button size="sm" onClick={() => setDialog({ type: 'retry', runId: run.runId })}>
              Retry
            </Button>
          </li>
        ))}
      </ol>

      {dialog && (
        <ConfirmDialog
          title={
            dialog.type === 'retry'
              ? 'Retry quality stage'
              : dialog.type === 'disable'
                ? 'Disable quality profile'
                : 'Change quality profile'
          }
          mode={dialog.type === 'change-profile' ? 'profile-change' : 'reason'}
          onConfirm={value => void handleConfirm(value)}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}

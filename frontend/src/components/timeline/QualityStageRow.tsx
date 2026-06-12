function formatDurationExplicit(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}m ${secs}s`
}

export type QualityStageStatus = 'passed' | 'failed' | 'skipped' | 'blocked' | 'running'
export type QualityStageRole = 'executor' | 'reviewer' | 'merger' | 'architect'

export interface QualityStageAttemptView {
  _id: string
  runId: string
  stageKind: string
  role: QualityStageRole
  attempt: number
  status: QualityStageStatus
  startedAt: number
  finishedAt: number
  durationMs: number
  costUSD: number
  tokens: number
  model: string
  evidence: Record<string, number> | undefined
  reason: string | undefined
}

interface QualityStageRowSingleProps {
  index: number
  attempt: QualityStageAttemptView
  attempts?: never
  stageKind?: never
}

interface QualityStageRowMultiProps {
  index: number
  stageKind: string
  attempts: QualityStageAttemptView[]
  attempt?: never
}

type QualityStageRowProps = QualityStageRowSingleProps | QualityStageRowMultiProps

function formatCost(costUSD: number): string {
  return `$${costUSD.toFixed(2)}`
}

/**
 * Timeline row component for a single quality stage attempt. Renders stage
 * kind, role attribution, attempt number, duration, cost, evidence summary,
 * and failure/skip feedback. Consumed by the TaskTimelinePage extension.
 */
function QualityStageAttemptRow({
  index,
  attempt,
}: {
  index: number
  attempt: QualityStageAttemptView
}) {
  return (
    <div
      data-testid={`quality-stage-row-${index}`}
      aria-status={attempt.status}
      className="flex items-start gap-3 text-sm"
    >
      <span className="text-muted-foreground">{index}.</span>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{attempt.stageKind}</span>
          <span className="text-xs text-muted-foreground">{attempt.role}</span>
          {attempt.attempt > 1 && (
            <span className="text-xs text-muted-foreground">attempt {attempt.attempt}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDurationExplicit(attempt.durationMs)}</span>
          <span>{formatCost(attempt.costUSD)}</span>
        </div>
        {attempt.evidence && Object.keys(attempt.evidence).length > 0 && (
          <div data-testid="quality-stage-evidence" className="flex flex-wrap gap-2 text-xs">
            {Object.entries(attempt.evidence).map(([key, value]) => (
              <span key={key} className="text-muted-foreground">
                {key}: {value}
              </span>
            ))}
          </div>
        )}
        {(attempt.status === 'skipped' ||
          attempt.status === 'failed' ||
          attempt.status === 'blocked') &&
          attempt.reason && <p className="text-xs text-muted-foreground">{attempt.reason}</p>}
      </div>
    </div>
  )
}

/**
 * Renders a quality stage row in the task timeline. Supports two modes:
 *
 * 1. Single attempt: pass `index` + `attempt` for a single-stage row.
 * 2. Multiple attempts: pass `index` + `stageKind` + `attempts[]` to render
 *    an attempts strip showing all attempts for the same stage.
 */
export function QualityStageRow(props: QualityStageRowProps) {
  const { index } = props

  if (props.attempts && props.attempts.length > 0) {
    return (
      <div data-testid={`quality-stage-row-${index}`} className="space-y-2">
        <span className="text-sm font-medium">{props.stageKind}</span>
        <ol data-testid="quality-stage-attempts-strip" className="flex gap-2">
          {props.attempts.map(a => (
            <li key={a._id} className="text-xs">
              <span aria-status={a.status}>
                {a.status === 'passed' ? '✓' : a.status === 'failed' ? '✗' : a.status}
              </span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (props.attempt) {
    return <QualityStageAttemptRow index={index} attempt={props.attempt} />
  }

  return null
}

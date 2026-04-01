import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AgentReviewResult, ReviewCheckResult, ReviewComment } from '@/lib/fleetTypes'
import { cn } from '@/lib/utils'

function statusBadge(status: string) {
  switch (status) {
    case 'passed':
    case 'pass':
      return {
        label: 'Passed',
        className: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
      }
    case 'failed':
      return { label: 'Failed', className: 'bg-rose-400/15 text-rose-200 border-rose-400/30' }
    case 'needs-changes':
      return {
        label: 'Needs Changes',
        className: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
      }
    case 'timeout':
      return { label: 'Timeout', className: 'bg-amber-400/15 text-amber-200 border-amber-400/30' }
    case 'skipped':
      return { label: 'Skipped', className: 'bg-slate-400/15 text-slate-300 border-slate-400/30' }
    default:
      return { label: status, className: 'bg-slate-400/15 text-slate-300 border-slate-400/30' }
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return 'text-rose-200 bg-rose-400/15 border-rose-400/30'
    case 'high':
      return 'text-orange-200 bg-orange-400/15 border-orange-400/30'
    case 'medium':
      return 'text-amber-200 bg-amber-400/15 border-amber-400/30'
    case 'low':
      return 'text-slate-200 bg-slate-400/15 border-slate-400/30'
    default:
      return 'text-slate-200 bg-slate-400/15 border-slate-400/30'
  }
}

function CheckResultCard({ result }: { result: ReviewCheckResult }) {
  const [expanded, setExpanded] = useState(false)
  const badge = statusBadge(result.status)
  const hasErrors = result.errors && result.errors.length > 0
  const hasWarnings = result.warnings && result.warnings.length > 0
  const hasOutput = result.output && result.output.length > 0

  return (
    <Card
      className={cn(
        'border-border/60 bg-background/60 transition-colors',
        result.status === 'failed' && 'border-rose-400/20 bg-rose-400/5',
        result.status === 'timeout' && 'border-amber-400/20 bg-amber-400/5',
        result.status === 'passed' && 'border-emerald-400/20 bg-emerald-400/5',
      )}
    >
      <CardHeader className="cursor-pointer space-y-2 p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium capitalize">{result.category}</CardTitle>
          <div className="flex items-center gap-2">
            {result.durationMs > 0 && (
              <span className="text-xs text-muted-foreground">{result.durationMs}ms</span>
            )}
            <span
              className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', badge.className)}
            >
              {badge.label}
            </span>
          </div>
        </div>
        {(hasErrors || hasWarnings) && (
          <CardDescription className="text-xs">
            {hasErrors && `${result.errors!.length} error${result.errors!.length > 1 ? 's' : ''}`}
            {hasErrors && hasWarnings && ' · '}
            {hasWarnings &&
              `${result.warnings!.length} warning${result.warnings!.length > 1 ? 's' : ''}`}
          </CardDescription>
        )}
      </CardHeader>
      {expanded && (hasErrors || hasWarnings || hasOutput) && (
        <CardContent className="space-y-3 p-4 pt-0">
          {hasErrors && (
            <div>
              <p className="mb-1 text-xs font-medium text-rose-200">Errors</p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 font-mono text-xs text-rose-100 whitespace-pre-wrap break-words">
                {result.errors!.join('\n')}
              </pre>
            </div>
          )}
          {hasWarnings && (
            <div>
              <p className="mb-1 text-xs font-medium text-amber-200">Warnings</p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 font-mono text-xs text-amber-100 whitespace-pre-wrap break-words">
                {result.warnings!.join('\n')}
              </pre>
            </div>
          )}
          {hasOutput && !hasErrors && !hasWarnings && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Output</p>
              <pre className="max-h-48 overflow-auto rounded-xl border border-border/60 bg-black/40 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap break-words">
                {result.output}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function AgentReviewComment({ comment }: { comment: ReviewComment }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm text-foreground">{comment.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {comment.file}
            {comment.line > 0 ? `:${comment.line}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
            severityColor(comment.severity),
          )}
        >
          {comment.severity}
        </span>
      </div>
    </div>
  )
}

function AgentReviewCard({ review }: { review: AgentReviewResult }) {
  const badge = statusBadge(review.status)

  return (
    <Card
      className={cn(
        'border-border/60 bg-background/60',
        review.status === 'needs-changes' && 'border-amber-400/20 bg-amber-400/5',
        review.status === 'pass' && 'border-emerald-400/20 bg-emerald-400/5',
      )}
    >
      <CardHeader className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">Agent Review</CardTitle>
          <div className="flex items-center gap-2">
            {review.depth && (
              <span className="text-xs text-muted-foreground capitalize">{review.depth}</span>
            )}
            <span
              className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', badge.className)}
            >
              {badge.label}
            </span>
          </div>
        </div>
        {review.comments.length > 0 && (
          <CardDescription className="text-xs">
            {review.comments.length} issue{review.comments.length > 1 ? 's' : ''} found
          </CardDescription>
        )}
      </CardHeader>
      {review.comments.length > 0 && (
        <CardContent className="space-y-2 p-4 pt-0">
          {review.comments.map((comment, i) => (
            <AgentReviewComment key={i} comment={comment} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

type ReviewResultsProps = {
  results: ReviewCheckResult[]
  overallStatus: string
  reviewedAt?: string
  agentReview?: AgentReviewResult
  reviewDepth?: string
}

export function ReviewResults({
  results,
  overallStatus,
  reviewedAt,
  agentReview,
  reviewDepth,
}: ReviewResultsProps) {
  const overallBadge = statusBadge(overallStatus)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Review Results</h3>
        <div className="flex items-center gap-2">
          {reviewedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(reviewedAt).toLocaleString()}
            </span>
          )}
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium',
              overallBadge.className,
            )}
          >
            {overallBadge.label}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {agentReview && <AgentReviewCard review={agentReview} />}
        {results.map((result, index) => (
          <CheckResultCard key={`${result.category}-${index}`} result={result} />
        ))}
        {results.length === 0 && !agentReview && (
          <p className="text-sm text-muted-foreground">No review results yet.</p>
        )}
      </div>
    </div>
  )
}

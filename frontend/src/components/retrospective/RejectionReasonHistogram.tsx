export interface RejectionReasonHistogramProps {
  reasons: Array<{ reason: string; count: number }>
}

/**
 * Renders rejection reasons as a horizontal bar chart
 */
export function RejectionReasonHistogram({ reasons }: RejectionReasonHistogramProps) {
  if (reasons.length === 0) {
    return (
      <div className="space-y-4">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Rejection Reasons
        </span>
        <div className="py-8 text-center text-muted-foreground text-sm">No rejections recorded</div>
      </div>
    )
  }

  const maxCount = Math.max(...reasons.map(r => r.count), 1)

  return (
    <div className="space-y-4">
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        Rejection Reasons
      </span>
      <div className="space-y-2">
        {reasons.map((item, i) => (
          <div key={i} className="space-y-1" data-testid={`rejection-reason-${i}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate flex-1 mr-2" title={item.reason}>
                {item.reason}
              </span>
              <span className="tabular-nums font-bold text-xs">{item.count}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

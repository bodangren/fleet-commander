import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface CoverageDiffProps {
  before: number
  after: number
}

export function CoverageDiff({ before, after }: CoverageDiffProps) {
  const delta = after - before
  const deltaFormatted = delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`
  const isPositive = delta > 0
  const isNegative = delta < 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Before:</span>
        <span className="font-medium">{before.toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">After:</span>
        <span className="font-medium">{after.toFixed(1)}%</span>
      </div>
      <div
        data-testid="coverage-delta"
        className={`flex items-center gap-1 font-medium ${
          isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-muted-foreground'
        }`}
      >
        {isPositive ? (
          <TrendingUp size={16} />
        ) : isNegative ? (
          <TrendingDown size={16} />
        ) : (
          <Minus size={16} />
        )}
        <span>{deltaFormatted}</span>
      </div>
    </div>
  )
}

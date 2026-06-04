const COLORS = {
  danger: '#eb3d54',
  warning: '#eab308',
  textPrimary: '#f7f8f8',
  textMuted: '#8a8f98',
}

/**
 * Banner displayed on sprint dashboard when budget burn forecast indicates risk.
 * Red when projected spend exceeds budget with high confidence, yellow for moderate risk.
 * @param atRisk - Whether the sprint is at risk
 * @param confidence - Forecast confidence (0-1)
 * @param projectedExhaustionMs - Projected exhaustion timestamp (ms) or null
 * @param remainingBudget - Remaining budget in USD
 */
export function AtRiskBanner({
  atRisk,
  confidence,
  projectedExhaustionMs,
  remainingBudget,
}: {
  atRisk: boolean
  confidence: number
  projectedExhaustionMs: number | null
  remainingBudget: number
}) {
  if (!atRisk) return null
  if (confidence <= 0.7 && remainingBudget > 0) return null

  const isHighRisk = confidence > 0.7 || remainingBudget <= 0
  const color = isHighRisk ? COLORS.danger : COLORS.warning
  const bgAlpha = isHighRisk ? '0.12' : '0.10'

  const now = Date.now()
  const hoursLeft =
    projectedExhaustionMs && projectedExhaustionMs > now
      ? Math.round((projectedExhaustionMs - now) / (1000 * 60 * 60))
      : null

  const message =
    remainingBudget <= 0
      ? `Budget exceeded by $${Math.abs(remainingBudget).toFixed(2)}`
      : hoursLeft !== null
        ? `Budget projected to exhaust in ~${hoursLeft}h at current burn rate`
        : 'Budget burn rate exceeds remaining allocation'

  return (
    <div
      data-testid="at-risk-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 8,
        border: `1px solid ${color}40`,
        background: `rgba(${isHighRisk ? '235,61,84' : '234,179,8'},${bgAlpha})`,
        marginBottom: 16,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: color,
          color: COLORS.textPrimary,
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        !
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>
          {isHighRisk ? 'High Budget Risk' : 'Budget Warning'}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{message}</div>
      </div>
      <span
        style={{
          fontSize: 11,
          color: COLORS.textMuted,
          whiteSpace: 'nowrap',
        }}
      >
        {Math.round(confidence * 100)}% confidence
      </span>
    </div>
  )
}

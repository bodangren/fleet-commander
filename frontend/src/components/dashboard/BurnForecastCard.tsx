import { DASHBOARD_COLORS as COLORS, formatCurrency, formatDuration } from '@/lib/dashboard'

export interface BurnForecastData {
  burnRatePerHour: number
  projectedExhaustionMs: number | null
  remainingBudget: number
  confidence: number
  dataPoints: number
  atRisk: boolean
  sprintBudget: number
  currentSpend: number
}

/**
 * Card displaying budget burn forecast with burn rate, time remaining, and confidence bar.
 * @param forecast - Burn forecast data from the backend
 * @param forecast.burnRatePerHour - Current burn rate in USD per hour
 * @param forecast.projectedExhaustionMs - Projected exhaustion timestamp (ms) or null
 * @param forecast.remainingBudget - Remaining budget in USD
 * @param forecast.confidence - Forecast confidence (0-1)
 * @param forecast.dataPoints - Number of completed tasks used for forecast
 * @param forecast.atRisk - Whether the sprint is at risk of exceeding budget
 * @param forecast.sprintBudget - Total sprint budget
 * @param forecast.currentSpend - Current total spend
 */
export function BurnForecastCard({ forecast }: { forecast: BurnForecastData }) {
  const now = Date.now()
  const hoursRemaining =
    forecast.projectedExhaustionMs && forecast.projectedExhaustionMs > now
      ? (forecast.projectedExhaustionMs - now) / (1000 * 60 * 60)
      : null

  const confidencePercent = Math.round(forecast.confidence * 100)
  const spendPercent =
    forecast.sprintBudget > 0
      ? Math.round((forecast.currentSpend / forecast.sprintBudget) * 100)
      : 0

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.cardBg,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
          Budget Burn Forecast
        </h3>
        {forecast.atRisk && (
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              background: 'rgba(235,61,84,0.15)',
              color: COLORS.danger,
            }}
          >
            At Risk
          </span>
        )}
      </div>

      {/* Burn rate and time remaining */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: COLORS.cardInner, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Burn Rate</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary }}>
            {formatCurrency(forecast.burnRatePerHour)}
            <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 400 }}>/hr</span>
          </div>
        </div>
        <div style={{ background: COLORS.cardInner, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
            Time Remaining
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color:
                hoursRemaining !== null && hoursRemaining < 24
                  ? COLORS.warning
                  : COLORS.textPrimary,
            }}
          >
            {hoursRemaining !== null ? formatDuration(hoursRemaining) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Budget utilization bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            height: 4,
            background: COLORS.cardInner,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(spendPercent, 100)}%`,
              background:
                spendPercent > 80
                  ? COLORS.danger
                  : spendPercent > 60
                    ? COLORS.warning
                    : COLORS.success,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: COLORS.textMuted,
            marginTop: 4,
          }}
        >
          <span>{spendPercent}% spent</span>
          <span>{formatCurrency(forecast.remainingBudget)} remaining</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: COLORS.textMuted,
            marginBottom: 4,
          }}
        >
          <span>Forecast Confidence</span>
          <span>{confidencePercent}%</span>
        </div>
        <div
          style={{
            height: 3,
            background: COLORS.cardInner,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${confidencePercent}%`,
              background: COLORS.accent,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 4 }}>
          Based on {forecast.dataPoints} completed {forecast.dataPoints === 1 ? 'task' : 'tasks'}
        </div>
      </div>
    </div>
  )
}

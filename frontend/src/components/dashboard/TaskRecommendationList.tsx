import { DASHBOARD_COLORS as COLORS, formatCurrency } from '@/lib/dashboard'

export interface TaskRecommendation {
  taskId: string
  title: string
  costEstimate: number
  storyPoints: number
  action: 'keep' | 'drop'
  savingsEstimate: number
  reason: string
}

/**
 * List of task recommendations showing which Ready tasks to keep or drop
 * to fit remaining budget. Each item shows the task title, cost, story points, and reason.
 * @param recommendations - Array of task recommendations from the backend
 * @param recommendations[].taskId - Unique task identifier
 * @param recommendations[].title - Task title
 * @param recommendations[].costEstimate - Estimated cost in USD
 * @param recommendations[].storyPoints - Story points for the task
 * @param recommendations[].recommendations[].action - Recommended action: keep or drop
 * @param recommendations[].savingsEstimate - Estimated savings if dropped
 * @param recommendations[].reason - Explanation for the recommendation
 */
export function TaskRecommendationList({
  recommendations,
}: {
  recommendations: TaskRecommendation[]
}) {
  if (recommendations.length === 0) return null

  const totalSavings = recommendations
    .filter(r => r.action === 'drop')
    .reduce((sum, r) => sum + r.savingsEstimate, 0)

  const keepCount = recommendations.filter(r => r.action === 'keep').length
  const dropCount = recommendations.filter(r => r.action === 'drop').length

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
          Task Recommendations
        </h3>
        {totalSavings > 0 && (
          <span
            style={{
              fontSize: 12,
              color: COLORS.success,
              fontWeight: 500,
            }}
          >
            Save {formatCurrency(totalSavings)}
          </span>
        )}
      </div>

      {/* Summary */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          fontSize: 12,
          color: COLORS.textMuted,
        }}
      >
        <span>
          <span style={{ color: COLORS.success, fontWeight: 600 }}>{keepCount}</span> keep
        </span>
        {dropCount > 0 && (
          <span>
            <span style={{ color: COLORS.danger, fontWeight: 600 }}>{dropCount}</span> drop
          </span>
        )}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recommendations.map(rec => (
          <div
            key={rec.taskId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: COLORS.cardInner,
              borderLeft: `3px solid ${
                rec.action === 'keep'
                  ? COLORS.success
                  : rec.action === 'drop'
                    ? COLORS.danger
                    : COLORS.warning
              }`,
            }}
          >
            {/* Action badge */}
            <span
              style={{
                display: 'inline-flex',
                padding: '1px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                background:
                  rec.action === 'keep'
                    ? 'rgba(39,166,68,0.15)'
                    : rec.action === 'drop'
                      ? 'rgba(235,61,84,0.15)'
                      : 'rgba(234,179,8,0.15)',
                color:
                  rec.action === 'keep'
                    ? COLORS.success
                    : rec.action === 'drop'
                      ? COLORS.danger
                      : COLORS.warning,
                flexShrink: 0,
              }}
            >
              {rec.action}
            </span>

            {/* Task info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: COLORS.textPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {rec.title}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                {rec.storyPoints} pts &middot; {formatCurrency(rec.costEstimate)}
              </div>
            </div>

            {/* Savings */}
            {rec.savingsEstimate > 0 && (
              <span
                style={{
                  fontSize: 12,
                  color: COLORS.success,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                +{formatCurrency(rec.savingsEstimate)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Reason footer */}
      {dropCount > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 6,
            background: 'rgba(94,106,210,0.08)',
            fontSize: 11,
            color: COLORS.textMuted,
          }}
        >
          Tasks ranked by story points per dollar. Drop low-value tasks to stay within budget.
        </div>
      )}
    </div>
  )
}

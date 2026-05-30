const COLORS = {
  cardBg: '#0f1011',
  border: '#23252a',
  textPrimary: '#f7f8f8',
  textMuted: '#8a8f98',
  danger: '#eb3d54',
  warning: '#eab308',
  accent: '#5e6ad2',
}

/**
 * Format time ago
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time string
 */
function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/**
 * Format currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., $1.23)
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export interface AttentionNeededAlert {
  _id: string
  type: string
  severity: string
  message: string
  createdAt: number
}

export interface AttentionNeededTask {
  _id: string
  title: string
}

export interface AttentionNeededSprint {
  budget: number
  actualCost: number
  taskCount: number
  completedCount: number
}

/**
 * Dashboard widget showing blocked tasks, budget alerts, and system warnings
 * @param alerts - Array of alert objects
 * @param blockedTasks - Array of blocked task objects
 * @param sprint - Optional sprint with budget information
 */
export function AttentionNeeded({
  alerts,
  blockedTasks,
  sprint,
}: {
  alerts: AttentionNeededAlert[]
  blockedTasks: AttentionNeededTask[]
  sprint: AttentionNeededSprint | null
}) {
  const budgetPercent =
    sprint && sprint.budget > 0 ? Math.round((sprint.actualCost / sprint.budget) * 100) : 0

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.cardBg,
        padding: 24,
      }}
    >
      <h3
        style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 16px 0' }}
      >
        Attention Needed
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blockedTasks.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(235,61,84,0.08)',
              border: '1px solid rgba(235,61,84,0.2)',
            }}
          >
            <div style={{ fontSize: 16 }}>⊘</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                {blockedTasks.length} task{blockedTasks.length > 1 ? 's' : ''} blocked
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                {blockedTasks.map(t => t.title).join(', ')}
              </div>
            </div>
          </div>
        )}

        {sprint && budgetPercent > 60 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(234,179,8,0.08)',
              border: '1px solid rgba(234,179,8,0.2)',
            }}
          >
            <div style={{ fontSize: 16 }}>!</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                Budget at {budgetPercent}%
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                {formatCurrency(sprint.budget - sprint.actualCost)} remaining ·{' '}
                {sprint.taskCount - sprint.completedCount} tasks left
              </div>
            </div>
          </div>
        )}

        {alerts.map(alert => {
          const alertColor =
            alert.severity === 'critical'
              ? COLORS.danger
              : alert.severity === 'warning'
                ? COLORS.warning
                : COLORS.accent
          return (
            <div
              key={alert._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 8,
                background: `${alertColor}14`,
                border: `1px solid ${alertColor}33`,
              }}
            >
              <div style={{ fontSize: 16 }}>
                {alert.severity === 'critical' ? '⊘' : alert.severity === 'warning' ? '!' : '◎'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                  {alert.message}
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                  {alert.type} · {formatTimeAgo(alert.createdAt)}
                </div>
              </div>
            </div>
          )
        })}

        {blockedTasks.length === 0 && (!sprint || budgetPercent <= 60) && alerts.length === 0 && (
          <div
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              padding: 12,
              textAlign: 'center',
            }}
          >
            All clear — no attention items
          </div>
        )}
      </div>
    </div>
  )
}

import { calculateBudgetPercent } from '@/lib/dashboard'

const COLORS = {
  cardBg: '#0f1011',
  border: '#23252a',
  cardInner: '#141516',
  textPrimary: '#f7f8f8',
  textMuted: '#8a8f98',
  textDim: '#62666d',
  accent: '#5e6ad2',
  success: '#27a644',
  warning: '#eab308',
  danger: '#eb3d54',
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export interface SprintStatusSprint {
  name: string
  status: string
  budget: number
  actualCost: number
  pointsDelivered: number
  taskCount: number
  completedCount: number
}

export function SprintStatus({ sprint }: { sprint: SprintStatusSprint | null }) {
  if (!sprint) {
    return (
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.cardBg,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
          No Active Sprint
        </h2>
      </div>
    )
  }

  const budgetPercent = sprint.budget > 0 ? Math.round((sprint.actualCost / sprint.budget) * 100) : 0

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.cardBg,
        padding: 24,
        marginBottom: 20,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
            {sprint.name}
          </h2>
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              background: 'rgba(94,106,210,0.15)',
              color: COLORS.accent,
              textTransform: 'capitalize',
            }}
          >
            {sprint.status}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>Budget</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            <span style={{ color: COLORS.success }}>{formatCurrency(sprint.actualCost)}</span>
            <span style={{ color: COLORS.textDim, fontSize: 16, fontWeight: 400 }}>
              {' '}
              / {formatCurrency(sprint.budget)}
            </span>
          </div>
        </div>
      </div>

      {/* Budget progress bar */}
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
              width: `${Math.min(budgetPercent, 100)}%`,
              background:
                budgetPercent > 80 ? COLORS.danger : budgetPercent > 60 ? COLORS.warning : COLORS.success,
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
          <span>{budgetPercent}% spent</span>
          <span>{formatCurrency(sprint.budget - sprint.actualCost)} remaining</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={{ background: COLORS.cardInner, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Points Delivered</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary }}>
            {sprint.pointsDelivered}{' '}
            <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 400 }}>/ {sprint.taskCount}</span>
          </div>
        </div>
        <div style={{ background: COLORS.cardInner, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Cost/Point</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.success }}>
            {sprint.pointsDelivered > 0
              ? formatCurrency(sprint.actualCost / sprint.pointsDelivered)
              : '$0.00'}
          </div>
        </div>
        <div style={{ background: COLORS.cardInner, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Tasks Complete</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary }}>
            {sprint.completedCount}{' '}
            <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 400 }}>/ {sprint.taskCount}</span>
          </div>
        </div>
        <div style={{ background: COLORS.cardInner, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Budget Remaining</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.textPrimary }}>
            {formatCurrency(sprint.budget - sprint.actualCost)}
          </div>
        </div>
      </div>
    </div>
  )
}

import { formatDuration } from '@/lib/formatDuration'

const COLORS = {
  cardBg: '#0f1011',
  border: '#23252a',
  cardInner: '#141516',
  textPrimary: '#f7f8f8',
  textMuted: '#8a8f98',
  success: '#27a644',
  warning: '#eab308',
}

export interface KeyMetricsData {
  deliveryRate: number
  successRate: number
  avgPipelineTime: number
  rejectionRate: number
}

/**
 * Renders a metric display
 * @param metrics - Key metrics data object
 */
export function KeyMetrics({ metrics }: { metrics: KeyMetricsData }) {
  const items = [
    {
      label: 'Delivery Rate',
      desc: 'Points per dollar',
      value: metrics.deliveryRate.toFixed(2),
      color: COLORS.success,
    },
    {
      label: 'Success Rate',
      desc: 'First-pass completion',
      value: `${metrics.successRate.toFixed(0)}%`,
      color: metrics.successRate >= 80 ? COLORS.success : COLORS.warning,
    },
    {
      label: 'Avg Pipeline Time',
      desc: 'Dispatch to merge',
      value: formatDuration(metrics.avgPipelineTime),
      color: null,
    },
    {
      label: 'Rejection Rate',
      desc: 'Tasks sent back',
      value: `${metrics.rejectionRate.toFixed(0)}%`,
      color: metrics.rejectionRate <= 10 ? COLORS.success : COLORS.warning,
    },
  ]

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
        Key Metrics
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(metric => (
          <div
            key={metric.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: COLORS.cardInner,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>
                {metric.label}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{metric.desc}</div>
            </div>
            <div
              style={{ fontSize: 18, fontWeight: 600, color: metric.color ?? COLORS.textPrimary }}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

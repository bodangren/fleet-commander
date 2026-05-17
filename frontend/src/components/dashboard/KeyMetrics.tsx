import type { MockKeyMetrics } from '@/__fixtures__/dashboardFixtures'

import { formatPipelineTime } from '@/lib/metrics'

function formatDeliveryRate(rate: number): string {
  return `${rate.toFixed(2)} pts/$`
}

function formatPercent(value: number): string {
  return `${value}%`
}

interface MetricCardProps {
  label: string
  value: string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black tabular-nums">{value}</span>
      </div>
    </div>
  )
}

export function KeyMetrics({ metrics }: { metrics: MockKeyMetrics }) {
  return (
    <div className="border-2 border-border bg-card p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Delivery Rate" value={formatDeliveryRate(metrics.deliveryRate)} />
        <MetricCard label="Success Rate" value={formatPercent(metrics.successRate)} />
        <MetricCard label="Pipeline Time" value={formatPipelineTime(metrics.pipelineTime)} />
        <MetricCard label="Rejection Rate" value={formatPercent(metrics.rejectionRate)} />
      </div>
    </div>
  )
}

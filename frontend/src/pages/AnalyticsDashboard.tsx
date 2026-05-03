import { useState } from 'react'
import { CompletionTrendChart } from '@/components/analytics/CompletionTrendChart'
import { AgentHeatmap } from '@/components/analytics/AgentHeatmap'
import { BottleneckChart } from '@/components/analytics/BottleneckChart'
import { QueueDepthChart } from '@/components/analytics/QueueDepthChart'
import { TimeRangeSelector } from '@/components/analytics/TimeRangeSelector'

export function AnalyticsDashboard() {
  const [days, setDays] = useState(30)

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Execution patterns, agent utilization, and system bottlenecks
          </p>
        </div>
        <TimeRangeSelector value={days} onChange={setDays} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompletionTrendChart days={days} />
        <QueueDepthChart days={days} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BottleneckChart days={days} />
        <AgentHeatmap days={days} />
      </div>
    </section>
  )
}

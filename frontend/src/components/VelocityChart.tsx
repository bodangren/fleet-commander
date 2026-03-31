import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DailyVelocity {
  date: string
  count: number
}

export function VelocityChart() {
  const [velocity, setVelocity] = useState<DailyVelocity[]>([])

  useEffect(() => {
    fetch('/api/stats/velocity?days=30')
      .then(r => r.json())
      .then(data => setVelocity(data.velocity ?? []))
      .catch(() => {})
  }, [])

  if (velocity.length === 0) return null

  const maxCount = Math.max(...velocity.map(v => v.count), 1)

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Task Velocity</CardTitle>
        <CardDescription>Completed tasks per day (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32">
          {velocity.map(v => (
            <div key={v.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary/80 rounded-t transition-all min-h-[2px]"
                style={{ height: `${(v.count / maxCount) * 100}%` }}
                title={`${v.date}: ${v.count} tasks`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{velocity[0]?.date}</span>
          <span>{velocity[velocity.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  )
}

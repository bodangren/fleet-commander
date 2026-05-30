import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

interface DailyVelocity {
  date: string
  count: number
}

/**
 * Velocity bar chart component
 */
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
    <Card className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)]">
      <CardHeader className="p-6 border-b-2 border-border bg-muted/20">
        <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none">
          PULSE_VELOCITY
        </h3>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">
          Completed tasks / 30D
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-end gap-1 h-32">
          {velocity.map(v => (
            <div key={v.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-secondary border-t-2 border-primary transition-all min-h-[4px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                style={{ height: `${(v.count / maxCount) * 100}%` }}
                title={`${v.date}: ${v.count} tasks`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4 italic">
          <span>{velocity[0]?.date}</span>
          <span>{velocity[velocity.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  )
}

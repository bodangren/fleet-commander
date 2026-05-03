import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TimeRangeSelectorProps {
  value: number
  onChange: (days: number) => void
  className?: string
}

const presets = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {presets.map(preset => (
        <Button
          key={preset.days}
          variant={value === preset.days ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(preset.days)}
          className="px-3 py-1 text-xs"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}

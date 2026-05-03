import { useState } from 'react'
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
  const [customOpen, setCustomOpen] = useState(false)
  const [customDays, setCustomDays] = useState('')

  const isPreset = presets.some(p => p.days === value)

  const handleCustomSubmit = () => {
    const n = parseInt(customDays, 10)
    if (n > 0 && n <= 365) {
      onChange(n)
      setCustomOpen(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {presets.map(preset => (
        <Button
          key={preset.days}
          variant={value === preset.days ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            onChange(preset.days)
            setCustomOpen(false)
          }}
          className="px-3 py-1 text-xs"
        >
          {preset.label}
        </Button>
      ))}
      <Button
        variant={!isPreset ? 'default' : 'outline'}
        size="sm"
        onClick={() => setCustomOpen(!customOpen)}
        className="px-3 py-1 text-xs"
      >
        {!isPreset ? `${value}D` : 'Custom'}
      </Button>
      {customOpen && (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="number"
            min={1}
            max={365}
            value={customDays}
            onChange={e => setCustomDays(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
            placeholder="Days"
            className="h-7 w-16 rounded border border-input bg-background px-2 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleCustomSubmit}
            className="h-7 px-2 text-xs"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}

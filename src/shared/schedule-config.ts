export type ScheduleMode = 'one-time' | 'interval' | 'loop'

export type TimeUnit = 'seconds' | 'minutes' | 'hours'

export interface TimeValue {
  value: number
  unit: TimeUnit
}

export interface ScheduleConfig {
  mode: ScheduleMode
  delay?: TimeValue
  interval?: TimeValue
}

export type ScheduleState = 'pending' | 'running' | 'paused' | 'completed' | 'cancelled'

const SCHEDULE_TAG_RE = /^#schedule:([a-z-]+)(?:,([a-z]+:)?(\d+)([smh]))?$/

const UNIT_MAP: Record<string, TimeUnit> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
}

const UNIT_TO_CHAR: Record<TimeUnit, string> = {
  seconds: 's',
  minutes: 'm',
  hours: 'h',
}

export function parseScheduleTag(tag: string): ScheduleConfig | null {
  const match = tag.match(SCHEDULE_TAG_RE)
  if (!match) {
    return null
  }

  const [, modeStr, keyWithColon, valueStr, unitChar] = match
  const mode = modeStr as ScheduleMode

  if (mode !== 'one-time' && mode !== 'interval' && mode !== 'loop') {
    return null
  }

  if (valueStr && unitChar) {
    const value = parseInt(valueStr, 10)
    const unit = UNIT_MAP[unitChar]
    if (!unit || isNaN(value)) {
      return null
    }

    const key = keyWithColon ? keyWithColon.replace(/:$/, '') : undefined
    if (key === 'delay') {
      return { mode, delay: { value, unit } }
    }
    return { mode, interval: { value, unit } }
  }

  return { mode }
}

export function formatScheduleTag(config: ScheduleConfig): string {
  const { mode, delay, interval } = config
  if (delay) {
    return `#schedule:${mode},delay:${delay.value}${UNIT_TO_CHAR[delay.unit]}`
  }
  if (interval) {
    return `#schedule:${mode},${interval.value}${UNIT_TO_CHAR[interval.unit]}`
  }
  return `#schedule:${mode}`
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateScheduleConfig(config: unknown): ValidationResult {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Config must be an object' }
  }

  const cfg = config as Partial<ScheduleConfig>

  if (cfg.mode !== 'one-time' && cfg.mode !== 'interval' && cfg.mode !== 'loop') {
    return { valid: false, error: 'Invalid schedule mode' }
  }

  const validateTimeValue = (tv: unknown): ValidationResult => {
    if (!tv || typeof tv !== 'object') {
      return { valid: false, error: 'Time value required' }
    }
    const t = tv as Partial<TimeValue>
    if (typeof t.value !== 'number' || t.value <= 0) {
      return { valid: false, error: 'Time value must be a positive number' }
    }
    if (t.unit !== 'seconds' && t.unit !== 'minutes' && t.unit !== 'hours') {
      return { valid: false, error: 'Invalid time unit' }
    }
    return { valid: true }
  }

  if (cfg.mode === 'one-time') {
    if (cfg.delay) {
      const result = validateTimeValue(cfg.delay)
      if (!result.valid) return result
    }
    return { valid: true }
  }

  if (cfg.mode === 'interval') {
    if (!cfg.interval) {
      return { valid: false, error: 'Interval schedule requires interval value' }
    }
    return validateTimeValue(cfg.interval)
  }

  if (cfg.mode === 'loop') {
    if (!cfg.delay) {
      return { valid: false, error: 'Loop schedule requires delay value' }
    }
    return validateTimeValue(cfg.delay)
  }

  return { valid: true }
}

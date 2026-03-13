import { describe, it, expect } from 'vitest'
import {
  ScheduleMode,
  ScheduleConfig,
  ScheduleState,
  parseScheduleTag,
  formatScheduleTag,
  validateScheduleConfig,
} from '../shared/schedule-config'

describe('schedule-config', () => {
  describe('parseScheduleTag', () => {
    it('parses one-time schedule with delay', () => {
      const result = parseScheduleTag('#schedule:one-time,delay:5m')
      expect(result).toEqual({
        mode: 'one-time',
        delay: { value: 5, unit: 'minutes' },
      })
    })

    it('parses one-time schedule without delay (immediate)', () => {
      const result = parseScheduleTag('#schedule:one-time')
      expect(result).toEqual({
        mode: 'one-time',
      })
    })

    it('parses interval schedule with value and unit', () => {
      const result = parseScheduleTag('#schedule:interval,30s')
      expect(result).toEqual({
        mode: 'interval',
        interval: { value: 30, unit: 'seconds' },
      })
    })

    it('parses loop schedule with delay', () => {
      const result = parseScheduleTag('#schedule:loop,delay:1h')
      expect(result).toEqual({
        mode: 'loop',
        delay: { value: 1, unit: 'hours' },
      })
    })

    it('returns null for invalid schedule tag', () => {
      expect(parseScheduleTag('#schedule:')).toBeNull()
      expect(parseScheduleTag('#schedule:invalid-mode')).toBeNull()
      expect(parseScheduleTag('not-a-schedule')).toBeNull()
    })
  })

  describe('formatScheduleTag', () => {
    it('formats one-time schedule with delay', () => {
      const config: ScheduleConfig = {
        mode: 'one-time',
        delay: { value: 5, unit: 'minutes' },
      }
      expect(formatScheduleTag(config)).toBe('#schedule:one-time,delay:5m')
    })

    it('formats one-time schedule without delay', () => {
      const config: ScheduleConfig = { mode: 'one-time' }
      expect(formatScheduleTag(config)).toBe('#schedule:one-time')
    })

    it('formats interval schedule', () => {
      const config: ScheduleConfig = {
        mode: 'interval',
        interval: { value: 30, unit: 'seconds' },
      }
      expect(formatScheduleTag(config)).toBe('#schedule:interval,30s')
    })

    it('formats loop schedule', () => {
      const config: ScheduleConfig = {
        mode: 'loop',
        delay: { value: 1, unit: 'hours' },
      }
      expect(formatScheduleTag(config)).toBe('#schedule:loop,delay:1h')
    })
  })

  describe('validateScheduleConfig', () => {
    it('validates one-time config without delay', () => {
      const result = validateScheduleConfig({ mode: 'one-time' })
      expect(result.valid).toBe(true)
    })

    it('validates one-time config with positive delay', () => {
      const result = validateScheduleConfig({
        mode: 'one-time',
        delay: { value: 10, unit: 'seconds' },
      })
      expect(result.valid).toBe(true)
    })

    it('rejects zero delay value', () => {
      const result = validateScheduleConfig({
        mode: 'one-time',
        delay: { value: 0, unit: 'seconds' },
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('positive')
    })

    it('rejects negative delay value', () => {
      const result = validateScheduleConfig({
        mode: 'one-time',
        delay: { value: -5, unit: 'minutes' },
      })
      expect(result.valid).toBe(false)
    })

    it('validates interval config', () => {
      const result = validateScheduleConfig({
        mode: 'interval',
        interval: { value: 60, unit: 'seconds' },
      })
      expect(result.valid).toBe(true)
    })

    it('rejects interval config without interval value', () => {
      const result = validateScheduleConfig({ mode: 'interval' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('interval')
    })

    it('validates loop config', () => {
      const result = validateScheduleConfig({
        mode: 'loop',
        delay: { value: 5, unit: 'minutes' },
      })
      expect(result.valid).toBe(true)
    })

    it('rejects loop config without delay', () => {
      const result = validateScheduleConfig({ mode: 'loop' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('delay')
    })
  })

  describe('ScheduleState type', () => {
    it('allows valid schedule states', () => {
      const states: ScheduleState[] = ['pending', 'running', 'paused', 'completed', 'cancelled']
      expect(states).toHaveLength(5)
    })
  })
})

import { describe, expect, it } from 'vitest'
import { formatRelativeTime, formatTimestamp, formatTimeOfDay } from './formatTimestamp'

describe('formatRelativeTime', () => {
  it('returns "just now" for recent timestamps', () => {
    const ts = Date.now() - 10000
    expect(formatRelativeTime(ts)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const ts = Date.now() - 5 * 60 * 1000
    const result = formatRelativeTime(ts)
    expect(result).toMatch(/^\d+m ago$/)
  })

  it('returns hours ago', () => {
    const ts = Date.now() - 3 * 60 * 60 * 1000
    const result = formatRelativeTime(ts)
    expect(result).toMatch(/^\d+h ago$/)
  })

  it('returns days ago for timestamps less than 7 days', () => {
    const ts = Date.now() - 3 * 24 * 60 * 60 * 1000
    const result = formatRelativeTime(ts)
    expect(result).toMatch(/^\d+d ago$/)
  })

  it('returns localized date string for timestamps 7+ days ago', () => {
    const ts = Date.now() - 14 * 24 * 60 * 60 * 1000
    const result = formatRelativeTime(ts)
    expect(result).not.toContain('ago')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatTimestamp', () => {
  it('returns a localized date string', () => {
    const ts = new Date('2025-03-15T10:00:00Z').getTime()
    const result = formatTimestamp(ts)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatTimeOfDay', () => {
  it('formats timestamp as HH:MM:SS', () => {
    const ts = new Date('2025-01-01T14:30:05Z').getTime()
    const result = formatTimeOfDay(ts)
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

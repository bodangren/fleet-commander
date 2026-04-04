import { describe, expect, it } from 'vitest'
import { getSliceConfig } from './dataAdapter'

describe('dataAdapter', () => {
  it('returns a valid slice config with all required slices', () => {
    const config = getSliceConfig()
    expect(config).toHaveProperty('projects')
    expect(config).toHaveProperty('agents')
    expect(config).toHaveProperty('harnesses')
    expect(config).toHaveProperty('tasks')
    expect(config).toHaveProperty('issues')
    expect(config).toHaveProperty('logs')
    expect(config).toHaveProperty('settings')
  })

  it('returns valid source values', () => {
    const config = getSliceConfig()
    const validSources = ['bun', 'convex']
    for (const slice of Object.values(config)) {
      expect(validSources).toContain(slice)
    }
  })

  it('defaults all slices to same source when no per-slice override', () => {
    const config = getSliceConfig()
    // All slices should be either 'bun' or 'convex' based on VITE_CONVEX_URL presence
    const sources = new Set(Object.values(config))
    // With no per-slice overrides, all should use the same default
    expect(sources.size).toBeLessThanOrEqual(1)
  })
})

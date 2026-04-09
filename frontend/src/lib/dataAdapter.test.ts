import { describe, expect, it } from 'vitest'
import { getSliceConfigFromEnv } from './dataAdapter'

describe('dataAdapter', () => {
  it('defaults all slices to bun when convex url is absent', () => {
    const config = getSliceConfigFromEnv({})
    expect(config).toEqual({
      projects: 'bun',
      agents: 'bun',
      harnesses: 'bun',
      tasks: 'bun',
      issues: 'bun',
      logs: 'bun',
      settings: 'bun',
    })
  })

  it('defaults all slices to convex when convex url is present', () => {
    const config = getSliceConfigFromEnv({ VITE_CONVEX_URL: 'https://demo.convex.cloud' })
    expect(config).toEqual({
      projects: 'convex',
      agents: 'convex',
      harnesses: 'convex',
      tasks: 'convex',
      issues: 'convex',
      logs: 'convex',
      settings: 'convex',
    })
  })

  it('applies per-slice overrides over the default source', () => {
    const config = getSliceConfigFromEnv({
      VITE_CONVEX_URL: 'https://demo.convex.cloud',
      VITE_SOURCE_PROJECTS: 'bun',
      VITE_SOURCE_LOGS: 'bun',
      VITE_SOURCE_SETTINGS: 'convex',
    })
    expect(config.projects).toBe('bun')
    expect(config.logs).toBe('bun')
    expect(config.settings).toBe('convex')
    expect(config.agents).toBe('convex')
  })

  it('ignores invalid slice source values and falls back to default', () => {
    const config = getSliceConfigFromEnv({
      VITE_SOURCE_PROJECTS: 'invalid-value',
    })
    expect(config.projects).toBe('bun')
  })
})

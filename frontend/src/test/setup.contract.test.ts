import { describe, expect, it, vi } from 'vitest'
import { convexClient, isConvexAvailable } from '@/lib/convex'
import { getSliceConfig } from '@/lib/dataAdapter'
import { ConvexClient } from 'convex/browser'

describe('unit-test network isolation', () => {
  it('keeps the shared Convex client disabled even when a local deployment is configured', () => {
    expect(convexClient).toBeNull()
    expect(isConvexAvailable()).toBe(false)
  })

  it('forces every data slice to the Bun API so hooks cannot open Convex subscriptions', () => {
    expect(getSliceConfig()).toEqual({
      projects: 'bun',
      agents: 'bun',
      harnesses: 'bun',
      tasks: 'bun',
      issues: 'bun',
      logs: 'bun',
      settings: 'bun',
    })
  })

  it('replaces lazy Convex browser clients so an accidental route subscription stays offline', () => {
    expect(vi.isMockFunction(ConvexClient)).toBe(true)
  })

  it('installs an offline raw WebSocket boundary that survives global unstubbing', () => {
    expect(
      (globalThis.WebSocket as typeof WebSocket & { __fleetUnitTestOffline?: boolean })
        .__fleetUnitTestOffline,
    ).toBe(true)
  })
})

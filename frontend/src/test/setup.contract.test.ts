import { describe, expect, it } from 'vitest'
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

  it('replaces lazy Convex browser clients with an offline constructable client', () => {
    const client = new ConvexClient('https://unit-test.convex.cloud') as unknown as {
      onUpdate: (...args: unknown[]) => () => void
      close: () => void
    }

    expect(client.onUpdate('executionLogs:listRecentLogs', {}, () => {})).toBeTypeOf('function')
    expect(() => client.close()).not.toThrow()
  })

  it('installs an offline raw WebSocket boundary that survives global unstubbing', () => {
    expect(
      (globalThis.WebSocket as typeof WebSocket & { __fleetUnitTestOffline?: boolean })
        .__fleetUnitTestOffline,
    ).toBe(true)
  })
})

/**
 * Convex handler tests for provider health monitoring (Phase 2 of the
 * Provider Health Monitor & Resilience track).
 *
 * These tests assert the contract for `updateProviderHealth` (mutation),
 * `getProviderHealth` (query), and `getProviderHistory` (query). The history
 * query is bounded with `.take(N)`; these tests verify that N=0, N > total,
 * and ordering invariants all hold.
 *
 * A local `createMockCtx` is defined here to support the `providerHealthHistory`
 * table, which is not yet wired into the shared `__fixtures__/foundation.ts`
 * mock. Following the pattern from `convex/abTests.test.ts` to avoid coupling
 * to fixture internals.
 *
 * Spec: measure/tracks/provider_health_resilience_20260605/spec.md
 * Test strategy: measure/tracks/provider_health_resilience_20260605/test-strategy.md
 */
import { describe, expect, it } from 'bun:test'
import { updateProviderHealth, getProviderHealth, getProviderHistory } from './providers'

type MockDoc = { _id: string } & Record<string, unknown>

function createMockCtx() {
  const tables: Record<string, Map<string, MockDoc>> = {}

  function getTable(name: string): Map<string, MockDoc> {
    if (!tables[name]) tables[name] = new Map()
    return tables[name]
  }

  const db = {
    query: (table: string) => {
      const baseDocs = () => Array.from(getTable(table).values())

      const wrap = (docs: MockDoc[]) => ({
        collect: async () => docs,
        first: async () => docs[0] ?? null,
        unique: async () => docs[0] ?? null,
        take: async (n: number) => docs.slice(0, n),
        order: (dir: 'asc' | 'desc') => ({
          collect: async () => {
            const arr = [...docs]
            if (dir === 'desc') arr.reverse()
            return arr
          },
          take: async (n: number) => {
            const arr = [...docs]
            if (dir === 'desc') arr.reverse()
            return arr.slice(0, n)
          },
        }),
      })

      return {
        ...wrap(baseDocs()),
        withIndex: (_index: string, cb?: (q: any) => any) => {
          const filters: Array<{ field: string; value: unknown }> = []
          const q = {
            eq: (field: string, value: unknown) => {
              filters.push({ field, value })
              return q
            },
          }
          if (cb) cb(q)
          const filtered = baseDocs().filter(doc => filters.every(f => doc[f.field] === f.value))
          return wrap(filtered)
        },
      }
    },
    get: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) return map.get(id) ?? null
      }
      return null
    },
    insert: async (table: string, doc: MockDoc) => {
      const map = getTable(table)
      const id = `${table}-${map.size + 1}`
      map.set(id, { _id: id, ...doc })
      return id
    },
    patch: async (id: string, patch: Record<string, unknown>) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) {
          const existing = map.get(id)!
          map.set(id, { ...existing, ...patch })
          return
        }
      }
    },
    delete: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) map.delete(id)
      }
    },
  }

  return { db } as any
}

const baseProvider = {
  name: 'openai',
  models: ['gpt-4o', 'gpt-4o-mini'],
  status: 'active' as const,
  latency: 120,
  createdAt: 1000,
  failureCount: 0,
  avgLatencyMs: 0,
  lastCheckedAt: 0,
  lastSuccessAt: 0,
}

describe('updateProviderHealth', () => {
  it('is exported', () => {
    expect(updateProviderHealth).toBeDefined()
  })

  it('records a successful probe with low latency as healthy', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 250,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('healthy')
    expect(updated!.status).toBe('active')
    expect(updated!.failureCount).toBe(0)
    expect((updated!.lastSuccessAt as number) > 0).toBe(true)
  })

  it('updates avgLatencyMs via exponential moving average on success', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      avgLatencyMs: 1000,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 2000,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    // EMA with alpha=0.3: prev * 0.7 + new * 0.3 = 700 + 600 = 1300
    expect(updated!.avgLatencyMs).toBeCloseTo(1300, 5)
  })

  it('does not change avgLatencyMs on a failed probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      avgLatencyMs: 1500,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 9999,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.avgLatencyMs).toBe(1500)
  })

  it('increments failureCount on a failed probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 1,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
      errorMessage: 'timeout',
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.failureCount).toBe(2)
  })

  it('resets failureCount to 0 on a successful probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 2,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.failureCount).toBe(0)
  })

  it('updates lastCheckedAt to current time on every probe', async () => {
    const ctx = createMockCtx()
    const before = Date.now()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      lastCheckedAt: 0,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 100,
      success: true,
    })
    const after = Date.now()

    const updated = await ctx.db.get(providerId)
    const checkedAt = updated!.lastCheckedAt as number
    expect(checkedAt).toBeGreaterThanOrEqual(before)
    expect(checkedAt).toBeLessThanOrEqual(after)
  })

  it('transitions to unhealthy when failureCount >= 3 and lastSuccessAt is older than 5 minutes', async () => {
    const ctx = createMockCtx()
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 2,
      lastSuccessAt: tenMinutesAgo,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('unhealthy')
    expect(updated!.status).toBe('active')
    expect(updated!.failureCount).toBe(3)
  })

  it('does not transition to unhealthy when failureCount >= 3 but lastSuccessAt is recent', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 5,
      lastSuccessAt: Date.now() - 1000,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    // Failure increments, but recent lastSuccessAt prevents unhealthy transition
    expect(updated!.healthStatus).not.toBe('unhealthy')
  })

  it('transitions to degraded when avgLatencyMs > 10_000', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      avgLatencyMs: 12000,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 15000,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('degraded')
    expect(updated!.status).toBe('active')
  })

  it('persists errorMessage on a failed probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    // The patch call does not include errorMessage (mutation only patches
    // health fields), but the history row should retain it.
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
      errorMessage: 'connection refused',
    })

    const history = await ctx.db.query('providerHealthHistory').collect()
    expect(history[0].errorMessage).toBe('connection refused')
  })

  it('inserts a providerHealthHistory row on every probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 250,
      success: true,
    })

    const history = await ctx.db.query('providerHealthHistory').collect()
    expect(history.length).toBe(1)
    expect(history[0].providerId).toBe(providerId)
    expect(history[0].providerName).toBe('openai')
    expect(history[0].latencyMs).toBe(250)
    expect(history[0].success).toBe(true)
    expect((history[0].checkedAt as number) > 0).toBe(true)
  })

  it('inserts one history row per probe call', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 100,
      success: true,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 300,
      success: false,
    })

    const history = await ctx.db.query('providerHealthHistory').collect()
    expect(history.length).toBe(3)
  })

  it('returns null when the provider does not exist', async () => {
    const ctx = createMockCtx()
    const result = await updateProviderHealth(ctx, {
      providerId: 'providers-missing',
      latencyMs: 100,
      success: true,
    })
    expect(result).toBeNull()
  })
})

describe('getProviderHealth', () => {
  it('is exported', () => {
    expect(getProviderHealth).toBeDefined()
  })

  it('returns all providers', async () => {
    const ctx = createMockCtx()
    await ctx.db.insert('providers', { ...baseProvider, name: 'openai' })
    await ctx.db.insert('providers', { ...baseProvider, name: 'anthropic' })
    await ctx.db.insert('providers', { ...baseProvider, name: 'google' })

    const result = await getProviderHealth(ctx)
    expect(result.length).toBe(3)
  })

  it('returns empty array when no providers exist', async () => {
    const ctx = createMockCtx()
    const result = await getProviderHealth(ctx)
    expect(result).toEqual([])
  })

  it('strips _creationTime from results', async () => {
    const ctx = createMockCtx()
    await ctx.db.insert('providers', { ...baseProvider })
    const result = await getProviderHealth(ctx)
    expect(result[0]._creationTime).toBeUndefined()
    expect(result[0]._id).toBeDefined()
  })

  it('includes health fields populated by updateProviderHealth', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const result = await getProviderHealth(ctx)
    expect(result.length).toBe(1)
    expect(result[0].healthStatus).toBe('healthy')
    expect(result[0].status).toBe('active')
    expect(result[0].lastCheckedAt).toBeGreaterThan(0)
  })
})

describe('getProviderHistory', () => {
  it('is exported', () => {
    expect(getProviderHistory).toBeDefined()
  })

  it('returns empty array when no history exists for the provider', async () => {
    const ctx = createMockCtx()
    const result = await getProviderHistory(ctx, {
      providerId: 'providers-1',
    })
    expect(result).toEqual([])
  })

  it('returns history rows for the specified provider', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 100,
      success: true,
    })

    const result = await getProviderHistory(ctx, { providerId })
    expect(result.length).toBe(1)
    expect(result[0].providerId).toBe(providerId)
  })

  it('respects the .take(N) limit and returns at most N rows', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    for (let i = 0; i < 5; i++) {
      await updateProviderHealth(ctx, {
        providerId,
        latencyMs: 100 + i,
        success: true,
      })
    }

    const result = await getProviderHistory(ctx, { providerId, limit: 3 })
    expect(result.length).toBe(3)
  })

  it('returns N=0 rows when limit is 0 (must not throw)', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 100,
      success: true,
    })

    const result = await getProviderHistory(ctx, { providerId, limit: 0 })
    expect(result).toEqual([])
  })

  it('orders results by most recent first', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 100,
      success: true,
    })
    // Ensure a strictly later timestamp for the second probe
    await new Promise(resolve => setTimeout(resolve, 5))
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })
    await new Promise(resolve => setTimeout(resolve, 5))
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 300,
      success: true,
    })

    const result = await getProviderHistory(ctx, { providerId })
    expect(result[0].latencyMs).toBe(300)
    expect(result[1].latencyMs).toBe(200)
    expect(result[2].latencyMs).toBe(100)
  })

  it('returns all rows up to the default limit when no limit is specified', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    for (let i = 0; i < 3; i++) {
      await updateProviderHealth(ctx, {
        providerId,
        latencyMs: 100 + i,
        success: true,
      })
    }

    const result = await getProviderHistory(ctx, { providerId })
    // Default limit is 20; we only have 3 rows
    expect(result.length).toBe(3)
  })

  it('caps at default limit of 20 when N > total but default applies', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    for (let i = 0; i < 25; i++) {
      await updateProviderHealth(ctx, {
        providerId,
        latencyMs: 100 + i,
        success: true,
      })
    }

    const result = await getProviderHistory(ctx, { providerId })
    expect(result.length).toBe(20)
  })

  it('does not return history for other providers', async () => {
    const ctx = createMockCtx()
    const providerA = await ctx.db.insert('providers', {
      ...baseProvider,
      name: 'a',
    })
    const providerB = await ctx.db.insert('providers', {
      ...baseProvider,
      name: 'b',
    })
    await updateProviderHealth(ctx, {
      providerId: providerA,
      latencyMs: 100,
      success: true,
    })

    const result = await getProviderHistory(ctx, { providerId: providerB })
    expect(result).toEqual([])
  })

  it('strips _creationTime from history results', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 100,
      success: true,
    })

    const result = await getProviderHistory(ctx, { providerId })
    expect(result[0]._creationTime).toBeUndefined()
    expect(result[0]._id).toBeDefined()
  })

  it('includes success and status fields on history rows', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
      errorMessage: 'timeout',
    })

    const result = await getProviderHistory(ctx, { providerId })
    expect(result[0].success).toBe(false)
    expect(result[0].status).toBeDefined()
    expect(result[0].providerName).toBe('openai')
  })
})

// ---------------------------------------------------------------------------
// Phase 7 Red-phase regression pins (TD-235 status vocabulary split)
//
// Pins the new contract introduced by `71a7f8b`:
//   - `updateProviderHealth` writes the health value to `healthStatus` (not
//     the operational `status`).
//   - The operational `status` field is preserved across probes.
//   - `getProviderHealth` returns BOTH `status` and `healthStatus` as
//     separate fields.
//
// These tests will fail if a future change regresses to the old vocabulary
// (writing health values into `status`).
// ---------------------------------------------------------------------------

describe('Phase 7 TD-235 vocabulary split: healthStatus vs status', () => {
  it('writes the healthy value to healthStatus, not status', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('healthy')
    expect(updated!.status).toBe('active')
  })

  it('preserves the operational status across a successful probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'rate_limited',
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.status).toBe('rate_limited')
    expect(updated!.healthStatus).toBe('healthy')
  })

  it('writes the unhealthy value to healthStatus, not status', async () => {
    const ctx = createMockCtx()
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      failureCount: 2,
      lastSuccessAt: tenMinutesAgo,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 5000,
      success: false,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('unhealthy')
    expect(updated!.status).toBe('active')
  })

  it('writes the degraded value to healthStatus, not status', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      avgLatencyMs: 12000,
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 15000,
      success: true,
    })

    const updated = await ctx.db.get(providerId)
    expect(updated!.healthStatus).toBe('degraded')
    expect(updated!.status).toBe('active')
  })

  it('getProviderHealth returns healthStatus populated by a successful probe', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', { ...baseProvider })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const result = await getProviderHealth(ctx)
    expect(result.length).toBe(1)
    expect(result[0].healthStatus).toBe('healthy')
    expect(result[0].status).toBe('active')
  })

  it('getProviderHealth keeps operational status and healthStatus on separate fields', async () => {
    const ctx = createMockCtx()
    const providerId = await ctx.db.insert('providers', {
      ...baseProvider,
      status: 'idle',
    })
    await updateProviderHealth(ctx, {
      providerId,
      latencyMs: 200,
      success: true,
    })

    const result = await getProviderHealth(ctx)
    expect(result[0].status).toBe('idle')
    expect(result[0].healthStatus).toBe('healthy')
  })
})
